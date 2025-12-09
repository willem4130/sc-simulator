/**
 * Seed script for Supply Chain Scenario Simulator - Simplified Percentage Model
 *
 * Creates:
 * - 1 Organization (RetailCo)
 * - 1 Admin User
 * - 1 Parameter (PARAM_BENCHMARK_PALLETS)
 * - 4 Variables (3 INPUT + 1 OUTPUT)
 * - 70 SKU Effect Curves (6500-10000 in steps of 50)
 * - 3 Scenarios with 7 years each (2025-2031) = 63 VariableValue records
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
      description: 'Supply chain scenario modeling with SKU effect curves',
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

  // 3. Create Parameter (benchmark pallets)
  const param = await prisma.parameter.create({
    data: {
      organizationId: org.id,
      name: 'PARAM_BENCHMARK_PALLETS',
      displayName: 'Benchmark Pallets',
      value: 4975,
      category: 'BENCHMARK',
      unit: 'pallets',
      description: 'Baseline pallet count for percentage calculations',
    },
  })
  console.log('✅ Created parameter:', param.name)

  // 4. Create 4 Variables (3 INPUT + 1 OUTPUT)
  const variables = await prisma.$transaction([
    // INPUT 1: Omzet Percentage
    prisma.variable.create({
      data: {
        organizationId: org.id,
        name: 'INPUT_OMZET_PERCENTAGE',
        displayName: 'Omzet %',
        variableType: 'INPUT',
        category: 'BUSINESS',
        unit: '%',
        description: 'Revenue percentage change vs benchmark (100 = no change)',
        formula: null,
        dependencies: [],
        displayOrder: 1,
      },
    }),
    // INPUT 2: Voorraad Percentage
    prisma.variable.create({
      data: {
        organizationId: org.id,
        name: 'INPUT_VOORRAAD_PERCENTAGE',
        displayName: 'Voorraad %',
        variableType: 'INPUT',
        category: 'VOORRAAD',
        unit: '%',
        description: 'Inventory weeks percentage change vs benchmark (100 = no change)',
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
        description: 'Number of SKUs (for effect curve lookup)',
        formula: null,
        dependencies: [],
        displayOrder: 3,
      },
    }),
    // OUTPUT: Pallets
    prisma.variable.create({
      data: {
        organizationId: org.id,
        name: 'OUTPUT_PALLETS',
        displayName: 'Pallets',
        variableType: 'OUTPUT',
        category: 'VOORRAAD',
        unit: 'pallets',
        description: 'Calculated pallets using: BENCHMARK * (omzet%/100) * SKU_EFFECT * (voorraad%/100)',
        formula: 'PARAM_BENCHMARK_PALLETS * (INPUT_OMZET_PERCENTAGE / 100) * (INPUT_VOORRAAD_PERCENTAGE / 100)',
        dependencies: ['INPUT_OMZET_PERCENTAGE', 'INPUT_VOORRAAD_PERCENTAGE'],
        displayOrder: 4,
      },
    }),
  ])
  console.log('✅ Created 4 variables (3 INPUT + 1 OUTPUT)')

  // Get variable IDs
  const allVars = await prisma.variable.findMany({
    where: { organizationId: org.id },
    select: { id: true, name: true },
  })
  const varMap = new Map(allVars.map((v) => [v.name, v.id]))

  // 5. Create 70 SKU Effect Curves (6500-10000 in steps of 50)
  const skuCurves = []
  for (let sku = 6500; sku <= 10000; sku += 50) {
    skuCurves.push({
      organizationId: org.id,
      skuRangeStart: sku,
      effectMultiplier: 1.0, // Linear by default
      description: `SKU range ${sku}-${sku + 49}`,
    })
  }
  await prisma.skuEffectCurve.createMany({ data: skuCurves })
  console.log('✅ Created 70 SKU effect curves (6500-10000)')

  // 6. Create 3 Scenarios
  const baselineScenario = await prisma.scenario.create({
    data: {
      organizationId: org.id,
      name: 'Baseline 2025',
      description: 'Benchmark year with flat projections',
      isBaseline: true,
      timePeriodType: 'YEARLY',
    },
  })

  const scenarioA = await prisma.scenario.create({
    data: {
      organizationId: org.id,
      name: 'Optimalisatie A',
      description: 'Growth scenario: +5% omzet, -5% voorraad, +500 SKUs',
      isBaseline: false,
      timePeriodType: 'YEARLY',
    },
  })

  const scenarioB = await prisma.scenario.create({
    data: {
      organizationId: org.id,
      name: 'Groei B',
      description: 'Aggressive growth: +10% omzet, +10% voorraad, +1500 SKUs',
      isBaseline: false,
      timePeriodType: 'YEARLY',
    },
  })

  console.log('✅ Created 3 scenarios')

  // 7. Create VariableValues for all scenarios (7 years each: 2025-2031)
  const years = [2025, 2026, 2027, 2028, 2029, 2030, 2031]

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
          variableId: varMap.get('INPUT_OMZET_PERCENTAGE')!,
          value: omzet,
          periodStart: new Date(`${year}-01-01`),
        },
        {
          scenarioId,
          variableId: varMap.get('INPUT_VOORRAAD_PERCENTAGE')!,
          value: voorraad,
          periodStart: new Date(`${year}-01-01`),
        },
        {
          scenarioId,
          variableId: varMap.get('INPUT_AANTAL_SKUS')!,
          value: skus,
          periodStart: new Date(`${year}-01-01`),
        }
      )
    }
    await prisma.variableValue.createMany({ data: values })
    console.log(`✅ Created ${values.length} variable values for ${scenarioName}`)
  }

  // Baseline: Flat projections (100%, 100%, 6500 SKUs)
  await createValues(baselineScenario.id, 'Baseline', () => ({
    omzet: 100,
    voorraad: 100,
    skus: 6500,
  }))

  // Optimalisatie A: +5% omzet, -5% voorraad, +500 SKUs per year after 2025
  await createValues(scenarioA.id, 'Optimalisatie A', (year) => {
    const yearsFromBaseline = year - 2025
    return {
      omzet: 100 + yearsFromBaseline * 5,
      voorraad: 100 - yearsFromBaseline * 5,
      skus: 6500 + yearsFromBaseline * 500,
    }
  })

  // Groei B: +10% omzet, +10% voorraad, +1500 SKUs per year after 2025
  await createValues(scenarioB.id, 'Groei B', (year) => {
    const yearsFromBaseline = year - 2025
    return {
      omzet: 100 + yearsFromBaseline * 10,
      voorraad: 100 + yearsFromBaseline * 10,
      skus: 6500 + yearsFromBaseline * 1500,
    }
  })

  console.log('🎉 Seed complete!')
  console.log('')
  console.log('📊 Summary:')
  console.log('  - 1 Organization: RetailCo')
  console.log('  - 1 User: admin@retailco.com')
  console.log('  - 1 Parameter: PARAM_BENCHMARK_PALLETS = 4975')
  console.log('  - 4 Variables:')
  console.log('    • INPUT_OMZET_PERCENTAGE (%, benchmark = 100)')
  console.log('    • INPUT_VOORRAAD_PERCENTAGE (%, benchmark = 100)')
  console.log('    • INPUT_AANTAL_SKUS (aantal, benchmark = 6500)')
  console.log('    • OUTPUT_PALLETS (calculated)')
  console.log('  - 70 SKU Effect Curves (6500-10000, all at 1.0 multiplier)')
  console.log('  - 3 Scenarios × 7 years = 63 VariableValue records:')
  console.log('    1. Baseline 2025: Flat (100%, 100%, 6500 SKUs)')
  console.log('    2. Optimalisatie A: Growth (+5%/yr omzet, -5%/yr voorraad, +500 SKUs/yr)')
  console.log('    3. Groei B: Aggressive (+10%/yr omzet, +10%/yr voorraad, +1500 SKUs/yr)')
  console.log('')
  console.log('Next: Build UI components for scenario value input')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
