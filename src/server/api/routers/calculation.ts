/**
 * Calculation router - Calculation engine interface
 * Phase 2: Will implement formula parsing, dependency resolution, and calculation execution
 */
import { z } from 'zod'
import { createTRPCRouter, organizationProcedure } from '@/server/api/trpc'

export const calculationRouter = createTRPCRouter({
  /**
   * Get latest calculation for a scenario
   */
  getLatest: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        scenarioId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.calculation.findFirst({
        where: { scenarioId: input.scenarioId },
        orderBy: { version: 'desc' },
      })
    }),

  /**
   * Trigger recalculation for a scenario
   * TODO Phase 2: Implement calculation engine
   */
  recalculate: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        scenarioId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Placeholder: Will implement calculation engine in Phase 2
      const latestCalc = await ctx.db.calculation.findFirst({
        where: { scenarioId: input.scenarioId },
        orderBy: { version: 'desc' },
      })

      return ctx.db.calculation.create({
        data: {
          scenarioId: input.scenarioId,
          version: (latestCalc?.version || 0) + 1,
          results: {
            status: 'pending',
            message: 'Calculation engine not yet implemented (Phase 2)',
          },
          hasErrors: false,
        },
      })
    }),
})
