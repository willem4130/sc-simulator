import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { TimePeriodType } from '@prisma/client'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ==========================================
// TIME PERIOD UTILITIES
// ==========================================

export interface Period {
  label: string
  value: string // For select value (e.g., "2025", "2025-Q1", "2025-01")
  periodStart: Date
  periodEnd: Date
}

/**
 * Generate periods for a scenario based on its time period type
 */
export function generatePeriods(
  timePeriodType: TimePeriodType,
  startDate?: Date | null,
  endDate?: Date | null
): Period[] {
  if (timePeriodType === 'SINGLE_POINT') {
    // Single point in time - return just one period
    const now = new Date()
    return [
      {
        label: 'Single Point',
        value: 'single',
        periodStart: now,
        periodEnd: now,
      },
    ]
  }

  // For time series, use startDate/endDate or default to 2025-2031
  const start = startDate ? new Date(startDate) : new Date('2025-01-01')
  const end = endDate ? new Date(endDate) : new Date('2031-12-31')

  const periods: Period[] = []

  if (timePeriodType === 'YEARLY') {
    const startYear = start.getFullYear()
    const endYear = end.getFullYear()

    for (let year = startYear; year <= endYear; year++) {
      periods.push({
        label: `${year}`,
        value: `${year}`,
        periodStart: new Date(`${year}-01-01`),
        periodEnd: new Date(`${year}-12-31`),
      })
    }
  } else if (timePeriodType === 'QUARTERLY') {
    const startYear = start.getFullYear()
    const endYear = end.getFullYear()

    for (let year = startYear; year <= endYear; year++) {
      for (let quarter = 1; quarter <= 4; quarter++) {
        const quarterStartMonth = (quarter - 1) * 3 + 1
        const quarterEndMonth = quarter * 3

        const periodStart = new Date(year, quarterStartMonth - 1, 1)
        const periodEnd = new Date(year, quarterEndMonth, 0) // Last day of quarter

        periods.push({
          label: `${year} Q${quarter}`,
          value: `${year}-Q${quarter}`,
          periodStart,
          periodEnd,
        })
      }
    }
  } else if (timePeriodType === 'MONTHLY') {
    const startYear = start.getFullYear()
    const startMonth = start.getMonth()
    const endYear = end.getFullYear()
    const endMonth = end.getMonth()

    let currentDate = new Date(startYear, startMonth, 1)
    const endDateObj = new Date(endYear, endMonth, 1)

    while (currentDate <= endDateObj) {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth() + 1
      const monthName = currentDate.toLocaleString('default', { month: 'short' })

      const periodStart = new Date(year, month - 1, 1)
      const periodEnd = new Date(year, month, 0) // Last day of month

      periods.push({
        label: `${monthName} ${year}`,
        value: `${year}-${String(month).padStart(2, '0')}`,
        periodStart,
        periodEnd,
      })

      // Move to next month
      currentDate = new Date(year, month, 1)
    }
  }

  return periods
}

/**
 * Get default time period label for a scenario
 */
export function getTimePeriodLabel(timePeriodType: TimePeriodType): string {
  switch (timePeriodType) {
    case 'SINGLE_POINT':
      return 'Single point in time'
    case 'YEARLY':
      return 'Multi-year scenario'
    case 'QUARTERLY':
      return 'Quarterly projections'
    case 'MONTHLY':
      return 'Monthly time series'
    default:
      return 'Unknown'
  }
}
