import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '@/server/api/trpc'
import {
  resolveEffectiveRates,
  getRateSourceLabel,
  type RateSource,
} from '@/lib/rates/resolver'
import { getSimplicateClient } from '@/lib/simplicate/client'

export const ratesRouter = createTRPCRouter({
  // Debug: Comprehensive rate search across all Simplicate endpoints
  debugSimplicateRates: publicProcedure.query(async () => {
    const client = getSimplicateClient()

    // 1. Get all employees
    const employees = await client.getEmployees()

    // 2. Get all hours entries to see tariffs used
    const hours = await client.getAllHours()

    // 3. Get all services to see service-level tariffs
    const services = await client.getServices()

    // 4. Get all projects to check for project-employee assignments
    const projects = await client.getProjects()

    // Build a map of rates found per employee from different sources
    const employeeRates: Record<string, {
      name: string
      type: string
      employeeRecord: { salesTariff: string | number | null; costTariff: string | number | null }
      hoursEntries: Array<{ projectName: string; serviceName: string; tariff: number | null; date: string }>
      projectAssignments: Array<{ projectName: string; hourlyRate: number | null }>
    }> = {}

    // Initialize from employee records
    for (const emp of employees) {
      employeeRates[emp.id] = {
        name: emp.name,
        type: emp.type?.label || 'unknown',
        employeeRecord: {
          salesTariff: emp.hourly_sales_tariff,
          costTariff: emp.hourly_cost_tariff,
        },
        hoursEntries: [],
        projectAssignments: [],
      }
    }

    // Add rates from hours entries
    for (const h of hours) {
      const empId = h.employee?.id || h.employee_id
      if (empId && employeeRates[empId]) {
        // Only add unique project/service/tariff combinations
        const entry = {
          projectName: h.project?.name || 'Unknown Project',
          serviceName: h.projectservice?.name || 'Unknown Service',
          tariff: h.tariff || h.hourly_rate || null,
          date: h.start_date || h.date || 'unknown',
        }
        // Check if we already have this combo
        const exists = employeeRates[empId].hoursEntries.some(
          (e) => e.projectName === entry.projectName &&
                 e.serviceName === entry.serviceName &&
                 e.tariff === entry.tariff
        )
        if (!exists && entry.tariff) {
          employeeRates[empId].hoursEntries.push(entry)
        }
      }
    }

    // Check project employees for assignments with rates
    for (const project of projects) {
      try {
        const projectEmployees = await client.getProjectEmployees(project.id)
        for (const pe of projectEmployees) {
          const empId = pe.employee?.id
          if (empId && employeeRates[empId]) {
            employeeRates[empId].projectAssignments.push({
              projectName: project.name,
              hourlyRate: pe.hourly_rate || null,
            })
          }
        }
      } catch {
        // Some projects might not have employees
      }
    }

    // Return summary focused on external employees (freelancers)
    const freelancers = Object.values(employeeRates).filter(
      (e) => e.type === 'external'
    )

    const internalEmployees = Object.values(employeeRates).filter(
      (e) => e.type === 'internal'
    )

    return {
      summary: {
        totalEmployees: employees.length,
        totalHoursEntries: hours.length,
        totalServices: services.length,
        totalProjects: projects.length,
      },
      freelancers,
      internalEmployees,
      // Also return unique tariffs found in hours
      uniqueTariffsInHours: [...new Set(hours.map((h) => h.tariff || h.hourly_rate).filter(Boolean))].sort((a, b) => (a as number) - (b as number)),
    }
  }),
  // Get rate overview showing hierarchy: User > Project > Service-Employee
  getRateOverview: publicProcedure.query(async ({ ctx }) => {
    // Get ALL users (not just those with rates) so we can set rates for freelancers
    const users = await ctx.db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        simplicateEmployeeType: true,
        defaultSalesRate: true,
        defaultCostRate: true,
        salesRateOverride: true,
        costRateOverride: true,
        ratesSyncedAt: true,
      },
      orderBy: [
        { simplicateEmployeeType: 'asc' }, // internal first, then external
        { name: 'asc' },
      ],
    })

    // Get project-level rate overrides
    const projectRates = await ctx.db.projectMember.findMany({
      where: {
        OR: [
          { salesRate: { not: null } },
          { costRate: { not: null } },
        ],
      },
      select: {
        id: true,
        salesRate: true,
        costRate: true,
        salesRateSource: true,
        costRateSource: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            projectNumber: true,
          },
        },
      },
      orderBy: {
        project: { name: 'asc' },
      },
    })

    // Get service-employee level rate overrides
    const serviceRates = await ctx.db.serviceEmployeeRate.findMany({
      select: {
        id: true,
        salesRate: true,
        costRate: true,
        salesRateSource: true,
        costRateSource: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        projectService: {
          select: {
            id: true,
            name: true,
            project: {
              select: {
                id: true,
                name: true,
                projectNumber: true,
              },
            },
          },
        },
      },
    })

    // Count users with any rate set
    const usersWithRates = users.filter(
      (u) =>
        u.defaultSalesRate !== null ||
        u.defaultCostRate !== null ||
        u.salesRateOverride !== null ||
        u.costRateOverride !== null
    ).length

    return {
      userRates: users,
      projectRates,
      serviceRates,
      stats: {
        totalUsers: users.length,
        usersWithRates,
        usersWithoutRates: users.length - usersWithRates,
        projectOverrides: projectRates.length,
        serviceOverrides: serviceRates.length,
      },
    }
  }),

  // Get all rates for a specific project (with drill-down)
  getProjectRates: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.project.findUnique({
        where: { id: input.projectId },
        select: {
          id: true,
          name: true,
          projectNumber: true,
          members: {
            select: {
              id: true,
              salesRate: true,
              costRate: true,
              salesRateSource: true,
              costRateSource: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  defaultSalesRate: true,
                  defaultCostRate: true,
                },
              },
            },
          },
          services: {
            select: {
              id: true,
              name: true,
              defaultHourlyRate: true,
              employeeRates: {
                select: {
                  id: true,
                  salesRate: true,
                  costRate: true,
                  salesRateSource: true,
                  costRateSource: true,
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
        },
      })

      return project
    }),

  // Get all users (for dropdown selectors)
  getAllUsers: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        simplicateEmployeeType: true,
        defaultSalesRate: true,
        defaultCostRate: true,
        salesRateOverride: true,
        costRateOverride: true,
      },
      orderBy: { name: 'asc' },
    })
  }),

  // Set/clear user rate override
  setUserRateOverride: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        salesRateOverride: z.number().nullable().optional(),
        costRateOverride: z.number().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updateData: Record<string, number | null> = {}

      if (input.salesRateOverride !== undefined) {
        updateData.salesRateOverride = input.salesRateOverride
      }
      if (input.costRateOverride !== undefined) {
        updateData.costRateOverride = input.costRateOverride
      }

      return ctx.db.user.update({
        where: { id: input.userId },
        data: updateData,
      })
    }),

  // Set/clear project member rate
  setProjectMemberRate: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
        userId: z.string(),
        salesRate: z.number().nullable().optional(),
        costRate: z.number().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Find or create project member
      const existing = await ctx.db.projectMember.findFirst({
        where: {
          projectId: input.projectId,
          userId: input.userId,
        },
      })

      const updateData: Record<string, unknown> = {}
      if (input.salesRate !== undefined) {
        updateData.salesRate = input.salesRate
        updateData.salesRateSource = input.salesRate !== null ? 'manual' : null
      }
      if (input.costRate !== undefined) {
        updateData.costRate = input.costRate
        updateData.costRateSource = input.costRate !== null ? 'manual' : null
      }

      if (existing) {
        return ctx.db.projectMember.update({
          where: { id: existing.id },
          data: updateData,
        })
      } else {
        return ctx.db.projectMember.create({
          data: {
            projectId: input.projectId,
            userId: input.userId,
            ...updateData,
          },
        })
      }
    }),

  // Set/clear service-employee rate
  setServiceEmployeeRate: publicProcedure
    .input(
      z.object({
        projectServiceId: z.string(),
        userId: z.string(),
        salesRate: z.number().nullable().optional(),
        costRate: z.number().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updateData: Record<string, unknown> = {}
      if (input.salesRate !== undefined) {
        updateData.salesRate = input.salesRate
        updateData.salesRateSource = input.salesRate !== null ? 'manual' : null
      }
      if (input.costRate !== undefined) {
        updateData.costRate = input.costRate
        updateData.costRateSource = input.costRate !== null ? 'manual' : null
      }

      return ctx.db.serviceEmployeeRate.upsert({
        where: {
          projectServiceId_userId: {
            projectServiceId: input.projectServiceId,
            userId: input.userId,
          },
        },
        create: {
          projectServiceId: input.projectServiceId,
          userId: input.userId,
          ...updateData,
        },
        update: updateData,
      })
    }),

  // Delete service-employee rate override
  deleteServiceEmployeeRate: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.serviceEmployeeRate.delete({
        where: { id: input.id },
      })
    }),

  // Resolve effective rate for a given context
  resolveRate: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        projectId: z.string(),
        projectServiceId: z.string().nullable().optional(),
        hours: z.number().default(1),
        simplicateTariff: z.number().nullable().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const result = await resolveEffectiveRates(ctx.db, {
        userId: input.userId,
        projectId: input.projectId,
        projectServiceId: input.projectServiceId,
        hours: input.hours,
        simplicateTariff: input.simplicateTariff,
      })

      return {
        ...result,
        salesRateSourceLabel: getRateSourceLabel(result.salesRateSource),
        costRateSourceLabel: getRateSourceLabel(result.costRateSource),
      }
    }),
})
