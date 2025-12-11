/**
 * Variable router - Variable definitions and values
 */
import { z } from 'zod'
import { createTRPCRouter, organizationProcedure, publicProcedure } from '@/server/api/trpc'
import { VariableType } from '@prisma/client'

export const variableRouter = createTRPCRouter({
  /**
   * List all variables for an organization
   * TODO: Change back to organizationProcedure once authentication is implemented
   */
  list: publicProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.variable.findMany({
        where: { organizationId: input.organizationId },
        orderBy: [{ variableType: 'asc' }, { createdAt: 'desc' }],
      })
    }),

  /**
   * Get variable by ID
   */
  getById: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.variable.findFirst({
        where: {
          id: input.id,
          organizationId: input.organizationId,
        },
      })
    }),

  /**
   * Create new variable
   */
  create: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        name: z.string().min(1),
        displayName: z.string().min(1),
        variableType: z.enum(['INPUT', 'OUTPUT']),
        unit: z.string().optional(),
        formula: z.string().optional(),
        dependencies: z.array(z.string()).default([]),
        effectCurveId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate formula for OUTPUT variables
      if (input.variableType === 'OUTPUT' && !input.formula) {
        throw new Error('OUTPUT variables must have a formula')
      }

      // Validate INPUT variables don't have formulas
      if (input.variableType === 'INPUT' && input.formula) {
        throw new Error('INPUT variables cannot have formulas')
      }

      return ctx.db.variable.create({
        data: {
          name: input.name,
          displayName: input.displayName,
          variableType: input.variableType as VariableType,
          unit: input.unit,
          formula: input.formula,
          dependencies: input.dependencies,
          effectCurveId: input.effectCurveId,
          organizationId: input.organizationId,
        },
      })
    }),

  /**
   * Update variable
   */
  update: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        id: z.string(),
        displayName: z.string().min(1).optional(),
        unit: z.string().optional(),
        formula: z.string().optional(),
        dependencies: z.array(z.string()).optional(),
        effectCurveId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.variable.update({
        where: { id: input.id },
        data: {
          displayName: input.displayName,
          unit: input.unit,
          formula: input.formula,
          dependencies: input.dependencies,
          effectCurveId: input.effectCurveId,
        },
      })
    }),

  /**
   * Delete variable
   */
  delete: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if variable is used in other formulas
      const dependentVariables = await ctx.db.variable.findMany({
        where: {
          organizationId: input.organizationId,
          dependencies: {
            hasSome: [input.id],
          },
        },
      })

      if (dependentVariables.length > 0) {
        throw new Error(
          `Cannot delete variable: used in ${dependentVariables.length} other formulas`
        )
      }

      return ctx.db.variable.delete({
        where: { id: input.id },
      })
    }),

  /**
   * Set variable value for a scenario
   * TODO: Change back to organizationProcedure once authentication is implemented
   */
  setValue: publicProcedure
    .input(
      z.object({
        organizationId: z.string(),
        scenarioId: z.string(),
        variableId: z.string(),
        value: z.number(),
        periodStart: z.date().optional(),
        periodEnd: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify variable is INPUT type
      const variable = await ctx.db.variable.findFirst({
        where: {
          id: input.variableId,
          organizationId: input.organizationId,
          variableType: 'INPUT',
        },
      })

      if (!variable) {
        throw new Error('Variable not found or not an INPUT variable')
      }

      // Find existing value (using findFirst since upsert has type issues with nullable unique fields)
      const existing = await ctx.db.variableValue.findFirst({
        where: {
          scenarioId: input.scenarioId,
          variableId: input.variableId,
          periodStart: input.periodStart ?? null,
        },
      })

      if (existing) {
        // Update existing value
        return ctx.db.variableValue.update({
          where: { id: existing.id },
          data: {
            value: input.value,
            periodEnd: input.periodEnd ?? null,
            modifiedAt: new Date(),
          },
        })
      } else {
        // Create new value
        return ctx.db.variableValue.create({
          data: {
            scenarioId: input.scenarioId,
            variableId: input.variableId,
            value: input.value,
            periodStart: input.periodStart ?? null,
            periodEnd: input.periodEnd ?? null,
          },
        })
      }
    }),

  /**
   * Get variable values for a scenario
   * TODO: Change back to organizationProcedure once authentication is implemented
   */
  getValues: publicProcedure
    .input(
      z.object({
        organizationId: z.string(),
        scenarioId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.variableValue.findMany({
        where: { scenarioId: input.scenarioId },
        include: {
          variable: true,
        },
      })
    }),
})
