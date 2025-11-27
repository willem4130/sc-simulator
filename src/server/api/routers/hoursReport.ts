import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '@/server/api/trpc'
import type { Prisma } from '@prisma/client'

// Type definitions for report data
interface ProjectHours {
  projectId: string
  projectName: string
  clientName: string | null
  serviceName: string | null
  totalHours: number
  hourlyRate: number | null
  totalAmount: number | null
  entries: {
    date: Date
    hours: number
    description: string | null
  }[]
}

interface HoursReportData {
  employee: {
    id: string
    name: string | null
    email: string
    employeeType: string | null
  }
  period: {
    startDate: Date
    endDate: Date
    label: string
  }
  hours: {
    byProject: ProjectHours[]
    totalHours: number
    totalAmount: number | null
  }
  kilometers: {
    totalKm: number
    kmRate: number
    totalAmount: number
    entries: {
      date: Date
      km: number
      description: string | null
      projectName: string | null
    }[]
  }
  expenses: {
    items: {
      date: Date
      category: string
      description: string | null
      amount: number
      projectName: string | null
    }[]
    totalAmount: number
  }
  totals: {
    hoursAmount: number | null
    kmAmount: number
    expensesAmount: number
    grandTotal: number | null
  }
}

export const hoursReportRouter = createTRPCRouter({
  // Get employees who have hours in a given period
  getEmployeesWithHours: publicProcedure
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
        // Default to current month
        const now = new Date()
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
      }

      // Get unique users with hours in this period
      const hoursEntries = await ctx.db.hoursEntry.findMany({
        where: {
          date: { gte: start, lte: end },
        },
        select: {
          userId: true,
        },
        distinct: ['userId'],
      })

      const userIds = hoursEntries.map((e) => e.userId)

      if (userIds.length === 0) {
        return []
      }

      const users = await ctx.db.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          name: true,
          email: true,
          employeeType: true,
        },
        orderBy: { name: 'asc' },
      })

      // Add hours count for each user
      const usersWithHours = await Promise.all(
        users.map(async (user) => {
          const aggregate = await ctx.db.hoursEntry.aggregate({
            where: {
              userId: user.id,
              date: { gte: start, lte: end },
            },
            _sum: { hours: true },
            _count: true,
          })

          return {
            ...user,
            totalHours: aggregate._sum.hours || 0,
            entryCount: aggregate._count,
          }
        })
      )

      return usersWithHours
    }),

  // Generate a full hours report for an employee and period
  generateReport: publicProcedure
    .input(
      z.object({
        employeeId: z.string(),
        month: z.string().optional(), // Format: YYYY-MM
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        projectIds: z.array(z.string()).optional(), // Filter to specific projects
      })
    )
    .query(async ({ ctx, input }): Promise<HoursReportData | null> => {
      // Build date range
      let start: Date
      let end: Date
      let periodLabel: string

      if (input.month) {
        const [year, month] = input.month.split('-').map(Number)
        start = new Date(year!, month! - 1, 1)
        end = new Date(year!, month!, 0, 23, 59, 59)
        const monthNames = [
          'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
          'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'
        ]
        periodLabel = `${monthNames[month! - 1]} ${year}`
      } else if (input.startDate && input.endDate) {
        start = new Date(input.startDate)
        end = new Date(input.endDate)
        periodLabel = `${start.toLocaleDateString('nl-NL')} - ${end.toLocaleDateString('nl-NL')}`
      } else {
        const now = new Date()
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
        const monthNames = [
          'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
          'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'
        ]
        periodLabel = `${monthNames[now.getMonth()]} ${now.getFullYear()}`
      }

      // Get employee details
      const employee = await ctx.db.user.findUnique({
        where: { id: input.employeeId },
        select: {
          id: true,
          name: true,
          email: true,
          employeeType: true,
          defaultSalesRate: true,
          defaultCostRate: true,
        },
      })

      if (!employee) {
        return null
      }

      // Build hours query
      const hoursWhere: Prisma.HoursEntryWhereInput = {
        userId: input.employeeId,
        date: { gte: start, lte: end },
      }
      if (input.projectIds?.length) {
        hoursWhere.projectId = { in: input.projectIds }
      }

      // Get all hours entries
      const hoursEntries = await ctx.db.hoursEntry.findMany({
        where: hoursWhere,
        include: {
          project: {
            select: {
              id: true,
              name: true,
              clientName: true,
            },
          },
          projectService: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { date: 'asc' },
      })

      // Group hours by project
      const projectHoursMap = new Map<string, ProjectHours>()

      for (const entry of hoursEntries) {
        const key = entry.projectId
        if (!projectHoursMap.has(key)) {
          projectHoursMap.set(key, {
            projectId: entry.project.id,
            projectName: entry.project.name,
            clientName: entry.project.clientName,
            serviceName: entry.projectService?.name || null,
            totalHours: 0,
            hourlyRate: entry.salesRate,
            totalAmount: null,
            entries: [],
          })
        }

        const projectData = projectHoursMap.get(key)!
        projectData.totalHours += entry.hours
        projectData.entries.push({
          date: entry.date,
          hours: entry.hours,
          description: entry.description,
        })

        // Update hourly rate from entry if available
        if (entry.salesRate && !projectData.hourlyRate) {
          projectData.hourlyRate = entry.salesRate
        }
      }

      // Calculate totals for hours
      let totalHoursAmount: number | null = 0
      for (const projectData of projectHoursMap.values()) {
        if (projectData.hourlyRate) {
          projectData.totalAmount = projectData.totalHours * projectData.hourlyRate
          totalHoursAmount = (totalHoursAmount ?? 0) + projectData.totalAmount
        } else {
          totalHoursAmount = null // Can't calculate total if any project lacks rate
        }
      }

      // Get app settings for km rate
      const settings = await ctx.db.appSettings.findFirst()
      const kmRate = settings?.kmRate || 0.23

      // Get kilometer expenses
      const kmExpenses = await ctx.db.expense.findMany({
        where: {
          userId: input.employeeId,
          date: { gte: start, lte: end },
          category: 'KILOMETERS',
          ...(input.projectIds?.length ? { projectId: { in: input.projectIds } } : {}),
        },
        include: {
          project: {
            select: { name: true },
          },
        },
        orderBy: { date: 'asc' },
      })

      const totalKm = kmExpenses.reduce((sum, e) => sum + (e.kilometers || 0), 0)
      const kmAmount = totalKm * kmRate

      // Get other expenses (non-kilometer)
      const otherExpenses = await ctx.db.expense.findMany({
        where: {
          userId: input.employeeId,
          date: { gte: start, lte: end },
          category: { not: 'KILOMETERS' },
          ...(input.projectIds?.length ? { projectId: { in: input.projectIds } } : {}),
        },
        include: {
          project: {
            select: { name: true },
          },
        },
        orderBy: { date: 'asc' },
      })

      const totalExpenses = otherExpenses.reduce((sum, e) => sum + e.amount, 0)

      // Calculate grand total
      let grandTotal: number | null = null
      if (totalHoursAmount !== null) {
        grandTotal = totalHoursAmount + kmAmount + totalExpenses
      }

      return {
        employee: {
          id: employee.id,
          name: employee.name,
          email: employee.email,
          employeeType: employee.employeeType,
        },
        period: {
          startDate: start,
          endDate: end,
          label: periodLabel,
        },
        hours: {
          byProject: Array.from(projectHoursMap.values()),
          totalHours: hoursEntries.reduce((sum, e) => sum + e.hours, 0),
          totalAmount: totalHoursAmount,
        },
        kilometers: {
          totalKm,
          kmRate,
          totalAmount: kmAmount,
          entries: kmExpenses.map((e) => ({
            date: e.date,
            km: e.kilometers || 0,
            description: e.description,
            projectName: e.project.name,
          })),
        },
        expenses: {
          items: otherExpenses.map((e) => ({
            date: e.date,
            category: e.category,
            description: e.description,
            amount: e.amount,
            projectName: e.project.name,
          })),
          totalAmount: totalExpenses,
        },
        totals: {
          hoursAmount: totalHoursAmount,
          kmAmount,
          expensesAmount: totalExpenses,
          grandTotal,
        },
      }
    }),

  // Get available months that have hours data
  getAvailableMonths: publicProcedure
    .input(
      z.object({
        employeeId: z.string().optional(),
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

        // Check if there's data for this month
        const startOfMonth = new Date(year, month, 1)
        const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59)

        const where: Prisma.HoursEntryWhereInput = {
          date: { gte: startOfMonth, lte: endOfMonth },
        }
        if (input.employeeId) {
          where.userId = input.employeeId
        }

        const count = await ctx.db.hoursEntry.count({ where })

        months.push({
          value,
          label,
          hasData: count > 0,
        })
      }

      return months
    }),

  // Get report stats (for overview cards)
  getReportStats: publicProcedure
    .input(
      z.object({
        month: z.string().optional(),
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

      // Get unique employees with hours
      const uniqueEmployees = await ctx.db.hoursEntry.findMany({
        where: { date: { gte: start, lte: end } },
        select: { userId: true },
        distinct: ['userId'],
      })

      // Get total hours
      const hoursAggregate = await ctx.db.hoursEntry.aggregate({
        where: { date: { gte: start, lte: end } },
        _sum: { hours: true },
      })

      // Get total km
      const kmAggregate = await ctx.db.expense.aggregate({
        where: {
          date: { gte: start, lte: end },
          category: 'KILOMETERS',
        },
        _sum: { kilometers: true },
      })

      // Get total expenses
      const expensesAggregate = await ctx.db.expense.aggregate({
        where: {
          date: { gte: start, lte: end },
          category: { not: 'KILOMETERS' },
        },
        _sum: { amount: true },
      })

      return {
        employeesWithHours: uniqueEmployees.length,
        totalHours: hoursAggregate._sum.hours || 0,
        totalKilometers: kmAggregate._sum.kilometers || 0,
        totalExpenses: expensesAggregate._sum.amount || 0,
      }
    }),
})
