/**
 * Parameter router - Global parameter management
 */
import { z } from 'zod'
import { createTRPCRouter, organizationProcedure } from '@/server/api/trpc'

export const parameterRouter = createTRPCRouter({
  /**
   * List all parameters for an organization
   */
  list: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.parameter.findMany({
        where: { organizationId: input.organizationId },
        orderBy: { createdAt: 'desc' },
      })
    }),

  /**
   * Get parameter by ID
   */
  getById: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.parameter.findFirst({
        where: {
          id: input.id,
          organizationId: input.organizationId,
        },
      })
    }),

  /**
   * Create new parameter
   */
  create: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        name: z.string().min(1),
        displayName: z.string().min(1),
        value: z.number(),
        unit: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.parameter.create({
        data: {
          name: input.name,
          displayName: input.displayName,
          value: input.value,
          unit: input.unit,
          description: input.description,
          organizationId: input.organizationId,
        },
      })
    }),

  /**
   * Update parameter
   */
  update: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        id: z.string(),
        displayName: z.string().min(1).optional(),
        value: z.number().optional(),
        unit: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.parameter.update({
        where: { id: input.id },
        data: {
          displayName: input.displayName,
          value: input.value,
          unit: input.unit,
          description: input.description,
        },
      })
    }),

  /**
   * Delete parameter
   */
  delete: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.parameter.delete({
        where: { id: input.id },
      })
    }),
})
