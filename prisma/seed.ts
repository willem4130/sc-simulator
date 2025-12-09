/**
 * Seed script for Supply Chain Scenario Simulator - Absolute Values Model
 *
 * Option 1: Direct input of absolute values
 * - INPUT: Omzet (euros), Voorraad (pallets), Aantal SKUs
 * - OUTPUT: Calculate percentages as derived values
 *
 * Creates:
 * - 1 Organization (RetailCo)
 * - 1 Admin User
 * - 3 Parameters (baseline values for comparison)
 * - 6 Variables (3 INPUT + 3 OUTPUT)
 * - 3 Scenarios with 7 years each (2025-2031)
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // 1. Create Organization
  const org = await prisma.organisatie.create({
    data: {
      name: 'RetailCo',
      slug: 'retailco',
      description: 'Supply chain scenario modeling with absolute values',
    },
  })
  console.log('✅ Created organization:', org.name)

  // 2. Create Admin User
  const user = await prisma.user.create({
    data: {
      email: 'admin@retailco.com',
      name: 'Admin User',
      role: 'ADMIN',
      organizationId: org.id,
    },
  })
  console.log('✅ Created user:', user.email)

  // 3. Create Parameters (baseline values for comparison)
  const parameters = await prisma.$transaction([
    prisma.parameter.create({
      data: {
        organizationId: org.id,
        name: 'PARAM_BASELINE_OMZET',
        displayName: 'Baseline Omzet',
        value: 1000000, // €1M baseline revenue
        category: 'BASELINE',
        unit: 'EUR',
        description: 'Baseline annual revenue for percentage calculations',
      },
    }),
    prisma.parameter.create({
      data: {
        organizationId: org.id,
        name: 'PARAM_BASELINE_VOORRAAD',
        displayName: 'Baseline Voorraad',
        value: 5000, // 5000 pallets baseline inventory
        category: 'BASELINE',
        unit: 'pallets',
        description: 'Baseline inventory level for percentage calculations',
      },
    }),
    prisma.parameter.create({
      data: {
        organizationId: org.id,
        name: 'PARAM_BASELINE_SKUS',
        displayName: 'Baseline SKUs',
        value: 6500, // 6500 SKUs baseline
        category: 'BASELINE',
        unit: 'aantal',
        description: 'Baseline number of SKUs for percentage calculations',
      },
    }),
  ])
  console.log('✅ Created 3 baseline parameters')

  // 4. Create 6 Variables (3 INPUT + 3 OUTPUT)
  const variables = await prisma.$transaction([
    // INPUT 1: Omzet (absolute euros)
    prisma.variable.create({
      data: {
        organizationId: org.id,
        name: 'INPUT_OMZET',
        displayName: 'Omzet',
        variableType: 'INPUT',
        category: 'BUSINESS',
        unit: 'EUR',
        description: 'Annual revenue in euros',
        formula: null,
        dependencies: [],
        displayOrder: 1,
      },
    }),
    // INPUT 2: Voorraad (absolute pallets)
    prisma.variable.create({
      data: {
        organizationId: org.id,
        name: 'INPUT_VOORRAAD',
        displayName: 'Voorraad',
        variableType: 'INPUT',
        category: 'VOORRAAD',
        unit: 'pallets',
        description: 'Inventory level in number of pallets',
        formula: null,
        dependencies: [],
        displayOrder: 2,
      },
    }),
    // INPUT 3: Aantal SKUs
    prisma.variable.create({
      data: {
        organizationId: org.id,
        name: 'INPUT_AANTAL_SKUS',
        displayName: 'Aantal SKUs',
        variableType: 'INPUT',
        category: 'BUSINESS',
        unit: 'aantal',
        description: 'Number of active SKUs',
        formula: null,
        dependencies: [],
        displayOrder: 3,
      },
    }),
    // OUTPUT 1: Omzet Percentage (derived)
    prisma.variable.create({
      data: {
        organizationId: org.id,
        name: 'OUTPUT_OMZET_PERCENTAGE',
        displayName: 'Omzet %',
        variableType: 'OUTPUT',
        category: 'BUSINESS',
        unit: '%',
        description: 'Revenue as percentage of baseline',
        formula: '(INPUT_OMZET / PARAM_BASELINE_OMZET) * 100',
        dependencies: ['INPUT_OMZET'],
        displayOrder: 4,
      },
    }),
    // OUTPUT 2: Voorraad Percentage (derived)
    prisma.variable.create({
      data: {
        organizationId: org.id,
        name: 'OUTPUT_VOORRAAD_PERCENTAGE',
        displayName: 'Voorraad %',
        variableType: 'OUTPUT',
        category: 'VOORRAAD',
        unit: '%',
        description: 'Inventory as percentage of baseline',
        formula: '(INPUT_VOORRAAD / PARAM_BASELINE_VOORRAAD) * 100',
        dependencies: ['INPUT_VOORRAAD'],
        displayOrder: 5,
      },
    }),
    // OUTPUT 3: SKU Growth (derived)
    prisma.variable.create({
      data: {
        organizationId: org.id,
        name: 'OUTPUT_SKU_GROWTH',
        displayName: 'SKU Groei %',
        variableType: 'OUTPUT',
        category: 'BUSINESS',
        unit: '%',
        description: 'SKU count as percentage of baseline',
        formula: '(INPUT_AANTAL_SKUS / PARAM_BASELINE_SKUS) * 100',
        dependencies: ['INPUT_AANTAL_SKUS'],
        displayOrder: 6,
      },
    }),
  ])
  console.log('✅ Created 6 variables (3 INPUT + 3 OUTPUT)')

  // Get variable IDs
  const allVars = await prisma.variable.findMany({
    where: { organizationId: org.id },
    select: { id: true, name: true },
  })
  const varMap = new Map(allVars.map((v) => [v.name, v.id]))

  // 5. Create 3 Scenarios
  const baselineScenario = await prisma.scenario.create({
    data: {
      organizationId: org.id,
      name: 'Baseline 2025',
      description: 'Benchmark year with flat projections',
      isBaseline: true,
      timePeriodType: 'YEARLY',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2031-12-31'),
    },
  })

  const scenarioA = await prisma.scenario.create({
    data: {
      organizationId: org.id,
      name: 'Optimalisatie A',
      description: 'Growth scenario: +5% revenue/year, -5% inventory/year, +500 SKUs/year',
      isBaseline: false,
      timePeriodType: 'YEARLY',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2031-12-31'),
    },
  })

  const scenarioB = await prisma.scenario.create({
    data: {
      organizationId: org.id,
      name: 'Groei B',
      description: 'Aggressive growth: +10% revenue/year, +10% inventory/year, +1500 SKUs/year',
      isBaseline: false,
      timePeriodType: 'YEARLY',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2031-12-31'),
    },
  })

  console.log('✅ Created 3 scenarios')

  // 6. Create VariableValues for all scenarios (7 years each: 2025-2031)
  const years = [2025, 2026, 2027, 2028, 2029, 2030, 2031]

  // Baseline values
  const BASELINE_OMZET = 1000000 // €1M
  const BASELINE_VOORRAAD = 5000 // 5000 pallets
  const BASELINE_SKUS = 6500 // 6500 SKUs

  // Helper to create values for a scenario
  const createValues = async (
    scenarioId: string,
    scenarioName: string,
    getValuesForYear: (year: number) => { omzet: number; voorraad: number; skus: number }
  ) => {
    const values = []
    for (const year of years) {
      const { omzet, voorraad, skus } = getValuesForYear(year)
      values.push(
        {
          scenarioId,
          variableId: varMap.get('INPUT_OMZET')!,
          value: omzet,
          periodStart: new Date(`${year}-01-01`),
          periodEnd: new Date(`${year}-12-31`),
        },
        {
          scenarioId,
          variableId: varMap.get('INPUT_VOORRAAD')!,
          value: voorraad,
          periodStart: new Date(`${year}-01-01`),
          periodEnd: new Date(`${year}-12-31`),
        },
        {
          scenarioId,
          variableId: varMap.get('INPUT_AANTAL_SKUS')!,
          value: skus,
          periodStart: new Date(`${year}-01-01`),
          periodEnd: new Date(`${year}-12-31`),
        }
      )
    }
    await prisma.variableValue.createMany({ data: values })
    console.log(`✅ Created ${values.length} variable values for ${scenarioName}`)
  }

  // Baseline: Flat projections (no growth)
  await createValues(baselineScenario.id, 'Baseline 2025', () => ({
    omzet: BASELINE_OMZET,
    voorraad: BASELINE_VOORRAAD,
    skus: BASELINE_SKUS,
  }))

  // Optimalisatie A: +5% revenue, -5% inventory, +500 SKUs per year
  await createValues(scenarioA.id, 'Optimalisatie A', (year) => {
    const yearsFromBaseline = year - 2025
    return {
      omzet: Math.round(BASELINE_OMZET * (1 + 0.05 * yearsFromBaseline)),
      voorraad: Math.round(BASELINE_VOORRAAD * (1 - 0.05 * yearsFromBaseline)),
      skus: BASELINE_SKUS + yearsFromBaseline * 500,
    }
  })

  // Groei B: +10% revenue, +10% inventory, +1500 SKUs per year
  await createValues(scenarioB.id, 'Groei B', (year) => {
    const yearsFromBaseline = year - 2025
    return {
      omzet: Math.round(BASELINE_OMZET * (1 + 0.1 * yearsFromBaseline)),
      voorraad: Math.round(BASELINE_VOORRAAD * (1 + 0.1 * yearsFromBaseline)),
      skus: BASELINE_SKUS + yearsFromBaseline * 1500,
    }
  })

  console.log('🎉 Seed complete!')
  console.log('')
  console.log('📊 Summary:')
  console.log('  - 1 Organization: RetailCo')
  console.log('  - 1 User: admin@retailco.com')
  console.log('  - 3 Baseline Parameters:')
  console.log(`    • PARAM_BASELINE_OMZET = €${BASELINE_OMZET.toLocaleString()}`)
  console.log(`    • PARAM_BASELINE_VOORRAAD = ${BASELINE_VOORRAAD} pallets`)
  console.log(`    • PARAM_BASELINE_SKUS = ${BASELINE_SKUS} SKUs`)
  console.log('  - 6 Variables:')
  console.log('    • INPUT_OMZET (EUR, absolute)')
  console.log('    • INPUT_VOORRAAD (pallets, absolute)')
  console.log('    • INPUT_AANTAL_SKUS (aantal, absolute)')
  console.log('    • OUTPUT_OMZET_PERCENTAGE (calculated)')
  console.log('    • OUTPUT_VOORRAAD_PERCENTAGE (calculated)')
  console.log('    • OUTPUT_SKU_GROWTH (calculated)')
  console.log('  - 3 Scenarios × 7 years × 3 inputs = 63 VariableValue records:')
  console.log('    1. Baseline 2025: Flat (€1M, 5000 pallets, 6500 SKUs)')
  console.log('    2. Optimalisatie A: Efficiency (+5% revenue/yr, -5% inventory/yr)')
  console.log('    3. Groei B: Aggressive growth (+10% revenue/yr, +10% inventory/yr)')
  console.log('')
  console.log('✅ Ready to test! Run calculations to see OUTPUT percentages.')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
