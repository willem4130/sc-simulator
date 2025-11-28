import { createTRPCRouter } from '@/server/api/trpc'
import { projectsRouter } from '@/server/api/routers/projects'
import { contractsRouter } from '@/server/api/routers/contracts'
import { automationRouter } from '@/server/api/routers/automation'
import { dashboardRouter } from '@/server/api/routers/dashboard'
import { syncRouter } from '@/server/api/routers/sync'
import { workflowsRouter } from '@/server/api/routers/workflows'
import { settingsRouter } from '@/server/api/routers/settings'
import { usersRouter } from '@/server/api/routers/users'
import { hoursRouter } from '@/server/api/routers/hours'
import { invoicesRouter } from '@/server/api/routers/invoices'
import { filterPresetsRouter } from '@/server/api/routers/filterPresets'
import { ratesRouter } from '@/server/api/routers/rates'
import { emailTemplatesRouter } from '@/server/api/routers/emailTemplates'
import { projectEmailsRouter } from '@/server/api/routers/projectEmails'
import { hoursReportRouter } from '@/server/api/routers/hoursReport'
import { financialsRouter } from '@/server/api/routers/financials'

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
  workflows: workflowsRouter,
  settings: settingsRouter,
  users: usersRouter,
  hours: hoursRouter,
  invoices: invoicesRouter,
  filterPresets: filterPresetsRouter,
  rates: ratesRouter,
  emailTemplates: emailTemplatesRouter,
  projectEmails: projectEmailsRouter,
  hoursReport: hoursReportRouter,
  financials: financialsRouter,
})

// Export type definition of API
export type AppRouter = typeof appRouter
