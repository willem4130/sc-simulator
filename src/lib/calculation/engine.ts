/**
 * Calculation Engine - Main Orchestrator
 *
 * Coordinates formula parsing, dependency resolution, evaluation,
 * and result storage for scenario calculations.
 */

import { parseFormula } from './formula-parser'
import { evaluateFormula } from './formula-evaluator'
import { getCalculationOrder } from './dependency-graph'
import {
  CalculationOptions,
  CalculationEngineContext,
  CalculationResult,
  VariableResult,
  ErrorEntry,
  ErrorType,
  CalculationContext,
} from './types'

// ==========================================
// CALCULATION ENGINE
// ==========================================

export class CalculationEngine {
  private context: CalculationEngineContext
  private options: CalculationOptions

  constructor(
    context: CalculationEngineContext,
    options: CalculationOptions
  ) {
    this.context = context
    this.options = options
  }

  /**
   * Run the calculation for a scenario
   */
  public async calculate(): Promise<CalculationResult> {
    const startTime = Date.now()
    const errors: ErrorEntry[] = []

    try {
      // Step 1: Validate inputs
      this.validateInputs(errors)

      // Step 2: Get calculation order (topological sort)
      const calculationOrder = getCalculationOrder(this.context.variables)

      // Step 3: Build initial calculation context
      const calcContext: CalculationContext = {
        variables: {},
        parameters: {},
        skuEffectCurves: this.context.skuEffectCurves,
      }

      // Load parameters
      for (const param of this.context.parameters) {
        calcContext.parameters[param.name] = param.value
      }

      // Load INPUT variable values
      const inputValueMap = new Map(
        this.context.inputValues.map((v) => [v.variableName, v.value])
      )

      // Step 4: Calculate variables in order
      const results: Record<string, VariableResult> = {}

      for (const variableName of calculationOrder) {
        try {
          const variable = this.context.variables.find(
            (v) => v.name === variableName
          )!

          let value: number
          let rawValue: number

          if (variable.variableType === 'INPUT') {
            // Get input value
            value = inputValueMap.get(variableName) ?? 0
            rawValue = value
            calcContext.variables[variableName] = value
          } else {
            // Calculate OUTPUT variable
            if (!variable.formula) {
              throw new Error(
                `OUTPUT variable '${variableName}' has no formula`
              )
            }

            // Parse and evaluate formula
            const ast = parseFormula(variable.formula)
            rawValue = evaluateFormula(ast, calcContext)

            // Apply effect curve if configured (Phase 3 - placeholder for now)
            value = variable.effectCurveId
              ? this.applyEffectCurve(rawValue, variable.effectCurveId)
              : rawValue

            calcContext.variables[variableName] = value
          }

          // Compare to baseline
          const baselineValue = this.context.baselineResults?.[variableName]
            ?.value ?? null
          const delta =
            baselineValue !== null ? value - baselineValue : null
          const percentChange =
            baselineValue !== null && baselineValue !== 0
              ? ((value - baselineValue) / baselineValue) * 100
              : null

          // Store result
          results[variableName] = {
            value,
            rawValue,
            delta,
            percentChange,
            baselineValue,
            effectCurveApplied: variable.effectCurveId !== null,
            calculatedAt: new Date().toISOString(),
            dependencies: variable.dependencies,
          }
        } catch (error) {
          // Log error and continue with other variables
          errors.push({
            variableName,
            errorType: this.categorizeError(error),
            message: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
          })
        }
      }

      // Step 5: Build result
      const executionTimeMs = Date.now() - startTime

      return {
        scenarioId: this.options.scenarioId,
        periodStart: this.options.periodStart ?? null,
        periodEnd: this.options.periodEnd ?? null,
        baselineScenarioId: null, // TODO: Get from scenario
        results,
        calculationTime: new Date(),
        executionTimeMs,
        version: 1, // TODO: Get from database
        hasErrors: errors.length > 0,
        errorLog: errors.length > 0 ? errors : null,
      }
    } catch (error) {
      // Fatal error - return error result
      const executionTimeMs = Date.now() - startTime

      return {
        scenarioId: this.options.scenarioId,
        periodStart: this.options.periodStart ?? null,
        periodEnd: this.options.periodEnd ?? null,
        baselineScenarioId: null,
        results: {},
        calculationTime: new Date(),
        executionTimeMs,
        version: 1,
        hasErrors: true,
        errorLog: [
          {
            variableName: 'CALCULATION_ENGINE',
            errorType: ErrorType.FORMULA_ERROR,
            message: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
          },
        ],
      }
    }
  }

  /**
   * Validate that all INPUT variables have values
   */
  private validateInputs(errors: ErrorEntry[]): void {
    const inputValueMap = new Map(
      this.context.inputValues.map((v) => [v.variableName, v.value])
    )

    for (const variable of this.context.variables) {
      if (variable.variableType === 'INPUT') {
        if (!inputValueMap.has(variable.name)) {
          errors.push({
            variableName: variable.name,
            errorType: ErrorType.MISSING_VALUE,
            message: `INPUT variable '${variable.name}' has no value for this scenario`,
            timestamp: new Date().toISOString(),
          })
        }
      }
    }
  }

  /**
   * Apply effect curve transformation (Phase 3 - placeholder)
   */
  private applyEffectCurve(value: number, effectCurveId: string): number {
    // TODO: Implement effect curve logic in Phase 3
    // For now, just return the raw value
    return value
  }

  /**
   * Categorize error type from exception
   */
  private categorizeError(error: unknown): ErrorType {
    const errorMessage =
      error instanceof Error ? error.message : String(error)

    if (errorMessage.includes(ErrorType.MISSING_VALUE)) {
      return ErrorType.MISSING_VALUE
    }
    if (errorMessage.includes(ErrorType.DIVISION_BY_ZERO)) {
      return ErrorType.DIVISION_BY_ZERO
    }
    if (errorMessage.includes(ErrorType.CIRCULAR_DEPENDENCY)) {
      return ErrorType.CIRCULAR_DEPENDENCY
    }
    if (errorMessage.includes(ErrorType.INVALID_FUNCTION)) {
      return ErrorType.INVALID_FUNCTION
    }
    if (errorMessage.includes(ErrorType.UNKNOWN_VARIABLE)) {
      return ErrorType.UNKNOWN_VARIABLE
    }
    if (errorMessage.includes(ErrorType.INVALID_ARGUMENT)) {
      return ErrorType.INVALID_ARGUMENT
    }

    return ErrorType.FORMULA_ERROR
  }
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Run calculation for a scenario
 */
export async function runCalculation(
  context: CalculationEngineContext,
  options: CalculationOptions
): Promise<CalculationResult> {
  const engine = new CalculationEngine(context, options)
  return engine.calculate()
}
