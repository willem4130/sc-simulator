/**
 * Effect Curve router - Non-linear transformation curves
 */
import { z } from 'zod'
import { createTRPCRouter, organizationProcedure } from '@/server/api/trpc'
import { CurveType, type Prisma } from '@prisma/client'

export const effectCurveRouter = createTRPCRouter({
  /**
   * List all effect curves for an organization
   */
  list: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.effectCurve.findMany({
        where: { organizationId: input.organizationId },
        orderBy: { createdAt: 'desc' },
      })
    }),

  /**
   * Get effect curve by ID
   */
  getById: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.effectCurve.findFirst({
        where: {
          id: input.id,
          organizationId: input.organizationId,
        },
      })
    }),

  /**
   * Create new effect curve
   */
  create: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        name: z.string().min(1),
        curveType: z.nativeEnum(CurveType),
        parameters: z.record(z.string(), z.unknown()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.effectCurve.create({
        data: {
          name: input.name,
          curveType: input.curveType,
          parameters: input.parameters as Prisma.InputJsonValue,
          organizationId: input.organizationId,
        },
      })
    }),

  /**
   * Update effect curve
   */
  update: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        id: z.string(),
        name: z.string().min(1).optional(),
        curveType: z.nativeEnum(CurveType).optional(),
        parameters: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.effectCurve.update({
        where: { id: input.id },
        data: {
          name: input.name,
          curveType: input.curveType,
          parameters: input.parameters ? (input.parameters as Prisma.InputJsonValue) : undefined,
        },
      })
    }),

  /**
   * Delete effect curve
   */
  delete: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if curve is used by any variables
      const variables = await ctx.db.variable.findMany({
        where: {
          organizationId: input.organizationId,
          effectCurveId: input.id,
        },
      })

      if (variables.length > 0) {
        throw new Error(`Cannot delete curve: used by ${variables.length} variables`)
      }

      return ctx.db.effectCurve.delete({
        where: { id: input.id },
      })
    }),
})
