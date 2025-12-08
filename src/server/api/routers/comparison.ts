/**
 * Comparison router - Scenario comparison and analysis
 * Phase 5: Will implement side-by-side comparison, delta tracking, and visualizations
 */
import { z } from 'zod'
import { createTRPCRouter, organizationProcedure } from '@/server/api/trpc'

export const comparisonRouter = createTRPCRouter({
  /**
   * Compare multiple scenarios
   * TODO Phase 5: Implement delta calculation and comparison table
   */
  compare: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        scenarioIds: z.array(z.string()).min(2).max(5),
      })
    )
    .query(async ({ ctx, input }) => {
      // Fetch scenarios with latest calculations
      const scenarios = await ctx.db.scenario.findMany({
        where: {
          organizationId: input.organizationId,
          id: { in: input.scenarioIds },
        },
        include: {
          calculations: {
            orderBy: { version: 'desc' },
            take: 1,
          },
          variableValues: {
            include: {
              variable: true,
            },
          },
        },
      })

      // Placeholder: Will implement delta calculation in Phase 5
      return {
        scenarios,
        deltas: [],
        metadata: {
          status: 'pending',
          message: 'Comparison engine not yet implemented (Phase 5)',
        },
      }
    }),
})
