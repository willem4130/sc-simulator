/**
 * Rate Resolution System
 *
 * Resolves effective sales and cost rates using a hierarchical priority system.
 * Higher priority levels override lower ones.
 *
 * Priority Order (highest to lowest):
 * 1. Service-Employee Rate - Most specific, set per service per employee
 * 2. Project-Member Rate - Project-level employee override
 * 3. User Override - Manual override at user level
 * 4. User Default - Synced from Simplicate (hourly_sales_tariff, hourly_cost_tariff)
 * 5. Simplicate Snapshot - hours.tariff from the hours entry itself
 */

import type { PrismaClient } from '@prisma/client'

// Rate sources in priority order (highest first)
export type RateSource =
  | 'service-employee'
  | 'project-member'
  | 'user-override'
  | 'user-default'
  | 'simplicate'
  | 'none'

export interface ResolvedRates {
  salesRate: number | null
  costRate: number | null
  salesRateSource: RateSource
  costRateSource: RateSource
  revenue: number | null
  cost: number | null
  margin: number | null
}

export interface RateResolutionContext {
  userId: string
  projectId: string
  projectServiceId?: string | null
  hours: number
  simplicateTariff?: number | null // Snapshot from hours entry
}

/**
 * Resolve effective rates for a given context
 *
 * @param db - Prisma client
 * @param context - Rate resolution context
 * @returns Resolved rates with sources
 */
export async function resolveEffectiveRates(
  db: PrismaClient,
  context: RateResolutionContext
): Promise<ResolvedRates> {
  const { userId, projectId, projectServiceId, hours, simplicateTariff } = context

  let salesRate: number | null = null
  let costRate: number | null = null
  let salesRateSource: RateSource = 'none'
  let costRateSource: RateSource = 'none'

  // 1. Try Service-Employee Rate (highest priority)
  if (projectServiceId) {
    const serviceEmployeeRate = await db.serviceEmployeeRate.findUnique({
      where: {
        projectServiceId_userId: {
          projectServiceId,
          userId,
        },
      },
    })

    if (serviceEmployeeRate) {
      if (serviceEmployeeRate.salesRate !== null && salesRate === null) {
        salesRate = serviceEmployeeRate.salesRate
        salesRateSource = 'service-employee'
      }
      if (serviceEmployeeRate.costRate !== null && costRate === null) {
        costRate = serviceEmployeeRate.costRate
        costRateSource = 'service-employee'
      }
    }
  }

  // 2. Try Project-Member Rate
  if (salesRate === null || costRate === null) {
    const projectMember = await db.projectMember.findFirst({
      where: { projectId, userId },
    })

    if (projectMember) {
      if (projectMember.salesRate !== null && salesRate === null) {
        salesRate = projectMember.salesRate
        salesRateSource = 'project-member'
      }
      if (projectMember.costRate !== null && costRate === null) {
        costRate = projectMember.costRate
        costRateSource = 'project-member'
      }
    }
  }

  // 3. Try User Override and User Default
  if (salesRate === null || costRate === null) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        salesRateOverride: true,
        costRateOverride: true,
        defaultSalesRate: true,
        defaultCostRate: true,
      },
    })

    if (user) {
      // User Override (higher priority)
      if (user.salesRateOverride !== null && salesRate === null) {
        salesRate = user.salesRateOverride
        salesRateSource = 'user-override'
      }
      if (user.costRateOverride !== null && costRate === null) {
        costRate = user.costRateOverride
        costRateSource = 'user-override'
      }

      // User Default (lower priority, only if override not set)
      if (user.defaultSalesRate !== null && salesRate === null) {
        salesRate = user.defaultSalesRate
        salesRateSource = 'user-default'
      }
      if (user.defaultCostRate !== null && costRate === null) {
        costRate = user.defaultCostRate
        costRateSource = 'user-default'
      }
    }
  }

  // 4. Fallback to Simplicate snapshot (lowest priority)
  if (simplicateTariff !== null && simplicateTariff !== undefined && salesRate === null) {
    salesRate = simplicateTariff
    salesRateSource = 'simplicate'
  }

  // Calculate financials
  const revenue = salesRate !== null ? hours * salesRate : null
  const cost = costRate !== null ? hours * costRate : null
  const margin = revenue !== null && cost !== null ? revenue - cost : null

  return {
    salesRate,
    costRate,
    salesRateSource,
    costRateSource,
    revenue,
    cost,
    margin,
  }
}

/**
 * Batch resolve rates for multiple hours entries
 * More efficient than calling resolveEffectiveRates for each entry
 */
