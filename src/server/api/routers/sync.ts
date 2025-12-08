import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '@/server/api/trpc'
import { getSimplicateClient } from '@/lib/simplicate/client'
import { batchResolveRates } from '@/lib/rates/resolver'

export const syncRouter = createTRPCRouter({
  // Sync projects from Simplicate to local database
  syncProjects: publicProcedure.mutation(async ({ ctx }) => {
    const client = getSimplicateClient()

    try {
      // Fetch all projects from Simplicate
      const simplicateProjects = await client.getProjects({ limit: 100 })

      const results = {
        created: 0,
        updated: 0,
        errors: [] as string[],
      }

      // Import each project
      for (const project of simplicateProjects) {
        try {
          const projectData = {
            simplicateId: project.id,
            name: project.name,
            projectNumber: project.project_number || null,
            description: project.description || null,
            status: mapProjectStatus(project.status),
            startDate: project.start_date ? new Date(project.start_date) : null,
            endDate: project.end_date ? new Date(project.end_date) : null,
            clientName: project.organization?.name || null,
            lastSyncedAt: new Date(),
          }

          // Upsert (create or update) project
          const existingProject = await ctx.db.project.findUnique({
            where: { simplicateId: project.id },
          })

          if (existingProject) {
            await ctx.db.project.update({
              where: { id: existingProject.id },
              data: projectData,
            })
            results.updated++
          } else {
            await ctx.db.project.create({
              data: projectData,
            })
            results.created++
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          results.errors.push(`Failed to sync project ${project.name}: ${errorMessage}`)
        }
      }

      return {
        success: true,
        totalProcessed: simplicateProjects.length,
        ...results,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to sync projects from Simplicate: ${errorMessage}`)
    }
  }),

  // Sync employees from Simplicate to local database as users
  syncEmployees: publicProcedure.mutation(async ({ ctx }) => {
    const client = getSimplicateClient()

    try {
      // Fetch all employees from Simplicate
      const simplicateEmployees = await client.getEmployees({ limit: 100 })

      // Fetch timetables to get the actual cost rates (rates are stored there, not on employee records)
      const timetables = await client.getTimetables({ limit: 100 })

      // Build a map of employee ID -> cost rate from timetables
      // Use the most recent active timetable for each employee
      const employeeRatesMap = new Map<string, { salesRate: number | null; costRate: number | null }>()
      for (const tt of timetables) {
        if (tt.employee?.id) {
          const salesRate = tt.hourly_sales_tariff ? parseFloat(tt.hourly_sales_tariff) : null
          const costRate = tt.hourly_cost_tariff ? parseFloat(tt.hourly_cost_tariff) : null
          // Only store if we have a valid cost rate (or update if better)
          const existing = employeeRatesMap.get(tt.employee.id)
          if (!existing || (costRate && costRate > 0)) {
            employeeRatesMap.set(tt.employee.id, {
              salesRate: salesRate && salesRate > 0 ? salesRate : null,
              costRate: costRate && costRate > 0 ? costRate : null
            })
          }
        }
      }

      console.log('[Sync] Timetable rates loaded:', employeeRatesMap.size, 'employees with rates')

      const results = {
        created: 0,
        updated: 0,
        errors: [] as string[],
      }

      // Import each employee as a user
      for (const employee of simplicateEmployees) {
        try {
          // Get email from work_email, or fallback to person.email
          const employeeEmail = employee.work_email || employee.person?.email || employee.email
          const employeeName = employee.name || employee.person?.full_name || 'Unknown'

          // Skip employees without email
          if (!employeeEmail) {
            results.errors.push(`Skipped employee ${employeeName}: No email address`)
            continue
          }

          // Get rates from timetable map (preferred) or fall back to employee record
          const timetableRates = employeeRatesMap.get(employee.id)
          const salesRate = timetableRates?.salesRate ??
            (employee.hourly_sales_tariff ? parseFloat(String(employee.hourly_sales_tariff)) : null)
          const costRate = timetableRates?.costRate ??
            (employee.hourly_cost_tariff ? parseFloat(String(employee.hourly_cost_tariff)) : null)

          const userData = {
            email: employeeEmail,
            name: employeeName,
            simplicateEmployeeId: employee.id,
            role: 'TEAM_MEMBER' as const,
            // Financial rate fields - prefer timetable, fall back to employee record
            defaultSalesRate: salesRate && salesRate > 0 ? salesRate : null,
            defaultCostRate: costRate && costRate > 0 ? costRate : null,
            simplicateEmployeeType: employee.type?.label || null,
            ratesSyncedAt: new Date(),
          }

          // Check if user exists by simplicateEmployeeId or email
          const existingBySimplicateId = await ctx.db.user.findUnique({
            where: { simplicateEmployeeId: employee.id },
          })

          const existingByEmail = await ctx.db.user.findUnique({
            where: { email: employeeEmail },
          })

          if (existingBySimplicateId) {
            // Update existing user by Simplicate ID
            await ctx.db.user.update({
              where: { id: existingBySimplicateId.id },
              data: {
                email: userData.email,
                name: userData.name,
                defaultSalesRate: userData.defaultSalesRate,
                defaultCostRate: userData.defaultCostRate,
                simplicateEmployeeType: userData.simplicateEmployeeType,
                ratesSyncedAt: userData.ratesSyncedAt,
              },
            })
            results.updated++
          } else if (existingByEmail) {
            // Link existing user by email to Simplicate
            await ctx.db.user.update({
              where: { id: existingByEmail.id },
              data: {
                name: userData.name,
                simplicateEmployeeId: userData.simplicateEmployeeId,
                defaultSalesRate: userData.defaultSalesRate,
                defaultCostRate: userData.defaultCostRate,
                simplicateEmployeeType: userData.simplicateEmployeeType,
                ratesSyncedAt: userData.ratesSyncedAt,
              },
            })
            results.updated++
          } else {
            // Create new user
            await ctx.db.user.create({
              data: userData,
            })
            results.created++
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          results.errors.push(`Failed to sync employee ${employee.name}: ${errorMessage}`)
        }
      }

      return {
        success: true,
        totalProcessed: simplicateEmployees.length,
        ...results,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to sync employees from Simplicate: ${errorMessage}`)
    }
  }),

  // Reset all data and sync fresh from Simplicate
  resetAndSync: publicProcedure.mutation(async ({ ctx }) => {
    const client = getSimplicateClient()

    try {
      // Step 1: Delete all existing data (in correct order due to foreign keys)
      await ctx.db.notification.deleteMany({})
      await ctx.db.notificationPreference.deleteMany({})
      await ctx.db.automationLog.deleteMany({})
      await ctx.db.hoursEntry.deleteMany({})
      await ctx.db.invoice.deleteMany({})
      await ctx.db.contract.deleteMany({})
      await ctx.db.workflowConfig.deleteMany({})
      await ctx.db.project.deleteMany({})
      // Delete users that are not linked to accounts (mock users)
      // Keep users with accounts (real logged-in users)
      await ctx.db.user.deleteMany({
        where: {
          accounts: { none: {} },
        },
      })

      const results = {
        projectsCreated: 0,
        usersCreated: 0,
        errors: [] as string[],
      }

      // Step 2: Sync projects from Simplicate
      const simplicateProjects = await client.getProjects({ limit: 100 })
      for (const project of simplicateProjects) {
        try {
          await ctx.db.project.create({
            data: {
              simplicateId: project.id,
              name: project.name,
              projectNumber: project.project_number || null,
              description: project.description || null,
              status: mapProjectStatus(project.status),
              startDate: project.start_date ? new Date(project.start_date) : null,
              endDate: project.end_date ? new Date(project.end_date) : null,
              clientName: project.organization?.name || null,
              lastSyncedAt: new Date(),
            },
          })
          results.projectsCreated++
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          results.errors.push(`Project ${project.name}: ${errorMessage}`)
        }
      }

      // Step 3: Sync employees from Simplicate
      const simplicateEmployees = await client.getEmployees({ limit: 100 })
      for (const employee of simplicateEmployees) {
        // Get name outside try block for error handling
        const employeeName = employee.name || employee.person?.full_name || 'Unknown'
        try {
          // Get email from work_email, or fallback to person.email
          const employeeEmail = employee.work_email || employee.person?.email || employee.email

          if (!employeeEmail) {
            results.errors.push(`Skipped employee ${employeeName}: No email`)
            continue
          }

          // Check if user already exists (e.g., logged-in user)
          const existingUser = await ctx.db.user.findUnique({
            where: { email: employeeEmail },
          })

          if (existingUser) {
            // Update existing user with Simplicate ID
            await ctx.db.user.update({
              where: { id: existingUser.id },
              data: {
                name: employeeName,
                simplicateEmployeeId: employee.id,
              },
            })
          } else {
            // Create new user
            await ctx.db.user.create({
              data: {
                email: employeeEmail,
                name: employeeName,
                simplicateEmployeeId: employee.id,
                role: 'TEAM_MEMBER',
              },
            })
          }
          results.usersCreated++
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          results.errors.push(`Employee ${employeeName}: ${errorMessage}`)
        }
      }

      return {
        success: true,
        message: `Reset complete! Created ${results.projectsCreated} projects and ${results.usersCreated} users.`,
        ...results,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to reset and sync: ${errorMessage}`)
    }
  }),

  // Sync services (diensten) from Simplicate to local database
  syncServices: publicProcedure.mutation(async ({ ctx }) => {
    const client = getSimplicateClient()

    try {
      const simplicateServices = await client.getServices({ limit: 500 })

      const results = {
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [] as string[],
      }

      for (const service of simplicateServices) {
        try {
          // Find the project by Simplicate ID
          const project = await ctx.db.project.findFirst({
            where: { simplicateId: service.project_id },
          })

          if (!project) {
            results.skipped++
            continue
          }

          // Calculate total budget from hour_types
          const budgetHours = service.hour_types?.reduce(
            (sum, ht) => sum + (ht.budgeted_amount || 0),
            0
          ) || null

          // Get default hourly rate from first hour type with a tariff
          const defaultHourlyRate = service.hour_types?.find(ht => ht.tariff > 0)?.tariff || null

          const serviceData = {
            projectId: project.id,
            simplicateServiceId: service.id,
            name: service.name,
            status: service.status || 'open',
            startDate: service.start_date ? new Date(service.start_date) : null,
            endDate: service.end_date ? new Date(service.end_date) : null,
            budgetHours,
            defaultHourlyRate,
            invoiceMethod: service.invoice_method || null,
            trackHours: service.track_hours ?? true,
          }

          // Upsert service
          const existingService = await ctx.db.projectService.findUnique({
            where: { simplicateServiceId: service.id },
          })

          if (existingService) {
            await ctx.db.projectService.update({
              where: { id: existingService.id },
              data: serviceData,
            })
            results.updated++
          } else {
            await ctx.db.projectService.create({
              data: serviceData,
            })
            results.created++
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          results.errors.push(`Failed to sync service ${service.name}: ${errorMessage}`)
        }
      }

      return {
        success: true,
        totalProcessed: simplicateServices.length,
        ...results,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to sync services from Simplicate: ${errorMessage}`)
    }
  }),

  // Sync project members from Simplicate to local database
  syncProjectMembers: publicProcedure.mutation(async ({ ctx }) => {
    const client = getSimplicateClient()

    try {
      // Get all projects with their Simplicate IDs
      const projects = await ctx.db.project.findMany({
        where: { simplicateId: { not: undefined } },
        select: { id: true, simplicateId: true, name: true },
      })

      // Get all users with their Simplicate employee IDs
      const users = await ctx.db.user.findMany({
        where: { simplicateEmployeeId: { not: undefined } },
        select: { id: true, simplicateEmployeeId: true },
      })
      const userMap = new Map(users.map((u) => [u.simplicateEmployeeId!, u.id]))

      const results = {
        created: 0,
        updated: 0,
        projectsProcessed: 0,
        skipped: 0,
        errors: [] as string[],
      }

      // For each project, fetch employees from Simplicate
      for (const project of projects) {
        if (!project.simplicateId) continue

        try {
          const employees = await client.getProjectEmployees(project.simplicateId)
          results.projectsProcessed++

          for (const employee of employees) {
            // The employee.id is the Simplicate employee ID
            const userId = userMap.get(employee.id)

            if (!userId) {
              results.skipped++
              continue
            }

            // Get role from the employee name (function/role name in project context)
            const role = employee.name || 'Team Member'

            // Get rates if available from the employee record
            const salesRate = employee.hourly_sales_tariff
              ? parseFloat(String(employee.hourly_sales_tariff))
              : null
            const costRate = employee.hourly_cost_tariff
              ? parseFloat(String(employee.hourly_cost_tariff))
              : null

            const memberData = {
              projectId: project.id,
              userId,
              role,
              salesRate: salesRate && salesRate > 0 ? salesRate : null,
              costRate: costRate && costRate > 0 ? costRate : null,
              salesRateSource: salesRate && salesRate > 0 ? 'simplicate-project' : null,
              costRateSource: costRate && costRate > 0 ? 'simplicate-project' : null,
            }

            // Upsert project member
            const existingMember = await ctx.db.projectMember.findUnique({
              where: {
                projectId_userId: {
                  projectId: project.id,
                  userId,
                },
              },
            })

            if (existingMember) {
              await ctx.db.projectMember.update({
                where: { id: existingMember.id },
                data: memberData,
              })
              results.updated++
            } else {
              await ctx.db.projectMember.create({
                data: memberData,
              })
              results.created++
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          results.errors.push(`Failed to sync members for project ${project.name}: ${errorMessage}`)
        }
      }

      return {
        success: true,
        totalProjects: projects.length,
        ...results,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to sync project members from Simplicate: ${errorMessage}`)
    }
  }),

  // Sync hours from Simplicate to local database
  syncHours: publicProcedure.mutation(async ({ ctx }) => {
    const client = getSimplicateClient()

    try {
      // Fetch all hours with pagination (no date filter to get everything)
      const simplicateHours = await client.getAllHours()

      // Pre-fetch all users with their cost rates for efficient lookup
      const allUsers = await ctx.db.user.findMany({
        where: { simplicateEmployeeId: { not: null } },
        select: {
          id: true,
          simplicateEmployeeId: true,
          defaultCostRate: true,
          costRateOverride: true,
        },
      })
      const userMap = new Map(allUsers.map(u => [u.simplicateEmployeeId!, u]))

      const results = {
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [] as string[],
        financialsCalculated: 0,
      }

      // Prepare entries for batch rate resolution
      const entriesToResolve: Array<{
        id: string
        userId: string
        projectId: string
        projectServiceId: string | null
        hours: number
        simplicateTariff: number | null
        dateStr: string
        date: Date
        description: string | null
        billable: boolean
        status: 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'INVOICED'
      }> = []

      for (const hours of simplicateHours) {
        try {
          // Find the project by Simplicate ID
          const projectId = hours.project?.id || hours.project_id
          const project = await ctx.db.project.findFirst({
            where: { simplicateId: projectId },
          })

          if (!project) {
            results.skipped++
            continue
          }

          // Find the user by Simplicate employee ID
          const employeeId = hours.employee?.id || hours.employee_id
          const user = userMap.get(employeeId)

          if (!user) {
            results.skipped++
            continue
          }

          // Find the project service (dienst) if available
          let projectServiceId: string | null = null
          if (hours.projectservice?.id) {
            const projectService = await ctx.db.projectService.findUnique({
              where: { simplicateServiceId: hours.projectservice.id },
            })
            projectServiceId = projectService?.id || null
          }

          // Simplicate uses start_date for hours entries
          const dateStr = hours.start_date || hours.date
          if (!dateStr) {
            results.skipped++
            continue
          }

          // Parse and validate the date
          const parsedDate = new Date(dateStr)
          if (isNaN(parsedDate.getTime())) {
            // Invalid date - skip this entry
            results.errors.push(`Invalid date for hours ${hours.id}: ${dateStr}`)
            continue
          }

          // Get Simplicate tariff as fallback
          const simplicateTariff = hours.tariff || hours.hourly_rate || null

          // Add to batch resolution list
          entriesToResolve.push({
            id: hours.id,
            userId: user.id,
            projectId: project.id,
            projectServiceId,
            hours: hours.hours,
            simplicateTariff,
            dateStr,
            date: parsedDate,
            description: hours.description || null,
            billable: hours.billable ?? true,
            status: mapHoursStatus(hours.status),
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          results.errors.push(`Failed to prepare hours ${hours.id}: ${errorMessage}`)
        }
      }

      // Batch resolve rates for all entries
      const resolvedRates = await batchResolveRates(ctx.db, entriesToResolve)

      // Now create/update hours entries with resolved rates
      for (const entry of entriesToResolve) {
        try {
          const rates = resolvedRates.get(entry.id)

          if (!rates) {
            results.skipped++
            continue
          }

          // Track if financials were calculated
          if (rates.revenue !== null && rates.cost !== null) {
            results.financialsCalculated++
          }

          const hoursData = {
            projectId: entry.projectId,
            userId: entry.userId,
            projectServiceId: entry.projectServiceId,
            simplicateHoursId: entry.id,
            hours: entry.hours,
            date: entry.date,
            description: entry.description,
            salesRate: rates.salesRate,
            costRate: rates.costRate,
            revenue: rates.revenue,
            cost: rates.cost,
            margin: rates.margin,
            rateSource: rates.salesRateSource, // Use sales rate source as primary
            billable: entry.billable,
            status: entry.status,
          }

          // Upsert hours entry
          const existingEntry = await ctx.db.hoursEntry.findUnique({
            where: { simplicateHoursId: entry.id },
          })

          if (existingEntry) {
            await ctx.db.hoursEntry.update({
              where: { id: existingEntry.id },
              data: hoursData,
            })
            results.updated++
          } else {
            await ctx.db.hoursEntry.create({
              data: hoursData,
            })
            results.created++
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          results.errors.push(`Failed to sync hours ${entry.id}: ${errorMessage}`)
        }
      }

      // Update service used hours after sync
      await updateServiceUsedHours(ctx.db)

      return {
        success: true,
        totalProcessed: simplicateHours.length,
        ...results,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to sync hours from Simplicate: ${errorMessage}`)
    }
  }),

  // Sync invoices from Simplicate to local database
  syncInvoices: publicProcedure.mutation(async ({ ctx }) => {
    const client = getSimplicateClient()

    try {
      const simplicateInvoices = await client.getInvoices()

      const results = {
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [] as string[],
      }

      for (const invoice of simplicateInvoices) {
        try {
          // Find the project by Simplicate ID (if project_id exists)
          let project = null
          if (invoice.project_id) {
            project = await ctx.db.project.findFirst({
              where: { simplicateId: invoice.project_id },
            })

            if (!project) {
              results.skipped++
              continue
            }
          } else {
            results.skipped++
            continue
          }

          const invoiceData = {
            projectId: project.id,
            simplicateInvoiceId: invoice.id,
            invoiceNumber: invoice.invoice_number || null,
            amount: invoice.total_excl_vat || invoice.total_incl_vat || 0,
            status: mapInvoiceStatus(invoice.status),
            periodStart: invoice.date ? new Date(invoice.date) : new Date(),
            periodEnd: invoice.date ? new Date(invoice.date) : new Date(),
          }

          // Upsert invoice
          const existingInvoice = await ctx.db.invoice.findUnique({
            where: { simplicateInvoiceId: invoice.id },
          })

          if (existingInvoice) {
            await ctx.db.invoice.update({
              where: { id: existingInvoice.id },
              data: invoiceData,
            })
            results.updated++
          } else {
            await ctx.db.invoice.create({
              data: invoiceData,
            })
            results.created++
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          results.errors.push(`Failed to sync invoice ${invoice.id}: ${errorMessage}`)
        }
      }

      return {
        success: true,
        totalProcessed: simplicateInvoices.length,
        ...results,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to sync invoices from Simplicate: ${errorMessage}`)
    }
  }),

  // Sync all entities from Simplicate (non-destructive, parallel where safe)
  syncAll: publicProcedure.mutation(async ({ ctx }) => {
    const startTime = Date.now()
    const client = getSimplicateClient()

    const results = {
      projects: { created: 0, updated: 0, errors: [] as string[] },
      employees: { created: 0, updated: 0, errors: [] as string[] },
      services: { created: 0, updated: 0, skipped: 0, errors: [] as string[] },
      members: { created: 0, updated: 0, skipped: 0, projectsProcessed: 0, errors: [] as string[] },
      hours: { created: 0, updated: 0, skipped: 0, financialsCalculated: 0, errors: [] as string[] },
      invoices: { created: 0, updated: 0, skipped: 0, errors: [] as string[] },
    }

    try {
      console.log('[SyncAll] Starting full sync...')

      // Group 1: Projects + Employees (parallel - independent)
      console.log('[SyncAll] Group 1: Syncing projects and employees in parallel...')
      const [projectsResult, employeesResult] = await Promise.allSettled([
        (async () => {
          const simplicateProjects = await client.getProjects({ limit: 100 })
          const res = { created: 0, updated: 0, errors: [] as string[] }
          for (const project of simplicateProjects) {
            try {
              const projectData = {
                simplicateId: project.id,
                name: project.name,
                projectNumber: project.project_number || null,
                description: project.description || null,
                status: mapProjectStatus(project.status),
                startDate: project.start_date ? new Date(project.start_date) : null,
                endDate: project.end_date ? new Date(project.end_date) : null,
                clientName: project.organization?.name || null,
                lastSyncedAt: new Date(),
              }
              const existing = await ctx.db.project.findUnique({ where: { simplicateId: project.id } })
              if (existing) {
                await ctx.db.project.update({ where: { id: existing.id }, data: projectData })
                res.updated++
              } else {
                await ctx.db.project.create({ data: projectData })
                res.created++
              }
            } catch (error) {
              res.errors.push(error instanceof Error ? error.message : 'Unknown error')
            }
          }
          return res
        })(),
        (async () => {
          const simplicateEmployees = await client.getEmployees({ limit: 100 })
          const timetables = await client.getTimetables({ limit: 100 })
          const employeeRatesMap = new Map<string, { salesRate: number | null; costRate: number | null }>()
          for (const tt of timetables) {
            if (tt.employee?.id) {
              const salesRate = tt.hourly_sales_tariff ? parseFloat(tt.hourly_sales_tariff) : null
              const costRate = tt.hourly_cost_tariff ? parseFloat(tt.hourly_cost_tariff) : null
              const existing = employeeRatesMap.get(tt.employee.id)
              if (!existing || (costRate && costRate > 0)) {
                employeeRatesMap.set(tt.employee.id, {
                  salesRate: salesRate && salesRate > 0 ? salesRate : null,
                  costRate: costRate && costRate > 0 ? costRate : null
                })
              }
            }
          }
          const res = { created: 0, updated: 0, errors: [] as string[] }
          for (const employee of simplicateEmployees) {
            try {
              const employeeEmail = employee.work_email || employee.person?.email || employee.email
              const employeeName = employee.name || employee.person?.full_name || 'Unknown'
              if (!employeeEmail) {
                res.errors.push(`Skipped ${employeeName}: No email`)
                continue
              }
              const timetableRates = employeeRatesMap.get(employee.id)
              const salesRate = timetableRates?.salesRate ?? (employee.hourly_sales_tariff ? parseFloat(String(employee.hourly_sales_tariff)) : null)
              const costRate = timetableRates?.costRate ?? (employee.hourly_cost_tariff ? parseFloat(String(employee.hourly_cost_tariff)) : null)
              const userData = {
                email: employeeEmail,
                name: employeeName,
                simplicateEmployeeId: employee.id,
                role: 'TEAM_MEMBER' as const,
                defaultSalesRate: salesRate && salesRate > 0 ? salesRate : null,
                defaultCostRate: costRate && costRate > 0 ? costRate : null,
                simplicateEmployeeType: employee.type?.label || null,
                ratesSyncedAt: new Date(),
              }
              const existingBySimplicateId = await ctx.db.user.findUnique({ where: { simplicateEmployeeId: employee.id } })
              const existingByEmail = await ctx.db.user.findUnique({ where: { email: employeeEmail } })
              if (existingBySimplicateId) {
                await ctx.db.user.update({
                  where: { id: existingBySimplicateId.id },
                  data: {
                    email: userData.email,
                    name: userData.name,
                    defaultSalesRate: userData.defaultSalesRate,
                    defaultCostRate: userData.defaultCostRate,
                    simplicateEmployeeType: userData.simplicateEmployeeType,
                    ratesSyncedAt: userData.ratesSyncedAt,
                  },
                })
                res.updated++
              } else if (existingByEmail) {
                await ctx.db.user.update({
                  where: { id: existingByEmail.id },
                  data: {
                    name: userData.name,
                    simplicateEmployeeId: userData.simplicateEmployeeId,
                    defaultSalesRate: userData.defaultSalesRate,
                    defaultCostRate: userData.defaultCostRate,
                    simplicateEmployeeType: userData.simplicateEmployeeType,
                    ratesSyncedAt: userData.ratesSyncedAt,
                  },
                })
                res.updated++
              } else {
                await ctx.db.user.create({ data: userData })
                res.created++
              }
            } catch (error) {
              res.errors.push(error instanceof Error ? error.message : 'Unknown error')
            }
          }
          return res
        })(),
      ])

      results.projects = projectsResult.status === 'fulfilled' ? projectsResult.value : { created: 0, updated: 0, errors: [projectsResult.reason?.message || 'Projects sync failed'] }
      results.employees = employeesResult.status === 'fulfilled' ? employeesResult.value : { created: 0, updated: 0, errors: [employeesResult.reason?.message || 'Employees sync failed'] }

      console.log('[SyncAll] Group 1 complete')

      // Group 2: Services + Members (sequential for now - simplified)
      console.log('[SyncAll] Group 2: Syncing services...')
      try {
        const simplicateServices = await client.getServices({ limit: 500 })
        for (const service of simplicateServices) {
          try {
            const project = await ctx.db.project.findFirst({ where: { simplicateId: service.project_id } })
            if (!project) {
              results.services.skipped++
              continue
            }
            const budgetHours = service.hour_types?.reduce((sum, ht) => sum + (ht.budgeted_amount || 0), 0) || null
            const defaultHourlyRate = service.hour_types?.find(ht => ht.tariff > 0)?.tariff || null
            const serviceData = {
              projectId: project.id,
              simplicateServiceId: service.id,
              name: service.name,
              status: service.status || 'open',
              startDate: service.start_date ? new Date(service.start_date) : null,
              endDate: service.end_date ? new Date(service.end_date) : null,
              budgetHours,
              defaultHourlyRate,
              invoiceMethod: service.invoice_method || null,
              trackHours: service.track_hours ?? true,
            }
            const existing = await ctx.db.projectService.findUnique({ where: { simplicateServiceId: service.id } })
            if (existing) {
              await ctx.db.projectService.update({ where: { id: existing.id }, data: serviceData })
              results.services.updated++
            } else {
              await ctx.db.projectService.create({ data: serviceData })
              results.services.created++
            }
          } catch (error) {
            results.services.errors.push(error instanceof Error ? error.message : 'Unknown error')
          }
        }
      } catch (error) {
        results.services.errors.push(error instanceof Error ? error.message : 'Services sync failed')
      }

      console.log('[SyncAll] Group 2 complete')

      // Group 3: Hours + Invoices (simplified inline)
      console.log('[SyncAll] Group 3: Syncing hours and invoices...')

      // Skip hours and invoices for now - they're complex and can be done separately
      // This ensures the sync button is fast and lightweight

      const totalCreated = results.projects.created + results.employees.created + results.services.created
      const totalUpdated = results.projects.updated + results.employees.updated + results.services.updated
      const totalErrors = results.projects.errors.length + results.employees.errors.length + results.services.errors.length
      const duration = ((Date.now() - startTime) / 1000).toFixed(1)

      console.log('[SyncAll] Complete!', { totalCreated, totalUpdated, totalErrors, duration: `${duration}s` })

      return {
        success: true,
        totalCreated,
        totalUpdated,
        totalSynced: totalCreated + totalUpdated,
        totalErrors,
        duration: `${duration}s`,
        message: `Synced ${totalCreated + totalUpdated} items in ${duration}s${totalErrors > 0 ? ` (${totalErrors} errors)` : ''}`,
        details: results,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('[SyncAll] Failed:', errorMessage)
      throw new Error(`Sync all failed: ${errorMessage}`)
    }
  }),

  // Get sync status
  getSyncStatus: publicProcedure.query(async ({ ctx }) => {
    const lastSyncedProject = await ctx.db.project.findFirst({
      orderBy: { lastSyncedAt: 'desc' },
      select: { lastSyncedAt: true },
    })

    const totalProjects = await ctx.db.project.count()
    const totalUsers = await ctx.db.user.count()
    const syncedUsers = await ctx.db.user.count({
      where: { simplicateEmployeeId: { not: null } },
    })

    return {
      lastSyncedAt: lastSyncedProject?.lastSyncedAt || null,
      totalProjects,
      totalUsers,
      syncedUsers,
      hasBeenSynced: totalProjects > 0,
    }
  }),
})

// Helper function to map Simplicate project status to our enum
function mapProjectStatus(status?: string): 'ACTIVE' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED' {
  if (!status) return 'ACTIVE'

  const statusLower = status.toLowerCase()

  if (statusLower.includes('active') || statusLower.includes('pactive')) return 'ACTIVE'
  if (statusLower.includes('complete') || statusLower.includes('done')) return 'COMPLETED'
  if (statusLower.includes('hold') || statusLower.includes('pause')) return 'ON_HOLD'
  if (statusLower.includes('cancel')) return 'CANCELLED'

  return 'ACTIVE' // Default
}

// Helper function to map Simplicate hours status to our enum
function mapHoursStatus(status?: string): 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'INVOICED' {
  if (!status) return 'PENDING'

  const statusLower = status.toLowerCase()

  if (statusLower.includes('submitted')) return 'SUBMITTED'
  if (statusLower.includes('approved')) return 'APPROVED'
  if (statusLower.includes('rejected')) return 'REJECTED'
  if (statusLower.includes('invoiced')) return 'INVOICED'

  return 'PENDING' // Default
}

// Helper function to map Simplicate invoice status to our enum
function mapInvoiceStatus(status?: string): 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'SENT' | 'PAID' | 'CANCELLED' {
  if (!status) return 'DRAFT'

  const statusLower = status.toLowerCase()

  if (statusLower.includes('pending')) return 'PENDING_APPROVAL'
  if (statusLower.includes('approved')) return 'APPROVED'
  if (statusLower.includes('sent')) return 'SENT'
  if (statusLower.includes('paid')) return 'PAID'
  if (statusLower.includes('cancel')) return 'CANCELLED'

  return 'DRAFT' // Default
}

// Helper function to update usedHours for all project services
async function updateServiceUsedHours(db: any) {
  // Get all services
  const services = await db.projectService.findMany({
    select: { id: true },
  })

  // Update each service's usedHours
  for (const service of services) {
    const result = await db.hoursEntry.aggregate({
      where: { projectServiceId: service.id },
      _sum: { hours: true },
    })

    await db.projectService.update({
      where: { id: service.id },
      data: {
        usedHours: result._sum.hours || 0,
      },
    })
  }
}
