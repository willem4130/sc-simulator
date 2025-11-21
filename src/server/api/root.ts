import { createTRPCRouter } from '@/server/api/trpc'
import { projectsRouter } from '@/server/api/routers/projects'
import { contractsRouter } from '@/server/api/routers/contracts'
import { automationRouter } from '@/server/api/routers/automation'
import { dashboardRouter } from '@/server/api/routers/dashboard'
import { syncRouter } from '@/server/api/routers/sync'

/**
 * This is the primary router for your server.
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  projects: projectsRouter,
  contracts: contractsRouter,
  automation: automationRouter,
  dashboard: dashboardRouter,
  sync: syncRouter,
})

// Export type definition of API
export type AppRouter = typeof appRouter
