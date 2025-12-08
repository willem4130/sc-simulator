/**
 * Test script for Supply Chain Calculation Engine
 * Tests calculations on all 3 seeded scenarios
 */

import { PrismaClient } from '@prisma/client'
import { CalculationEngine } from '../src/lib/calculation/engine'

const prisma = new PrismaClient()
const engine = new CalculationEngine(prisma)

async function main() {
  console.log('🧮 Testing Supply Chain Calculation Engine')
  console.log('==========================================\n')

  // Get organization
  const org = await prisma.organization.findFirst()
  if (!org) {
    throw new Error('No organization found. Run seed script first.')
  }

  console.log(`Organization: ${org.name}\n`)

  // Get all scenarios
  const scenarios = await prisma.scenario.findMany({
    where: { organizationId: org.id },
    orderBy: { isBaseline: 'desc' }, // Baseline first
  })

  console.log(`Found ${scenarios.length} scenarios:\n`)

  // Run calculations for each scenario
  for (const scenario of scenarios) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`📊 ${scenario.name}`)
    console.log(`${'='.repeat(60)}`)
    console.log(`Baseline: ${scenario.isBaseline ? 'YES' : 'NO'}`)
    console.log('')

    try {
      // Run calculations
      const startTime = Date.now()
      const results = await engine.calculateScenario(org.id, scenario.id)
      const duration = Date.now() - startTime

      console.log(`✅ Calculated ${results.length} variables in ${duration}ms\n`)

      // Display key results
      const keyVariables = [
        'OUTPUT_BASE_COST',
        'OUTPUT_ADJUSTED_LEAD_TIME',
        'OUTPUT_TOTAL_COST',
        'OUTPUT_DEFECT_COST',
        'OUTPUT_TOTAL_COST_WITH_DEFECTS',
        'OUTPUT_COST_PER_GOOD_UNIT',
      ]

      console.log('Key Results:')
      console.log('-'.repeat(60))

      for (const varName of keyVariables) {
        const result = results.find((r) => r.variableName === varName)
        if (result) {
          const value = result.calculatedValue.toFixed(2)
          const delta = result.delta !== null ? result.delta.toFixed(2) : 'N/A'
          const pct =
            result.percentChange !== null
              ? result.percentChange.toFixed(1)
              : 'N/A'

          console.log(`  ${result.displayName}:`)
          console.log(`    Value: $${value}`)
          if (result.delta !== null) {
            const sign = result.delta >= 0 ? '+' : ''
            const indicator = result.delta < 0 ? '💚' : '❤️'
            console.log(`    vs Baseline: ${sign}$${delta} (${sign}${pct}%) ${indicator}`)
          }
          console.log('')
        }
      }
    } catch (error) {
      console.error('❌ Calculation failed:', error)
      if (error instanceof Error) {
        console.error('Error message:', error.message)
      }
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('📈 Summary')
  console.log('='.repeat(60))

  // Get total costs for comparison
  const calculations = await prisma.calculation.findMany({
    where: {
      scenario: { organizationId: org.id },
      variable: { name: 'OUTPUT_TOTAL_COST_WITH_DEFECTS' },
    },
    include: {
      scenario: true,
      variable: true,
    },
    orderBy: {
      scenario: { isBaseline: 'desc' },
    },
  })

  console.log('\nTotal Cost Comparison:')
  console.log('-'.repeat(60))

  for (const calc of calculations) {
    const cost = calc.calculatedValue.toFixed(2)
    const delta = calc.delta !== null ? calc.delta.toFixed(2) : 'N/A'
    const pct = calc.percentChange !== null ? calc.percentChange.toFixed(1) : 'N/A'

    console.log(`\n${calc.scenario.name}:`)
    console.log(`  Total Cost: $${cost}`)
    if (calc.delta !== null) {
      const sign = calc.delta >= 0 ? '+' : ''
      const savings = calc.delta < 0 ? -calc.delta : 0
      console.log(`  vs Baseline: ${sign}$${delta} (${sign}${pct}%)`)
      if (savings > 0) {
        console.log(`  💰 Savings: $${savings.toFixed(2)}`)
      }
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ Test Complete!')
  console.log('='.repeat(60) + '\n')
}

main()
  .catch((e) => {
    console.error('❌ Test failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