export async function batchResolveRates(
  db: PrismaClient,
  entries: Array<{
    id: string
    userId: string
    projectId: string
    projectServiceId: string | null
    hours: number
    simplicateTariff?: number | null
  }>
): Promise<Map<string, ResolvedRates>> {
  // Get unique user IDs, project IDs, and service-user pairs
  const userIds = [...new Set(entries.map((e) => e.userId))]
  const projectIds = [...new Set(entries.map((e) => e.projectId))]
  const serviceUserPairs = entries
    .filter((e) => e.projectServiceId)
    .map((e) => ({ projectServiceId: e.projectServiceId!, userId: e.userId }))

  // Batch fetch all required data
  const [users, projectMembers, serviceEmployeeRates] = await Promise.all([
    db.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        salesRateOverride: true,
        costRateOverride: true,
        defaultSalesRate: true,
        defaultCostRate: true,
      },
    }),
    db.projectMember.findMany({
      where: {
        OR: entries.map((e) => ({ projectId: e.projectId, userId: e.userId })),
      },
    }),
    serviceUserPairs.length > 0
      ? db.serviceEmployeeRate.findMany({
          where: {
            OR: serviceUserPairs.map((p) => ({
              projectServiceId: p.projectServiceId,
              userId: p.userId,
            })),
          },
        })
      : Promise.resolve([]),
  ])

  // Create lookup maps
  const userMap = new Map(users.map((u) => [u.id, u]))
  const projectMemberMap = new Map(
    projectMembers.map((pm) => [`${pm.projectId}-${pm.userId}`, pm])
  )
  const serviceEmployeeRateMap = new Map(
    serviceEmployeeRates.map((ser) => [`${ser.projectServiceId}-${ser.userId}`, ser])
  )

  // Resolve rates for each entry
  const results = new Map<string, ResolvedRates>()

  for (const entry of entries) {
    let salesRate: number | null = null
    let costRate: number | null = null
    let salesRateSource: RateSource = 'none'
    let costRateSource: RateSource = 'none'

    // 1. Service-Employee Rate
    if (entry.projectServiceId) {
      const ser = serviceEmployeeRateMap.get(`${entry.projectServiceId}-${entry.userId}`)
      if (ser) {
        if (ser.salesRate !== null) {
          salesRate = ser.salesRate
          salesRateSource = 'service-employee'
        }
        if (ser.costRate !== null) {
          costRate = ser.costRate
          costRateSource = 'service-employee'
        }
      }
    }

    // 2. Project-Member Rate
    if (salesRate === null || costRate === null) {
      const pm = projectMemberMap.get(`${entry.projectId}-${entry.userId}`)
      if (pm) {
        if (pm.salesRate !== null && salesRate === null) {
          salesRate = pm.salesRate
          salesRateSource = 'project-member'
        }
        if (pm.costRate !== null && costRate === null) {
          costRate = pm.costRate
          costRateSource = 'project-member'
        }
      }
    }

    // 3 & 4. User Override and User Default
    const user = userMap.get(entry.userId)
    if (user) {
      if (user.salesRateOverride !== null && salesRate === null) {
        salesRate = user.salesRateOverride
        salesRateSource = 'user-override'
      }
      if (user.costRateOverride !== null && costRate === null) {
        costRate = user.costRateOverride
        costRateSource = 'user-override'
      }
      if (user.defaultSalesRate !== null && salesRate === null) {
        salesRate = user.defaultSalesRate
        salesRateSource = 'user-default'
      }
      if (user.defaultCostRate !== null && costRate === null) {
        costRate = user.defaultCostRate
        costRateSource = 'user-default'
      }
    }

    // 5. Simplicate snapshot
    if (entry.simplicateTariff !== null && entry.simplicateTariff !== undefined && salesRate === null) {
      salesRate = entry.simplicateTariff
      salesRateSource = 'simplicate'
    }

    // Calculate financials
    const revenue = salesRate !== null ? entry.hours * salesRate : null
    const cost = costRate !== null ? entry.hours * costRate : null
    const margin = revenue !== null && cost !== null ? revenue - cost : null

    results.set(entry.id, {
      salesRate,
      costRate,
      salesRateSource,
      costRateSource,
      revenue,
      cost,
      margin,
    })
  }

  return results
}

/**
 * Calculate purchase rate for co-owners
 * Default: 10% discount from sales rate
 */
export function calculatePurchaseRate(
  salesRate: number,
  discountPercent: number = 10
): number {
  return salesRate * (1 - discountPercent / 100)
}

/**
 * Get rate source display name
 */
export function getRateSourceLabel(source: RateSource): string {
  const labels: Record<RateSource, string> = {
    'service-employee': 'Service-Employee Override',
    'project-member': 'Project Override',
    'user-override': 'User Override',
    'user-default': 'Simplicate Default',
    simplicate: 'Hours Tariff',
    none: 'Not Set',
  }
  return labels[source]
}
