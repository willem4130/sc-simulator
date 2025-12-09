/**
 * Seed script for Supply Chain Scenario Simulator - Corrected Model
 *
 * Data Model:
 * - INPUTS: Omzet (EUR), Voorraad in Weken (weeks), Aantal SKUs (number)
 * - PARAMETERS: Baseline values (€1M revenue, 10000 pallets, 6500 SKUs, 4 weeks coverage)
 * - OUTPUTS: Calculated percentages + Voorraad in Pallets (calculated)
 *
 * Formula: OUTPUT_VOORRAAD_PALLETS = BASELINE_VOORRAAD * (Omzet%/100) * (SKU%/100) * (Weken%/100)
 *
 * Creates:
 * - 1 Organization (RetailCo)
 * - 1 Admin User
 * - 1 Project (Supply Chain NL)
 * - 4 Parameters (baseline values)
 * - 7 Variables (3 INPUT + 4 OUTPUT)
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
      description: 'Supply chain scenario modeling with voorraad calculation',
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

  // 3. Create Project
  const project = await prisma.project.create({
    data: {
      organizationId: org.id,
      name: 'Supply Chain NL',
      description: 'Dutch supply chain optimization project',
      tags: ['supply-chain', 'netherlands', 'voorraad'],
      status: 'ACTIVE',
    },
  })
  console.log('✅ Created project:', project.name)

  // 4. Create Parameters (baseline values for comparison)
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
        value: 10000, // 10000 pallets baseline inventory (starting value for benchmark year)
        category: 'BASELINE',
        unit: 'pallets',
        description: 'Starting inventory level for benchmark year (used in voorraad calculation)',
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
    prisma.parameter.create({
      data: {
        organizationId: org.id,
        name: 'PARAM_BASELINE_VOORRAAD_WEKEN',
        displayName: 'Baseline Voorraad Weken',
        value: 4, // 4 weeks baseline coverage
        category: 'BASELINE',
        unit: 'weken',
        description: 'Baseline inventory coverage in weeks for percentage calculations',
      },
    }),
  ])
  console.log('✅ Created 4 baseline parameters')

  // 5. Create 7 Variables (3 INPUT + 4 OUTPUT)
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
    // INPUT 2: Voorraad in Weken (absolute weeks)
    prisma.variable.create({
      data: {
        organizationId: org.id,
        name: 'INPUT_VOORRAAD_IN_WEKEN',
        displayName: 'Voorraad in Weken',
        variableType: 'INPUT',
        category: 'VOORRAAD',
        unit: 'weken',
        description: 'Inventory coverage in weeks',
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
    // OUTPUT 2: SKU Growth (derived)
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
        displayOrder: 5,
      },
    }),
    // OUTPUT 3: Voorraad Weken Percentage (derived)
    prisma.variable.create({
      data: {
        organizationId: org.id,
        name: 'OUTPUT_VOORRAAD_WEKEN_PERCENTAGE',
        displayName: 'Voorraad Weken %',
        variableType: 'OUTPUT',
        category: 'VOORRAAD',
        unit: '%',
        description: 'Inventory weeks as percentage of baseline',
        formula: '(INPUT_VOORRAAD_IN_WEKEN / PARAM_BASELINE_VOORRAAD_WEKEN) * 100',
        dependencies: ['INPUT_VOORRAAD_IN_WEKEN'],
        displayOrder: 6,
      },
    }),
    // OUTPUT 4: Voorraad in Pallets (CALCULATED - the main output!)
    prisma.variable.create({
      data: {
        organizationId: org.id,
        name: 'OUTPUT_VOORRAAD_PALLETS',
        displayName: 'Voorraad (Pallets)',
        variableType: 'OUTPUT',
        category: 'VOORRAAD',
        unit: 'pallets',
        description: 'Calculated inventory in pallets: BASELINE_VOORRAAD * (Omzet%/100) * (SKU%/100) * (Weken%/100)',
        formula: 'PARAM_BASELINE_VOORRAAD * (OUTPUT_OMZET_PERCENTAGE / 100) * (OUTPUT_SKU_GROWTH / 100) * (OUTPUT_VOORRAAD_WEKEN_PERCENTAGE / 100)',
        dependencies: ['OUTPUT_OMZET_PERCENTAGE', 'OUTPUT_SKU_GROWTH', 'OUTPUT_VOORRAAD_WEKEN_PERCENTAGE'],
        displayOrder: 7,
      },
    }),
  ])
  console.log('✅ Created 7 variables (3 INPUT + 4 OUTPUT)')

  // Get variable IDs
  const allVars = await prisma.variable.findMany({
    where: { organizationId: org.id },
    select: { id: true, name: true },
  })
  const varMap = new Map(allVars.map((v) => [v.name, v.id]))

  // 6. Create 3 Scenarios (all linked to the project)
  const baselineScenario = await prisma.scenario.create({
    data: {
      organizationId: org.id,
      projectId: project.id,
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
      projectId: project.id,
      name: 'Optimalisatie A',
      description: 'Efficiency scenario: +5% revenue/year, -10% inventory weeks/year, stable SKUs',
      isBaseline: false,
      timePeriodType: 'YEARLY',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2031-12-31'),
    },
  })

  const scenarioB = await prisma.scenario.create({
    data: {
      organizationId: org.id,
      projectId: project.id,
      name: 'Groei B',
      description: 'Growth scenario: +10% revenue/year, stable inventory weeks, +1000 SKUs/year',
      isBaseline: false,
      timePeriodType: 'YEARLY',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2031-12-31'),
    },
  })

  console.log('✅ Created 3 scenarios (all in Supply Chain NL project)')

  // 7. Create VariableValues for all scenarios (7 years each: 2025-2031)
  const years = [2025, 2026, 2027, 2028, 2029, 2030, 2031]

  // Baseline values
  const BASELINE_OMZET = 1000000 // €1M
  const BASELINE_VOORRAAD_WEKEN = 4 // 4 weeks coverage
  const BASELINE_SKUS = 6500 // 6500 SKUs

  // Helper to create values for a scenario
  const createValues = async (
    scenarioId: string,
    scenarioName: string,
    getValuesForYear: (year: number) => { omzet: number; voorraadWeken: number; skus: number }
  ) => {
    const values = []
    for (const year of years) {
      const { omzet, voorraadWeken, skus } = getValuesForYear(year)
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
          variableId: varMap.get('INPUT_VOORRAAD_IN_WEKEN')!,
          value: voorraadWeken,
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
    voorraadWeken: BASELINE_VOORRAAD_WEKEN,
    skus: BASELINE_SKUS,
  }))

  // Optimalisatie A: +5% revenue, -10% inventory weeks, stable SKUs per year
  await createValues(scenarioA.id, 'Optimalisatie A', (year) => {
    const yearsFromBaseline = year - 2025
    return {
      omzet: Math.round(BASELINE_OMZET * (1 + 0.05 * yearsFromBaseline)),
      voorraadWeken: Math.max(1, BASELINE_VOORRAAD_WEKEN * (1 - 0.1 * yearsFromBaseline)), // Don't go below 1 week
      skus: BASELINE_SKUS, // Stable
    }
  })

  // Groei B: +10% revenue, stable weeks, +1000 SKUs per year
  await createValues(scenarioB.id, 'Groei B', (year) => {
    const yearsFromBaseline = year - 2025
    return {
      omzet: Math.round(BASELINE_OMZET * (1 + 0.1 * yearsFromBaseline)),
      voorraadWeken: BASELINE_VOORRAAD_WEKEN, // Stable
      skus: BASELINE_SKUS + yearsFromBaseline * 1000,
    }
  })

  console.log('🎉 Seed complete!')
  console.log('')
  console.log('📊 Summary:')
  console.log('  - 1 Organization: RetailCo')
  console.log('  - 1 User: admin@retailco.com')
  console.log('  - 1 Project: Supply Chain NL')
  console.log('  - 4 Baseline Parameters:')
  console.log(`    • PARAM_BASELINE_OMZET = €${BASELINE_OMZET.toLocaleString()}`)
  console.log(`    • PARAM_BASELINE_VOORRAAD = 10,000 pallets (starting value for benchmark)`)
  console.log(`    • PARAM_BASELINE_SKUS = ${BASELINE_SKUS} SKUs`)
  console.log(`    • PARAM_BASELINE_VOORRAAD_WEKEN = ${BASELINE_VOORRAAD_WEKEN} weeks`)
  console.log('  - 7 Variables:')
  console.log('    INPUTS (3):')
  console.log('      • INPUT_OMZET (EUR, absolute)')
  console.log('      • INPUT_VOORRAAD_IN_WEKEN (weeks, absolute)')
  console.log('      • INPUT_AANTAL_SKUS (aantal, absolute)')
  console.log('    OUTPUTS (4):')
  console.log('      • OUTPUT_OMZET_PERCENTAGE (calculated %)')
  console.log('      • OUTPUT_SKU_GROWTH (calculated %)')
  console.log('      • OUTPUT_VOORRAAD_WEKEN_PERCENTAGE (calculated %)')
  console.log('      • OUTPUT_VOORRAAD_PALLETS (calculated pallets) ⭐ MAIN OUTPUT')
  console.log('  - 3 Scenarios × 7 years × 3 inputs = 63 VariableValue records:')
  console.log('    1. Baseline 2025: Flat (€1M, 4 weeks, 6500 SKUs)')
  console.log('    2. Optimalisatie A: Efficiency (+5% revenue/yr, -10% weeks/yr, stable SKUs)')
  console.log('    3. Groei B: Growth (+10% revenue/yr, stable weeks, +1000 SKUs/yr)')
  console.log('')
  console.log('✅ Ready to test! Run calculations to see OUTPUT_VOORRAAD_PALLETS.')
  console.log('')
  console.log('Formula: OUTPUT_VOORRAAD_PALLETS = 10000 * (Omzet%/100) * (SKU%/100) * (Weken%/100)')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
