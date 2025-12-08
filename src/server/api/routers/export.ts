/**
 * Export router - Excel export functionality
 * Phase 6: Will implement ExcelJS integration for full comparison export
 */
import { z } from 'zod'
import { createTRPCRouter, organizationProcedure } from '@/server/api/trpc'

export const exportRouter = createTRPCRouter({
  /**
   * Export scenario to Excel
   * TODO Phase 6: Implement ExcelJS export
   */
  toExcel: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        scenarioIds: z.array(z.string()).min(1).max(5),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Fetch scenarios
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

      // Placeholder: Will implement ExcelJS export in Phase 6
      return {
        status: 'pending',
        message: 'Excel export not yet implemented (Phase 6)',
        scenarioCount: scenarios.length,
      }
    }),
})
