/**
 * Seed script for Supply Chain Scenario Simulator - Warehouse/Retail Model
 *
 * Creates:
 * - 1 Organization (RetailCo Warehouse)
 * - 1 Admin User
 * - 3 Parameters (warehouse constants)
 * - 10 INPUT Variables (core business + storage zones + network/logistics)
 * - 4 OUTPUT Variables (voorraad, pallets, capaciteit, picklocaties)
 * - 3 Scenarios (Baseline, Optimalisatie A, Groei B)
 * - INPUT VariableValues for each scenario
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // 1. Create Organization
  const org = await prisma.organisatie.create({
    data: {
      name: 'RetailCo Warehouse',
      slug: 'retailco-warehouse',
      description: 'Warehouse en DC scenario modeling voor retail netwerk',
    },
  })
  console.log('✅ Created organization:', org.name)

  // 2. Create Admin User
  const user = await prisma.user.create({
    data: {
      email: 'admin@retailco-warehouse.com',
      name: 'Warehouse Manager',
      role: 'ADMIN',
      organizationId: org.id,
    },
  })
  console.log('✅ Created user:', user.email)

  // 3. Create Parameters (warehouse constants)
  const params = await prisma.parameter.createMany({
    data: [
      {
        organizationId: org.id,
        name: 'PARAM_WAARDE_PER_PALLET',
        displayName: 'Gemiddelde Waarde per Pallet',
        value: 5000,
        category: 'VOORRAAD',
        unit: 'EUR',
        description: 'Gemiddelde waarde per pallet voor voorraadberekening',
      },
      {
        organizationId: org.id,
        name: 'PARAM_PICKLOCATIES_PER_SKU',
        displayName: 'Picklocaties per SKU',
        value: 1.2,
        category: 'CAPACITEIT',
        unit: 'ratio',
        description: 'Gemiddeld aantal picklocaties per SKU',
      },
      {
        organizationId: org.id,
        name: 'PARAM_M2_PER_PALLET',
        displayName: 'Vierkante Meters per Pallet',
        value: 1.44,
        category: 'CAPACITEIT',
        unit: 'm2',
        description: 'Vloeroppervlak per pallet (1.2m x 1.2m)',
      },
    ],
  })
  console.log('✅ Created', params.count, 'parameters')

  // 4. Create INPUT Variables (warehouse/retail model)
  const inputVars = await prisma.variable.createMany({
    data: [
      // Core Business Inputs
      {
        organizationId: org.id,
        name: 'INPUT_OMZET',
        displayName: 'Omzet',
        variableType: 'INPUT',
        category: 'BEDRIJF',
        unit: 'EUR',
        description: 'Jaarlijkse omzet',
        formula: null,
        dependencies: [],
      },
      {
        organizationId: org.id,
        name: 'INPUT_AANTAL_SKUS',
        displayName: 'Aantal SKUs',
        variableType: 'INPUT',
        category: 'BEDRIJF',
        unit: 'aantal',
        description: 'Aantal verschillende producten (SKUs)',
        formula: null,
        dependencies: [],
      },
      {
        organizationId: org.id,
        name: 'INPUT_WEKEN_VOORRAAD',
        displayName: 'Weken Voorraad',
        variableType: 'INPUT',
        category: 'VOORRAAD',
        unit: 'weken',
        description: 'Gewenste voorraad in weken',
        formula: null,
        dependencies: [],
      },
      // Storage Zone Inputs
      {
        organizationId: org.id,
        name: 'INPUT_VOLUMEPLEIN',
        displayName: 'Volumeplein',
        variableType: 'INPUT',
        category: 'OPSLAGZONE',
        unit: 'pallets',
        description: 'Volumeplein capaciteit',
        formula: null,
        dependencies: [],
      },
      {
        organizationId: org.id,
        name: 'INPUT_RACKING',
        displayName: 'Racking',
        variableType: 'INPUT',
        category: 'OPSLAGZONE',
        unit: 'pallets',
        description: 'Racking capaciteit',
        formula: null,
        dependencies: [],
      },
      {
        organizationId: org.id,
        name: 'INPUT_OVERIG',
        displayName: 'Overig',
        variableType: 'INPUT',
        category: 'OPSLAGZONE',
        unit: 'pallets',
        description: 'Overige opslagcapaciteit',
        formula: null,
        dependencies: [],
      },
      // Network & Logistics Inputs
      {
        organizationId: org.id,
        name: 'INPUT_AANTAL_WINKELS',
        displayName: 'Aantal Winkels',
        variableType: 'INPUT',
        category: 'NETWERK',
        unit: 'aantal',
        description: 'Aantal winkels in het netwerk',
        formula: null,
        dependencies: [],
      },
      {
        organizationId: org.id,
        name: 'INPUT_OMVANG_WINKELS',
        displayName: 'Omvang Winkels',
        variableType: 'INPUT',
        category: 'NETWERK',
        unit: 'm2',
        description: 'Gemiddelde omvang per winkel',
        formula: null,
        dependencies: [],
      },
      {
        organizationId: org.id,
        name: 'INPUT_UITLEVERFREQUENTIE',
        displayName: 'Uitleverfrequentie',
        variableType: 'INPUT',
        category: 'LOGISTIEK',
        unit: 'keer per week',
        description: 'Leverfrequentie naar winkels',
        formula: null,
        dependencies: [],
      },
      {
        organizationId: org.id,
        name: 'INPUT_SERVICELEVELS',
        displayName: 'Servicelevels',
        variableType: 'INPUT',
        category: 'LOGISTIEK',
        unit: 'percentage',
        description: 'Gewenste servicelevel (% on time)',
        formula: null,
        dependencies: [],
      },
    ],
  })
  console.log('✅ Created', inputVars.count, 'INPUT variables')

  // 5. Create OUTPUT Variables (warehouse calculations)
  const outputVars = await prisma.variable.createMany({
    data: [
      {
        organizationId: org.id,
        name: 'OUTPUT_VOORRAAD_ABSOLUUT',
        displayName: 'Voorraad Absoluut',
        variableType: 'OUTPUT',
        category: 'VOORRAAD',
        unit: 'EUR',
        description: 'Totale voorraadwaarde op basis van omzet en weken voorraad',
        formula: '(INPUT_OMZET / 52) * INPUT_WEKEN_VOORRAAD',
        dependencies: ['INPUT_OMZET', 'INPUT_WEKEN_VOORRAAD'],
      },
      {
        organizationId: org.id,
        name: 'OUTPUT_AANTAL_PALLETS',
        displayName: 'Aantal Pallets',
        variableType: 'OUTPUT',
        category: 'VOORRAAD',
        unit: 'pallets',
        description: 'Benodigde aantal pallets',
        formula: 'OUTPUT_VOORRAAD_ABSOLUUT / PARAM_WAARDE_PER_PALLET',
        dependencies: ['OUTPUT_VOORRAAD_ABSOLUUT'],
      },
      {
        organizationId: org.id,
        name: 'OUTPUT_TOTALE_OPSLAGCAPACITEIT',
        displayName: 'Totale Opslagcapaciteit',
        variableType: 'OUTPUT',
        category: 'CAPACITEIT',
        unit: 'pallets',
        description: 'Som van alle opslagzones',
        formula: 'INPUT_VOLUMEPLEIN + INPUT_RACKING + INPUT_OVERIG',
        dependencies: ['INPUT_VOLUMEPLEIN', 'INPUT_RACKING', 'INPUT_OVERIG'],
      },
      {
        organizationId: org.id,
        name: 'OUTPUT_AANTAL_PICKLOCATIES',
        displayName: 'Aantal Picklocaties',
        variableType: 'OUTPUT',
        category: 'CAPACITEIT',
        unit: 'aantal',
        description: 'Benodigde picklocaties op basis van SKUs',
        formula: 'INPUT_AANTAL_SKUS * PARAM_PICKLOCATIES_PER_SKU',
        dependencies: ['INPUT_AANTAL_SKUS'],
      },
    ],
  })
  console.log('✅ Created', outputVars.count, 'OUTPUT variables')

  // Get variable IDs for creating VariableValues
  const allVars = await prisma.variable.findMany({
    where: { organizationId: org.id },
    select: { id: true, name: true },
  })
  const varMap = new Map(allVars.map(v => [v.name, v.id]))

  // 6. Create Scenarios (warehouse configurations)
  const baselineScenario = await prisma.scenario.create({
    data: {
      organizationId: org.id,
      name: 'Baseline: Huidige Warehouse Configuratie',
      description: 'Huidige DC setup met standaard capaciteit en layout',
      isBaseline: true,
    },
  })
  console.log('✅ Created baseline scenario:', baselineScenario.name)

  const scenarioA = await prisma.scenario.create({
    data: {
      organizationId: org.id,
      name: 'Optimalisatie A: Verhoogde Efficiency',
      description: 'Hogere omzet door meer winkels, lagere voorraad door betere forecasting',
      isBaseline: false,
    },
  })
  console.log('✅ Created scenario A:', scenarioA.name)

  const scenarioB = await prisma.scenario.create({
    data: {
      organizationId: org.id,
      name: 'Groei B: Uitbreiding Capaciteit',
      description: 'Grote uitbreiding: meer voorraad, meer SKUs, grotere footprint',
      isBaseline: false,
    },
  })
  console.log('✅ Created scenario B:', scenarioB.name)

  // 7. Create VariableValues for Baseline Scenario
  await prisma.variableValue.createMany({
    data: [
      { scenarioId: baselineScenario.id, variableId: varMap.get('INPUT_OMZET')!, value: 359000000 },      // €359M
      { scenarioId: baselineScenario.id, variableId: varMap.get('INPUT_AANTAL_SKUS')!, value: 6500 },     // 6500 SKUs
      { scenarioId: baselineScenario.id, variableId: varMap.get('INPUT_WEKEN_VOORRAAD')!, value: 3.6 },   // 3.6 weeks
      { scenarioId: baselineScenario.id, variableId: varMap.get('INPUT_VOLUMEPLEIN')!, value: 4000 },     // 4000 pallets
      { scenarioId: baselineScenario.id, variableId: varMap.get('INPUT_RACKING')!, value: 8000 },         // 8000 pallets
      { scenarioId: baselineScenario.id, variableId: varMap.get('INPUT_OVERIG')!, value: 500 },           // 500 pallets
      { scenarioId: baselineScenario.id, variableId: varMap.get('INPUT_AANTAL_WINKELS')!, value: 360 },   // 360 stores
      { scenarioId: baselineScenario.id, variableId: varMap.get('INPUT_OMVANG_WINKELS')!, value: 500 },   // 500 m2
      { scenarioId: baselineScenario.id, variableId: varMap.get('INPUT_UITLEVERFREQUENTIE')!, value: 3 }, // 3x per week
      { scenarioId: baselineScenario.id, variableId: varMap.get('INPUT_SERVICELEVELS')!, value: 95 },     // 95%
    ],
  })
  console.log('✅ Created VariableValues for baseline scenario')

  // 8. Create VariableValues for Optimalisatie A
  await prisma.variableValue.createMany({
    data: [
      { scenarioId: scenarioA.id, variableId: varMap.get('INPUT_OMZET')!, value: 400000000 },      // €400M (+11%)
      { scenarioId: scenarioA.id, variableId: varMap.get('INPUT_AANTAL_SKUS')!, value: 7000 },     // 7000 SKUs (+500)
      { scenarioId: scenarioA.id, variableId: varMap.get('INPUT_WEKEN_VOORRAAD')!, value: 3.0 },   // 3.0 weeks (optimized)
      { scenarioId: scenarioA.id, variableId: varMap.get('INPUT_VOLUMEPLEIN')!, value: 3500 },     // 3500 pallets (reduced)
      { scenarioId: scenarioA.id, variableId: varMap.get('INPUT_RACKING')!, value: 9000 },         // 9000 pallets (increased)
      { scenarioId: scenarioA.id, variableId: varMap.get('INPUT_OVERIG')!, value: 500 },           // 500 pallets
      { scenarioId: scenarioA.id, variableId: varMap.get('INPUT_AANTAL_WINKELS')!, value: 400 },   // 400 stores (+40)
      { scenarioId: scenarioA.id, variableId: varMap.get('INPUT_OMVANG_WINKELS')!, value: 480 },   // 480 m2
      { scenarioId: scenarioA.id, variableId: varMap.get('INPUT_UITLEVERFREQUENTIE')!, value: 4 }, // 4x per week
      { scenarioId: scenarioA.id, variableId: varMap.get('INPUT_SERVICELEVELS')!, value: 97 },     // 97%
    ],
  })
  console.log('✅ Created VariableValues for Optimalisatie A scenario')

  // 9. Create VariableValues for Groei B
  await prisma.variableValue.createMany({
    data: [
      { scenarioId: scenarioB.id, variableId: varMap.get('INPUT_OMZET')!, value: 450000000 },      // €450M (+25%)
      { scenarioId: scenarioB.id, variableId: varMap.get('INPUT_AANTAL_SKUS')!, value: 8000 },     // 8000 SKUs (+1500)
      { scenarioId: scenarioB.id, variableId: varMap.get('INPUT_WEKEN_VOORRAAD')!, value: 4.2 },   // 4.2 weeks (more buffer)
      { scenarioId: scenarioB.id, variableId: varMap.get('INPUT_VOLUMEPLEIN')!, value: 5000 },     // 5000 pallets (expanded)
      { scenarioId: scenarioB.id, variableId: varMap.get('INPUT_RACKING')!, value: 12000 },        // 12000 pallets (large increase)
      { scenarioId: scenarioB.id, variableId: varMap.get('INPUT_OVERIG')!, value: 1000 },          // 1000 pallets (doubled)
      { scenarioId: scenarioB.id, variableId: varMap.get('INPUT_AANTAL_WINKELS')!, value: 450 },   // 450 stores (+90)
      { scenarioId: scenarioB.id, variableId: varMap.get('INPUT_OMVANG_WINKELS')!, value: 520 },   // 520 m2
      { scenarioId: scenarioB.id, variableId: varMap.get('INPUT_UITLEVERFREQUENTIE')!, value: 4 }, // 4x per week
      { scenarioId: scenarioB.id, variableId: varMap.get('INPUT_SERVICELEVELS')!, value: 98 },     // 98%
    ],
  })
  console.log('✅ Created VariableValues for Groei B scenario')

  console.log('🎉 Seed complete!')
  console.log('')
  console.log('📊 Summary:')
  console.log('  - 1 Organization: RetailCo Warehouse')
  console.log('  - 1 User: admin@retailco-warehouse.com')
  console.log('  - 3 Parameters (PARAM_WAARDE_PER_PALLET, PARAM_PICKLOCATIES_PER_SKU, PARAM_M2_PER_PALLET)')
  console.log('  - 10 INPUT Variables (Omzet, SKUs, Weken Voorraad, Storage Zones, Network, Logistics)')
  console.log('  - 4 OUTPUT Variables (Voorraad Absoluut, Aantal Pallets, Totale Opslagcapaciteit, Picklocaties)')
  console.log('  - 3 Scenarios:')
  console.log('    1. Baseline: Huidige Warehouse Configuratie (€359M, 6500 SKUs, 12,500 pallet capacity)')
  console.log('    2. Optimalisatie A: Verhoogde Efficiency (€400M, 7000 SKUs, 13,000 pallet capacity)')
  console.log('    3. Groei B: Uitbreiding Capaciteit (€450M, 8000 SKUs, 18,000 pallet capacity)')
  console.log('')
  console.log('🧮 Expected Results (after running calculations):')
  console.log('  Baseline:       ~4,975 pallets needed, 12,500 capacity (40% utilization), 7,800 picklocaties')
  console.log('  Optimalisatie A: ~4,615 pallets needed, 13,000 capacity (35% utilization), 8,400 picklocaties')
  console.log('  Groei B:        ~7,385 pallets needed, 18,000 capacity (41% utilization), 9,600 picklocaties')
  console.log('')
  console.log('Next: Run calculations using tRPC endpoint (calculation.run)')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
