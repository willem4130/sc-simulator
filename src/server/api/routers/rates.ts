import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '@/server/api/trpc'
import {
  resolveEffectiveRates,
  getRateSourceLabel,
  type RateSource,
} from '@/lib/rates/resolver'
import { getSimplicateClient } from '@/lib/simplicate/client'

export const ratesRouter = createTRPCRouter({
  // Debug: See raw Simplicate employee data
  debugSimplicateEmployees: publicProcedure.query(async () => {
    const client = getSimplicateClient()
    const employees = await client.getEmployees()

    // Return raw data with rate fields highlighted
    return employees.map((emp) => ({
      id: emp.id,
      name: emp.name,
      email: emp.work_email || emp.email,
      type: emp.type,
      hourly_sales_tariff: emp.hourly_sales_tariff,
      hourly_cost_tariff: emp.hourly_cost_tariff,
      // Include all fields to see what's available
      _raw: emp,
    }))
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
