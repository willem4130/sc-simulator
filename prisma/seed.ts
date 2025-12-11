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

  // 1. Find or Create Organization
  let org = await prisma.organisatie.findUnique({
    where: { slug: 'retailco' },
  })

  if (!org) {
    org = await prisma.organisatie.create({
      data: {
        name: 'RetailCo',
        slug: 'retailco',
        description: 'Supply chain scenario modeling with voorraad calculation',
      },
    })
    console.log('✅ Created organization:', org.name)
  } else {
    console.log('✅ Found existing organization:', org.name)
  }

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

  // 5. Create SKU Effect Curves (lookup table for SKU complexity)
  const skuEffectRanges = [
    { start: 0, multiplier: 1.0, desc: '0-50 SKUs: Linear (baseline)' },
    { start: 50, multiplier: 1.01, desc: '50-100 SKUs: +1% complexity' },
    { start: 100, multiplier: 1.02, desc: '100-150 SKUs: +2% complexity' },
    { start: 150, multiplier: 1.03, desc: '150-200 SKUs: +3% complexity' },
    { start: 200, multiplier: 1.05, desc: '200-250 SKUs: +5% complexity' },
    { start: 250, multiplier: 1.07, desc: '250+ SKUs: +7% complexity' },
    { start: 6500, multiplier: 1.0, desc: '6500-6550 SKUs: Baseline for current data' },
    { start: 6550, multiplier: 1.01, desc: '6550-6600 SKUs: +1% complexity' },
    { start: 6600, multiplier: 1.02, desc: '6600-6650 SKUs: +2% complexity' },
    { start: 6650, multiplier: 1.03, desc: '6650-6700 SKUs: +3% complexity' },
    { start: 6700, multiplier: 1.05, desc: '6700-6750 SKUs: +5% complexity' },
    { start: 6750, multiplier: 1.07, desc: '6750-6800 SKUs: +7% complexity' },
    { start: 6800, multiplier: 1.10, desc: '6800-6850 SKUs: +10% complexity' },
    { start: 6850, multiplier: 1.12, desc: '6850-6900 SKUs: +12% complexity' },
    { start: 6900, multiplier: 1.15, desc: '6900-6950 SKUs: +15% complexity' },
    { start: 6950, multiplier: 1.18, desc: '6950-7000 SKUs: +18% complexity' },
    { start: 7000, multiplier: 1.20, desc: '7000-7050 SKUs: +20% complexity' },
    { start: 7050, multiplier: 1.22, desc: '7050-7100 SKUs: +22% complexity' },
    { start: 7100, multiplier: 1.25, desc: '7100-7150 SKUs: +25% complexity' },
    { start: 7150, multiplier: 1.28, desc: '7150-7200 SKUs: +28% complexity' },
    { start: 7200, multiplier: 1.30, desc: '7200-7250 SKUs: +30% complexity' },
    { start: 7250, multiplier: 1.32, desc: '7250-7300 SKUs: +32% complexity' },
    { start: 7300, multiplier: 1.35, desc: '7300-7350 SKUs: +35% complexity' },
    { start: 7350, multiplier: 1.38, desc: '7350-7400 SKUs: +38% complexity' },
    { start: 7400, multiplier: 1.40, desc: '7400-7450 SKUs: +40% complexity' },
    { start: 7450, multiplier: 1.42, desc: '7450-7500 SKUs: +42% complexity' },
    { start: 7500, multiplier: 1.45, desc: '7500-7550 SKUs: +45% complexity' },
    { start: 7550, multiplier: 1.48, desc: '7550+ SKUs: +48% complexity' },
  ]

  await prisma.skuEffectCurve.createMany({
    data: skuEffectRanges.map((range) => ({
      organizationId: org.id,
      skuRangeStart: range.start,
      effectMultiplier: range.multiplier,
      description: range.desc,
    })),
  })
  console.log(`✅ Created ${skuEffectRanges.length} SKU effect curve entries`)

  // 6. Create Variables (7 INPUT + 5 OUTPUT = 12 total)
  const variables = await prisma.$transaction([
    // INPUT 1: Omzet (absolute euros - for projection years)
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
    // INPUT 2: Voorraad in Weken (absolute weeks - for projection years)
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
    // INPUT 3: Aantal SKUs (for projection years)
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

    // ===== BASELINE INPUTS (Benchmark Year 2025) =====
    // INPUT 4: Baseline Voorraad (Pallets) - Benchmark year only
    prisma.variable.create({
      data: {
        organizationId: org.id,
        name: 'INPUT_BASELINE_VOORRAAD',
        displayName: 'Baseline Voorraad (Pallets)',
        variableType: 'INPUT',
        category: 'VOORRAAD',
        unit: 'pallets',
        description: 'Benchmark year inventory in pallets (used as baseline for all calculations)',
        formula: null,
        dependencies: [],
        displayOrder: 9,
      },
    }),
    // INPUT 5: Baseline Omzet - Benchmark year only
    prisma.variable.create({
      data: {
        organizationId: org.id,
        name: 'INPUT_BASELINE_OMZET',
        displayName: 'Baseline Omzet (EUR)',
        variableType: 'INPUT',
        category: 'BUSINESS',
        unit: 'EUR',
        description: 'Benchmark year revenue (used to calculate percentages)',
        formula: null,
        dependencies: [],
        displayOrder: 10,
      },
    }),
    // INPUT 6: Baseline SKUs - Benchmark year only
    prisma.variable.create({
      data: {
        organizationId: org.id,
        name: 'INPUT_BASELINE_SKUS',
        displayName: 'Baseline Aantal SKUs',
        variableType: 'INPUT',
        category: 'BUSINESS',
        unit: 'aantal',
        description: 'Benchmark year SKU count (used to calculate percentages)',
        formula: null,
        dependencies: [],
        displayOrder: 11,
      },
    }),
    // INPUT 7: Baseline Voorraad Weken - Benchmark year only
    prisma.variable.create({
      data: {
        organizationId: org.id,
        name: 'INPUT_BASELINE_VOORRAAD_WEKEN',
        displayName: 'Baseline Voorraad in Weken',
        variableType: 'INPUT',
        category: 'VOORRAAD',
        unit: 'weken',
        description: 'Benchmark year inventory weeks (used to calculate percentages)',
        formula: null,
        dependencies: [],
        displayOrder: 12,
      },
    }),
    // ===== OUTPUT VARIABLES =====
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
        formula: '(INPUT_OMZET / INPUT_BASELINE_OMZET) * 100',
        dependencies: ['INPUT_OMZET', 'INPUT_BASELINE_OMZET'],
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
        formula: '(INPUT_AANTAL_SKUS / INPUT_BASELINE_SKUS) * 100',
        dependencies: ['INPUT_AANTAL_SKUS', 'INPUT_BASELINE_SKUS'],
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
        formula: '(INPUT_VOORRAAD_IN_WEKEN / INPUT_BASELINE_VOORRAAD_WEKEN) * 100',
        dependencies: ['INPUT_VOORRAAD_IN_WEKEN', 'INPUT_BASELINE_VOORRAAD_WEKEN'],
        displayOrder: 6,
      },
    }),
    // OUTPUT 4: SKU Complexity Factor (from lookup table)
    prisma.variable.create({
      data: {
        organizationId: org.id,
        name: 'OUTPUT_SKU_COMPLEXITY_FACTOR',
        displayName: 'SKU Complexity Factor',
        variableType: 'OUTPUT',
        category: 'BUSINESS',
        unit: 'multiplier',
        description: 'SKU complexity multiplier from lookup table (e.g., 1.0 = linear, 1.15 = +15% complexity)',
        formula: 'SKU_LOOKUP(INPUT_AANTAL_SKUS)',
        dependencies: ['INPUT_AANTAL_SKUS'],
        displayOrder: 7,
      },
    }),
    // OUTPUT 5: Voorraad in Pallets (CALCULATED - the main output with SKU complexity!)
    prisma.variable.create({
      data: {
        organizationId: org.id,
        name: 'OUTPUT_VOORRAAD_PALLETS',
        displayName: 'Voorraad (Pallets)',
        variableType: 'OUTPUT',
        category: 'VOORRAAD',
        unit: 'pallets',
        description: 'Calculated inventory in pallets with SKU complexity: BASELINE_VOORRAAD * (Omzet%/100) * (SKU%/100) * (Weken%/100) * SKU_COMPLEXITY_FACTOR',
        formula: 'INPUT_BASELINE_VOORRAAD * (OUTPUT_OMZET_PERCENTAGE / 100) * (OUTPUT_SKU_GROWTH / 100) * (OUTPUT_VOORRAAD_WEKEN_PERCENTAGE / 100) * OUTPUT_SKU_COMPLEXITY_FACTOR',
        dependencies: ['INPUT_BASELINE_VOORRAAD', 'OUTPUT_OMZET_PERCENTAGE', 'OUTPUT_SKU_GROWTH', 'OUTPUT_VOORRAAD_WEKEN_PERCENTAGE', 'OUTPUT_SKU_COMPLEXITY_FACTOR'],
        displayOrder: 8,
      },
    }),
  ])
  console.log('✅ Created 12 variables (7 INPUT + 5 OUTPUT)')

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

  // Baseline values (used for benchmark year 2025)
  const BASELINE_OMZET = 1000000 // €1M
  const BASELINE_VOORRAAD_WEKEN = 4 // 4 weeks coverage
  const BASELINE_SKUS = 6500 // 6500 SKUs
  const BASELINE_VOORRAAD_PALLETS = 8500 // 8500 pallets

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

  // Helper to create baseline INPUT values (only for 2025 benchmark year)
  const createBaselineInputs = async (scenarioId: string, scenarioName: string) => {
    const baselineValues = [
      {
        scenarioId,
        variableId: varMap.get('INPUT_BASELINE_VOORRAAD')!,
        value: BASELINE_VOORRAAD_PALLETS,
        periodStart: new Date('2025-01-01'),
        periodEnd: new Date('2025-12-31'),
      },
      {
        scenarioId,
        variableId: varMap.get('INPUT_BASELINE_OMZET')!,
        value: BASELINE_OMZET,
        periodStart: new Date('2025-01-01'),
        periodEnd: new Date('2025-12-31'),
      },
      {
        scenarioId,
        variableId: varMap.get('INPUT_BASELINE_SKUS')!,
        value: BASELINE_SKUS,
        periodStart: new Date('2025-01-01'),
        periodEnd: new Date('2025-12-31'),
      },
      {
        scenarioId,
        variableId: varMap.get('INPUT_BASELINE_VOORRAAD_WEKEN')!,
        value: BASELINE_VOORRAAD_WEKEN,
        periodStart: new Date('2025-01-01'),
        periodEnd: new Date('2025-12-31'),
      },
    ]
    await prisma.variableValue.createMany({ data: baselineValues })
    console.log(`✅ Created 4 baseline input values for ${scenarioName}`)
  }

  // Baseline: Flat projections (no growth)
  await createValues(baselineScenario.id, 'Baseline 2025', () => ({
    omzet: BASELINE_OMZET,
    voorraadWeken: BASELINE_VOORRAAD_WEKEN,
    skus: BASELINE_SKUS,
  }))
  await createBaselineInputs(baselineScenario.id, 'Baseline 2025')

  // Optimalisatie A: +5% revenue, -10% inventory weeks, stable SKUs per year
  await createValues(scenarioA.id, 'Optimalisatie A', (year) => {
    const yearsFromBaseline = year - 2025
    return {
      omzet: Math.round(BASELINE_OMZET * (1 + 0.05 * yearsFromBaseline)),
      voorraadWeken: Math.max(1, BASELINE_VOORRAAD_WEKEN * (1 - 0.1 * yearsFromBaseline)), // Don't go below 1 week
      skus: BASELINE_SKUS, // Stable
    }
  })
  await createBaselineInputs(scenarioA.id, 'Optimalisatie A')

  // Groei B: +10% revenue, stable weeks, +1000 SKUs per year
  await createValues(scenarioB.id, 'Groei B', (year) => {
    const yearsFromBaseline = year - 2025
    return {
      omzet: Math.round(BASELINE_OMZET * (1 + 0.1 * yearsFromBaseline)),
      voorraadWeken: BASELINE_VOORRAAD_WEKEN, // Stable
      skus: BASELINE_SKUS + yearsFromBaseline * 1000,
    }
  })
  await createBaselineInputs(scenarioB.id, 'Groei B')

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
