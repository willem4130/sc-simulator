/**
 * This is the primary router for your server.
 * All routers added in /api/routers should be manually added here.
 */
import { createTRPCRouter } from '@/server/api/trpc'
import { organizationRouter } from '@/server/api/routers/organization'
import { scenarioRouter } from '@/server/api/routers/scenario'
import { variableRouter } from '@/server/api/routers/variable'
import { parameterRouter } from '@/server/api/routers/parameter'
import { effectCurveRouter } from '@/server/api/routers/effectCurve'
import { calculationRouter } from '@/server/api/routers/calculation'
import { comparisonRouter } from '@/server/api/routers/comparison'
import { exportRouter } from '@/server/api/routers/export'

export const appRouter = createTRPCRouter({
  organization: organizationRouter,
  scenario: scenarioRouter,
  variable: variableRouter,
  parameter: parameterRouter,
  effectCurve: effectCurveRouter,
  calculation: calculationRouter,
  comparison: comparisonRouter,
  export: exportRouter,
})

// Export type definition of API
export type AppRouter = typeof appRouter
