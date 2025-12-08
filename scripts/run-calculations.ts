/**
 * Script to run calculations on all scenarios using the calculation engine directly
 */
import { PrismaClient } from '@prisma/client'
import { runCalculation } from '../src/lib/calculation/engine'
import type {
  CalculationEngineContext,
  VariableDefinition,
  ParameterDefinition,
  VariableValueInput,
} from '../src/lib/calculation/types'

const prisma = new PrismaClient()

async function main() {
  console.log('🧮 Running calculations on all scenarios...\n')

  // Get organization
  const org = await prisma.organization.findFirst()
  if (!org) {
    throw new Error('No organization found. Run seed script first.')
  }

  console.log(`Organization: ${org.name} (${org.id})\n`)

  // Load all variables and parameters (same for all scenarios)
  const dbVariables = await prisma.variable.findMany({
    where: { organizationId: org.id },
    orderBy: { createdAt: 'asc' },
  })

  const variables: VariableDefinition[] = dbVariables.map((v) => ({
    id: v.id,
    name: v.name,
    displayName: v.displayName,
    variableType: v.variableType,
    formula: v.formula,
    dependencies: v.dependencies,
    effectCurveId: v.effectCurveId,
    unit: v.unit,
  }))

  const dbParameters = await prisma.parameter.findMany({
    where: { organizationId: org.id },
  })

  const parameters: ParameterDefinition[] = dbParameters.map((p) => ({
    id: p.id,
    name: p.name,
    displayName: p.displayName,
    value: p.value,
    unit: p.unit,
  }))

  console.log(`Loaded ${variables.length} variables and ${parameters.length} parameters\n`)

  // Get all scenarios
  const scenarios = await prisma.scenario.findMany({
    where: { organizationId: org.id },
    orderBy: [{ isBaseline: 'desc' }, { createdAt: 'asc' }],
  })

  console.log(`Found ${scenarios.length} scenarios:\n`)

  // Store baseline results for comparison
  let baselineResults: Record<string, any> | null = null

  // Run calculations for each scenario
  for (const scenario of scenarios) {
    console.log(`\n${'='.repeat(70)}`)
    console.log(`📊 ${scenario.name}`)
    console.log(`${'='.repeat(70)}`)
    console.log(`ID: ${scenario.id}`)
    console.log(`Baseline: ${scenario.isBaseline ? 'YES' : 'NO'}\n`)

    try {
      // Load input values for this scenario
      const dbInputValues = await prisma.variableValue.findMany({
        where: {
          scenarioId: scenario.id,
        },
        include: {
          variable: true,
        },
      })

      const inputValues: VariableValueInput[] = dbInputValues.map((v) => ({
        variableId: v.variableId,
        variableName: v.variable.name,
        value: v.value,
      }))

      console.log(`Loaded ${inputValues.length} input values`)

      // Build calculation context
      const context: CalculationEngineContext = {
        variables,
        parameters,
        inputValues,
        baselineResults: scenario.isBaseline ? null : (baselineResults as never),
        effectCurves: new Map(), // TODO: Load effect curves in Phase 3
      }

      // Run calculation
      const startTime = Date.now()
      const result = await runCalculation(context, {
        scenarioId: scenario.id,
        organizationId: org.id,
        forceRecalculate: true,
      })
      const duration = Date.now() - startTime

      console.log(`✅ Calculation completed in ${duration}ms`)
      console.log(`   Execution time: ${result.executionTimeMs}ms`)
      console.log(`   Has errors: ${result.hasErrors}`)
      console.log(`   Calculated ${Object.keys(result.results).length} variables`)

      // Save baseline results for comparison
      if (scenario.isBaseline) {
        baselineResults = result.results as never
        console.log(`   💾 Saved as baseline for comparisons`)
      }

      // Display key results
      console.log(`\n   Key Results:`)
      console.log(`   ${'-'.repeat(66)}`)

      const keyVariables = [
        'OUTPUT_BASE_COST',
        'OUTPUT_ADJUSTED_LEAD_TIME',
        'OUTPUT_STORAGE_COST',
        'OUTPUT_TOTAL_COST',
        'OUTPUT_DEFECT_COST',
        'OUTPUT_TOTAL_COST_WITH_DEFECTS',
        'OUTPUT_COST_PER_GOOD_UNIT',
      ]

      for (const varName of keyVariables) {
        const varResult = result.results[varName]
        if (varResult) {
          const value = varResult.value.toFixed(2)
          console.log(`   ${varName}: $${value}`)

          if (varResult.delta !== undefined && varResult.delta !== null) {
            const delta = varResult.delta.toFixed(2)
            const pct = varResult.percentChange?.toFixed(1) ?? '0.0'
            const sign = varResult.delta >= 0 ? '+' : ''
            const indicator = varResult.delta < 0 ? '💚 (savings)' : '❤️  (increased cost)'
            console.log(`      vs Baseline: ${sign}$${delta} (${sign}${pct}%) ${indicator}`)
          }
        }
      }

      if (result.hasErrors && result.errorLog && result.errorLog.length > 0) {
        console.log(`\n   ⚠️  Errors:`)
        for (const error of result.errorLog.slice(0, 3)) {
          console.log(`      - ${error.message}`)
        }
      }
    } catch (error) {
      console.error(`\n❌ Calculation failed:`, error)
      if (error instanceof Error) {
        console.error(`   Error message: ${error.message}`)
        if (error.stack) {
          console.error(`   Stack trace:\n${error.stack.split('\n').slice(0, 8).join('\n')}`)
        }
      }
    }
  }

  console.log(`\n${'='.repeat(70)}`)
  console.log('✅ All calculations complete!')
  console.log(`${'='.repeat(70)}\n`)
}

main()
  .catch((e) => {
    console.error('❌ Script failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
