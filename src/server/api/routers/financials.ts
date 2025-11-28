import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '@/server/api/trpc'

export const financialsRouter = createTRPCRouter({
  // Get financial overview for a period
  getOverview: publicProcedure
    .input(
      z.object({
        month: z.string().optional(), // Format: YYYY-MM
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Build date range
      let start: Date
      let end: Date

      if (input.month) {
        const [year, month] = input.month.split('-').map(Number)
        start = new Date(year!, month! - 1, 1)
        end = new Date(year!, month!, 0, 23, 59, 59)
      } else if (input.startDate && input.endDate) {
        start = new Date(input.startDate)
        end = new Date(input.endDate)
      } else {
        const now = new Date()
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
      }

      // Get aggregated financials
      const aggregate = await ctx.db.hoursEntry.aggregate({
        where: {
          date: { gte: start, lte: end },
        },
        _sum: {
          hours: true,
          revenue: true,
          cost: true,
          margin: true,
        },
        _count: true,
      })

      // Get unique projects and employees count
      const uniqueProjects = await ctx.db.hoursEntry.findMany({
        where: { date: { gte: start, lte: end } },
        select: { projectId: true },
        distinct: ['projectId'],
      })

      const uniqueEmployees = await ctx.db.hoursEntry.findMany({
        where: { date: { gte: start, lte: end } },
        select: { userId: true },
        distinct: ['userId'],
      })

      const revenue = aggregate._sum.revenue || 0
      const cost = aggregate._sum.cost || 0
      const margin = aggregate._sum.margin || 0
      const marginPercentage = revenue > 0 ? (margin / revenue) * 100 : 0

      return {
        totalHours: aggregate._sum.hours || 0,
        totalRevenue: revenue,
        totalCost: cost,
        totalMargin: margin,
        marginPercentage,
        entryCount: aggregate._count,
        projectCount: uniqueProjects.length,
        employeeCount: uniqueEmployees.length,
      }
    }),

  // Get financials by project
  getByProject: publicProcedure
    .input(
      z.object({
        month: z.string().optional(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      let start: Date
      let end: Date

      if (input.month) {
        const [year, month] = input.month.split('-').map(Number)
        start = new Date(year!, month! - 1, 1)
        end = new Date(year!, month!, 0, 23, 59, 59)
      } else {
        const now = new Date()
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
      }

      // Group by project using raw query
      const projectData = await ctx.db.hoursEntry.groupBy({
        by: ['projectId'],
        where: {
          date: { gte: start, lte: end },
        },
        _sum: {
          hours: true,
          revenue: true,
          cost: true,
          margin: true,
        },
        _count: true,
        orderBy: {
          _sum: {
            revenue: 'desc',
          },
        },
        take: input.limit,
      })

      // Get project details
      const projectIds = projectData.map((p) => p.projectId)
      const projects = await ctx.db.project.findMany({
        where: { id: { in: projectIds } },
        select: {
          id: true,
          name: true,
          clientName: true,
          projectNumber: true,
        },
      })

      const projectMap = new Map(projects.map((p) => [p.id, p]))

      return projectData.map((p) => {
        const project = projectMap.get(p.projectId)
        const revenue = p._sum.revenue || 0
        const margin = p._sum.margin || 0
        const marginPercentage = revenue > 0 ? (margin / revenue) * 100 : 0

        return {
          projectId: p.projectId,
          projectName: project?.name || 'Unknown',
          clientName: project?.clientName || null,
          projectNumber: project?.projectNumber || null,
          hours: p._sum.hours || 0,
          revenue,
          cost: p._sum.cost || 0,
          margin,
          marginPercentage,
          entryCount: p._count,
        }
      })
    }),

  // Get financials by employee
  getByEmployee: publicProcedure
    .input(
      z.object({
        month: z.string().optional(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      let start: Date
      let end: Date

      if (input.month) {
        const [year, month] = input.month.split('-').map(Number)
        start = new Date(year!, month! - 1, 1)
        end = new Date(year!, month!, 0, 23, 59, 59)
      } else {
        const now = new Date()
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
      }

      // Group by employee
      const employeeData = await ctx.db.hoursEntry.groupBy({
        by: ['userId'],
        where: {
          date: { gte: start, lte: end },
        },
        _sum: {
          hours: true,
          revenue: true,
          cost: true,
          margin: true,
        },
        _count: true,
        orderBy: {
          _sum: {
            revenue: 'desc',
          },
        },
        take: input.limit,
      })

      // Get employee details
      const userIds = employeeData.map((e) => e.userId)
      const users = await ctx.db.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          name: true,
          email: true,
          employeeType: true,
        },
      })

      const userMap = new Map(users.map((u) => [u.id, u]))

      return employeeData.map((e) => {
        const user = userMap.get(e.userId)
        const revenue = e._sum.revenue || 0
        const cost = e._sum.cost || 0
        const margin = e._sum.margin || 0
        const marginPercentage = revenue > 0 ? (margin / revenue) * 100 : 0
        const effectiveRate = (e._sum.hours || 0) > 0 ? revenue / (e._sum.hours || 1) : 0

        return {
          userId: e.userId,
          name: user?.name || user?.email || 'Unknown',
          email: user?.email || '',
          employeeType: user?.employeeType || null,
          hours: e._sum.hours || 0,
          revenue,
          cost,
          margin,
          marginPercentage,
          effectiveRate,
          entryCount: e._count,
        }
      })
    }),

  // Get monthly trend data
  getMonthlyTrend: publicProcedure
    .input(
      z.object({
        months: z.number().min(1).max(24).default(6),
      })
    )
    .query(async ({ ctx, input }) => {
      const now = new Date()
      const monthlyData: Array<{
        month: string
        label: string
        hours: number
        revenue: number
        cost: number
        margin: number
        marginPercentage: number
      }> = []

      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
        'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'
      ]

      for (let i = input.months - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const year = date.getFullYear()
        const month = date.getMonth()
        const start = new Date(year, month, 1)
        const end = new Date(year, month + 1, 0, 23, 59, 59)
        const value = `${year}-${String(month + 1).padStart(2, '0')}`
        const label = `${monthNames[month]} ${year}`

        const aggregate = await ctx.db.hoursEntry.aggregate({
          where: {
            date: { gte: start, lte: end },
          },
          _sum: {
            hours: true,
            revenue: true,
            cost: true,
            margin: true,
          },
        })

        const revenue = aggregate._sum.revenue || 0
        const margin = aggregate._sum.margin || 0
        const marginPercentage = revenue > 0 ? (margin / revenue) * 100 : 0

        monthlyData.push({
          month: value,
          label,
          hours: aggregate._sum.hours || 0,
          revenue,
          cost: aggregate._sum.cost || 0,
          margin,
          marginPercentage,
        })
      }

      return monthlyData
    }),

  // Get available months with data
  getAvailableMonths: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(24).default(12),
      })
    )
    .query(async ({ ctx, input }) => {
      const now = new Date()
      const months: { value: string; label: string; hasData: boolean }[] = []

      const monthNames = [
        'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
        'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'
      ]

      for (let i = 0; i < input.limit; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const year = date.getFullYear()
        const month = date.getMonth()
        const value = `${year}-${String(month + 1).padStart(2, '0')}`
        const label = `${monthNames[month]} ${year}`

        const startOfMonth = new Date(year, month, 1)
        const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59)

        const count = await ctx.db.hoursEntry.count({
          where: {
            date: { gte: startOfMonth, lte: endOfMonth },
            revenue: { not: null },
          },
        })

        months.push({
          value,
          label,
          hasData: count > 0,
        })
      }

      return months
    }),
})
