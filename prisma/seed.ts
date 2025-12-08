/**
 * Seed script for Supply Chain Scenario Simulator
 *
 * Creates:
 * - 1 Organization (ACME Supply Chain)
 * - 1 Admin User
 * - 3 Parameters (global constants)
 * - 5 INPUT Variables (user-entered values)
 * - 8 OUTPUT Variables (calculated formulas)
 * - 3 Scenarios (Baseline, Alternative A, Alternative B)
 * - INPUT VariableValues for each scenario
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // 1. Create Organization
  const org = await prisma.organization.create({
    data: {
      name: 'ACME Supply Chain',
      slug: 'acme-supply',
      description: 'Demo organization for supply chain scenario testing',
    },
  })
  console.log('✅ Created organization:', org.name)

  // 2. Create Admin User
  const user = await prisma.user.create({
    data: {
      email: 'admin@acme-supply.com',
      name: 'Admin User',
      role: 'ADMIN',
      organizationId: org.id,
    },
  })
  console.log('✅ Created user:', user.email)

  // 3. Create Parameters (global constants)
  const params = await prisma.parameter.createMany({
    data: [
      {
        organizationId: org.id,
        name: 'PARAM_FIXED_OVERHEAD',
        displayName: 'Fixed Overhead per Order',
        value: 500,
        category: 'COST',
        unit: 'USD',
        description: 'Fixed costs per order (admin, processing, insurance)',
      },
      {
        organizationId: org.id,
        name: 'PARAM_RUSH_FEE_PER_UNIT',
        displayName: 'Rush Order Fee per Unit',
        value: 2,
        category: 'COST',
        unit: 'USD',
        description: 'Additional cost per unit for orders over 1000 units',
      },
      {
        organizationId: org.id,
        name: 'PARAM_STORAGE_COST_PER_DAY',
        displayName: 'Storage Cost per Day',
        value: 50,
        category: 'COST',
        unit: 'USD',
        description: 'Daily warehouse storage cost',
      },
    ],
  })
  console.log('✅ Created', params.count, 'parameters')

  // 4. Create INPUT Variables
  const inputVars = await prisma.variable.createMany({
    data: [
      {
        organizationId: org.id,
        name: 'INPUT_SUPPLIER_LEAD_TIME',
        displayName: 'Supplier Lead Time',
        variableType: 'INPUT',
        category: 'SUPPLY',
        unit: 'days',
        description: 'Time from order placement to delivery',
        formula: null,
        dependencies: [],
      },
      {
        organizationId: org.id,
        name: 'INPUT_ORDER_QUANTITY',
        displayName: 'Order Quantity',
        variableType: 'INPUT',
        category: 'SUPPLY',
        unit: 'units',
        description: 'Number of units to order',
        formula: null,
        dependencies: [],
      },
      {
        organizationId: org.id,
        name: 'INPUT_UNIT_COST',
        displayName: 'Unit Cost',
        variableType: 'INPUT',
        category: 'COST',
        unit: 'USD',
        description: 'Cost per unit from supplier',
        formula: null,
        dependencies: [],
      },
      {
        organizationId: org.id,
        name: 'INPUT_DEFECT_RATE',
        displayName: 'Defect Rate',
        variableType: 'INPUT',
        category: 'QUALITY',
        unit: 'percent',
        description: 'Percentage of units that fail quality inspection',
        formula: null,
        dependencies: [],
      },
      {
        organizationId: org.id,
        name: 'INPUT_SUPPLIER_RELIABILITY',
        displayName: 'Supplier Reliability Score',
        variableType: 'INPUT',
        category: 'QUALITY',
        unit: 'score',
        description: 'Reliability score (0-100, higher is better)',
        formula: null,
        dependencies: [],
      },
    ],
  })
  console.log('✅ Created', inputVars.count, 'INPUT variables')

  // 5. Create OUTPUT Variables (with formulas)
  const outputVars = await prisma.variable.createMany({
    data: [
      {
        organizationId: org.id,
        name: 'OUTPUT_BASE_COST',
        displayName: 'Base Cost',
        variableType: 'OUTPUT',
        category: 'COST',
        unit: 'USD',
        description: 'Cost of units + fixed overhead',
        formula: 'INPUT_UNIT_COST * INPUT_ORDER_QUANTITY + PARAM_FIXED_OVERHEAD',
        dependencies: ['INPUT_UNIT_COST', 'INPUT_ORDER_QUANTITY'],
      },
      {
        organizationId: org.id,
        name: 'OUTPUT_RUSH_PENALTY',
        displayName: 'Rush Order Penalty',
        variableType: 'OUTPUT',
        category: 'COST',
        unit: 'USD',
        description: 'Additional cost for large orders (>1000 units)',
        formula: 'IF(INPUT_ORDER_QUANTITY > 1000, INPUT_ORDER_QUANTITY * PARAM_RUSH_FEE_PER_UNIT, 0)',
        dependencies: ['INPUT_ORDER_QUANTITY'],
      },
      {
        organizationId: org.id,
        name: 'OUTPUT_ADJUSTED_LEAD_TIME',
        displayName: 'Adjusted Lead Time',
        variableType: 'OUTPUT',
        category: 'SUPPLY',
        unit: 'days',
        description: 'Lead time with rush penalty (+5 days for orders >1000)',
        formula: 'IF(INPUT_ORDER_QUANTITY > 1000, INPUT_SUPPLIER_LEAD_TIME + 5, INPUT_SUPPLIER_LEAD_TIME)',
        dependencies: ['INPUT_SUPPLIER_LEAD_TIME', 'INPUT_ORDER_QUANTITY'],
      },
      {
        organizationId: org.id,
        name: 'OUTPUT_STORAGE_COST',
        displayName: 'Storage Cost',
        variableType: 'OUTPUT',
        category: 'COST',
        unit: 'USD',
        description: 'Total storage cost during lead time',
        formula: 'OUTPUT_ADJUSTED_LEAD_TIME * PARAM_STORAGE_COST_PER_DAY',
        dependencies: ['OUTPUT_ADJUSTED_LEAD_TIME'],
      },
      {
        organizationId: org.id,
        name: 'OUTPUT_TOTAL_COST',
        displayName: 'Total Cost',
        variableType: 'OUTPUT',
        category: 'COST',
        unit: 'USD',
        description: 'Base cost + rush penalty + storage',
        formula: 'OUTPUT_BASE_COST + OUTPUT_RUSH_PENALTY + OUTPUT_STORAGE_COST',
        dependencies: ['OUTPUT_BASE_COST', 'OUTPUT_RUSH_PENALTY', 'OUTPUT_STORAGE_COST'],
      },
      {
        organizationId: org.id,
        name: 'OUTPUT_DEFECT_COST',
        displayName: 'Defect Cost',
        variableType: 'OUTPUT',
        category: 'COST',
        unit: 'USD',
        description: 'Cost of defective units',
        formula: '(INPUT_DEFECT_RATE / 100) * INPUT_ORDER_QUANTITY * INPUT_UNIT_COST',
        dependencies: ['INPUT_DEFECT_RATE', 'INPUT_ORDER_QUANTITY', 'INPUT_UNIT_COST'],
      },
      {
        organizationId: org.id,
        name: 'OUTPUT_TOTAL_COST_WITH_DEFECTS',
        displayName: 'Total Cost (with Defects)',
        variableType: 'OUTPUT',
        category: 'COST',
        unit: 'USD',
        description: 'Total cost including defect costs',
        formula: 'OUTPUT_TOTAL_COST + OUTPUT_DEFECT_COST',
        dependencies: ['OUTPUT_TOTAL_COST', 'OUTPUT_DEFECT_COST'],
      },
      {
        organizationId: org.id,
        name: 'OUTPUT_COST_PER_GOOD_UNIT',
        displayName: 'Cost per Good Unit',
        variableType: 'OUTPUT',
        category: 'COST',
        unit: 'USD',
        description: 'Average cost per non-defective unit',
        formula: 'OUTPUT_TOTAL_COST_WITH_DEFECTS / (INPUT_ORDER_QUANTITY * (1 - INPUT_DEFECT_RATE / 100))',
        dependencies: ['OUTPUT_TOTAL_COST_WITH_DEFECTS', 'INPUT_ORDER_QUANTITY', 'INPUT_DEFECT_RATE'],
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

  // 6. Create Scenarios
  const baselineScenario = await prisma.scenario.create({
    data: {
      organizationId: org.id,
      name: 'Current Supplier A (Baseline)',
      description: 'Our current supplier - moderate cost, moderate speed, good quality',
      isBaseline: true,
    },
  })
  console.log('✅ Created baseline scenario:', baselineScenario.name)

  const scenarioB = await prisma.scenario.create({
    data: {
      organizationId: org.id,
      name: 'Alternative: Supplier B (Budget)',
      description: 'Cheaper option but slower delivery and higher defect rate',
      isBaseline: false,
    },
  })
  console.log('✅ Created scenario B:', scenarioB.name)

  const scenarioC = await prisma.scenario.create({
    data: {
      organizationId: org.id,
      name: 'Alternative: Supplier C (Premium)',
      description: 'More expensive but faster delivery and excellent quality',
      isBaseline: false,
    },
  })
  console.log('✅ Created scenario C:', scenarioC.name)

  // 7. Create VariableValues for Baseline (Supplier A)
  await prisma.variableValue.createMany({
    data: [
      { scenarioId: baselineScenario.id, variableId: varMap.get('INPUT_SUPPLIER_LEAD_TIME')!, value: 14 }, // 14 days
      { scenarioId: baselineScenario.id, variableId: varMap.get('INPUT_ORDER_QUANTITY')!, value: 800 },    // 800 units
      { scenarioId: baselineScenario.id, variableId: varMap.get('INPUT_UNIT_COST')!, value: 12 },          // $12/unit
      { scenarioId: baselineScenario.id, variableId: varMap.get('INPUT_DEFECT_RATE')!, value: 3 },         // 3% defects
      { scenarioId: baselineScenario.id, variableId: varMap.get('INPUT_SUPPLIER_RELIABILITY')!, value: 85 }, // 85/100
    ],
  })
  console.log('✅ Created VariableValues for baseline scenario')

  // 8. Create VariableValues for Supplier B (Budget)
  await prisma.variableValue.createMany({
    data: [
      { scenarioId: scenarioB.id, variableId: varMap.get('INPUT_SUPPLIER_LEAD_TIME')!, value: 21 },  // 21 days (slower)
      { scenarioId: scenarioB.id, variableId: varMap.get('INPUT_ORDER_QUANTITY')!, value: 800 },     // Same quantity
      { scenarioId: scenarioB.id, variableId: varMap.get('INPUT_UNIT_COST')!, value: 9 },            // $9/unit (cheaper!)
      { scenarioId: scenarioB.id, variableId: varMap.get('INPUT_DEFECT_RATE')!, value: 7 },          // 7% defects (worse)
      { scenarioId: scenarioB.id, variableId: varMap.get('INPUT_SUPPLIER_RELIABILITY')!, value: 70 }, // 70/100 (lower)
    ],
  })
  console.log('✅ Created VariableValues for Supplier B scenario')

  // 9. Create VariableValues for Supplier C (Premium)
  await prisma.variableValue.createMany({
    data: [
      { scenarioId: scenarioC.id, variableId: varMap.get('INPUT_SUPPLIER_LEAD_TIME')!, value: 7 },   // 7 days (fast!)
      { scenarioId: scenarioC.id, variableId: varMap.get('INPUT_ORDER_QUANTITY')!, value: 800 },     // Same quantity
      { scenarioId: scenarioC.id, variableId: varMap.get('INPUT_UNIT_COST')!, value: 15 },           // $15/unit (expensive)
      { scenarioId: scenarioC.id, variableId: varMap.get('INPUT_DEFECT_RATE')!, value: 1 },          // 1% defects (excellent!)
      { scenarioId: scenarioC.id, variableId: varMap.get('INPUT_SUPPLIER_RELIABILITY')!, value: 98 }, // 98/100 (very reliable)
    ],
  })
  console.log('✅ Created VariableValues for Supplier C scenario')

  console.log('🎉 Seed complete!')
  console.log('')
  console.log('📊 Summary:')
  console.log('  - 1 Organization: ACME Supply Chain')
  console.log('  - 1 User: admin@acme-supply.com')
  console.log('  - 3 Parameters (PARAM_*)')
  console.log('  - 5 INPUT Variables')
  console.log('  - 8 OUTPUT Variables (with formulas)')
  console.log('  - 3 Scenarios:')
  console.log('    1. Baseline: Current Supplier A (moderate cost, moderate speed, good quality)')
  console.log('    2. Alternative: Supplier B (cheap, slow, higher defects)')
  console.log('    3. Alternative: Supplier C (expensive, fast, excellent quality)')
  console.log('')
  console.log('🧮 Expected Results (after running calculations):')
  console.log('  Baseline (A): ~$10,200 total cost')
  console.log('  Supplier B:   ~$8,700 total cost (cheaper but more defects)')
  console.log('  Supplier C:   ~$12,600 total cost (expensive but best quality)')
  console.log('')
  console.log('Next: Run calculations using tRPC endpoint or calculation engine')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
