/**
 * Scenario router - What-if scenario management
 */
import { z } from 'zod'
import { createTRPCRouter, organizationProcedure } from '@/server/api/trpc'

export const scenarioRouter = createTRPCRouter({
  /**
   * List all scenarios for an organization
   */
  list: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.scenario.findMany({
        where: { organizationId: input.organizationId },
        include: {
          _count: {
            select: {
              variableValues: true,
              calculations: true,
            },
          },
        },
        orderBy: [{ isBaseline: 'desc' }, { createdAt: 'desc' }],
      })
    }),

  /**
   * Get scenario by ID with all data
   */
  getById: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.scenario.findFirst({
        where: {
          id: input.id,
          organizationId: input.organizationId,
        },
        include: {
          variableValues: {
            include: {
              variable: true,
            },
          },
          calculations: {
            orderBy: { version: 'desc' },
            take: 1,
          },
        },
      })
    }),

  /**
   * Create new scenario
   */
  create: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        name: z.string().min(1),
        description: z.string().optional(),
        isBaseline: z.boolean().default(false),
        timePeriodType: z.enum(['SINGLE_POINT', 'MONTHLY', 'QUARTERLY', 'YEARLY']).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // If setting as baseline, unset other baselines
      if (input.isBaseline) {
        await ctx.db.scenario.updateMany({
          where: {
            organizationId: input.organizationId,
            isBaseline: true,
          },
          data: { isBaseline: false },
        })
      }

      return ctx.db.scenario.create({
        data: {
          name: input.name,
          description: input.description,
          isBaseline: input.isBaseline,
          timePeriodType: input.timePeriodType || 'SINGLE_POINT',
          startDate: input.startDate,
          endDate: input.endDate,
          organizationId: input.organizationId,
        },
      })
    }),

  /**
   * Update scenario
   */
  update: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        isBaseline: z.boolean().optional(),
        timePeriodType: z.enum(['SINGLE_POINT', 'MONTHLY', 'QUARTERLY', 'YEARLY']).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // If setting as baseline, unset other baselines
      if (input.isBaseline) {
        await ctx.db.scenario.updateMany({
          where: {
            organizationId: input.organizationId,
            isBaseline: true,
            id: { not: input.id },
          },
          data: { isBaseline: false },
        })
      }

      return ctx.db.scenario.update({
        where: { id: input.id },
        data: {
          name: input.name,
          description: input.description,
          isBaseline: input.isBaseline,
          timePeriodType: input.timePeriodType,
          startDate: input.startDate,
          endDate: input.endDate,
        },
      })
    }),

  /**
   * Delete scenario
   */
  delete: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if baseline - prevent deletion
      const scenario = await ctx.db.scenario.findFirst({
        where: {
          id: input.id,
          organizationId: input.organizationId,
        },
      })

      if (scenario?.isBaseline) {
        throw new Error('Cannot delete baseline scenario')
      }

      return ctx.db.scenario.delete({
        where: { id: input.id },
      })
    }),

  /**
   * Clone scenario
   */
  clone: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        id: z.string(),
        name: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get source scenario with all variable values
      const source = await ctx.db.scenario.findFirst({
        where: {
          id: input.id,
          organizationId: input.organizationId,
        },
        include: {
          variableValues: true,
        },
      })

      if (!source) {
        throw new Error('Source scenario not found')
      }

      // Create new scenario
      const newScenario = await ctx.db.scenario.create({
        data: {
          name: input.name,
          description: `Cloned from: ${source.name}`,
          isBaseline: false,
          timePeriodType: source.timePeriodType,
          startDate: source.startDate,
          endDate: source.endDate,
          parentId: source.id,
          organizationId: input.organizationId,
        },
      })

      // Clone all variable values
      if (source.variableValues.length > 0) {
        await ctx.db.variableValue.createMany({
          data: source.variableValues.map((vv) => ({
            scenarioId: newScenario.id,
            variableId: vv.variableId,
            value: vv.value,
            periodStart: vv.periodStart,
            periodEnd: vv.periodEnd,
            isManual: vv.isManual,
            notes: vv.notes,
          })),
        })
      }

      return newScenario
    }),
})
