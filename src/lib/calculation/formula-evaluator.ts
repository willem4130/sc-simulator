/**
 * Formula Evaluator - Execute AST with function support
 *
 * Evaluates an Abstract Syntax Tree (AST) with variable/parameter context
 * and supports mathematical functions (MAX, MIN, IF, ABS, SQRT, etc.)
 */

import { ASTNode, ASTNodeType, CalculationContext, ErrorType } from './types'

// ==========================================
// EVALUATOR
// ==========================================

export class FormulaEvaluator {
  private context: CalculationContext

  constructor(context: CalculationContext) {
    this.context = context
  }

  /**
   * Evaluate an AST node and return the result
   */
  public evaluate(node: ASTNode): number {
    switch (node.type) {
      case ASTNodeType.NUMBER:
        return node.value as number

      case ASTNodeType.VARIABLE:
        return this.evaluateVariable(node)

      case ASTNodeType.PARAMETER:
        return this.evaluateParameter(node)

      case ASTNodeType.BINARY_OP:
        return this.evaluateBinaryOp(node)

      case ASTNodeType.UNARY_OP:
        return this.evaluateUnaryOp(node)

      case ASTNodeType.FUNCTION_CALL:
        return this.evaluateFunction(node)

      default:
        throw new Error(`Unknown AST node type: ${node.type}`)
    }
  }

  /**
   * Evaluate variable reference
   */
  private evaluateVariable(node: ASTNode): number {
    const variableName = node.value as string

    if (!(variableName in this.context.variables)) {
      throw new Error(
        `Variable '${variableName}' not found in calculation context. ` +
          `Error type: ${ErrorType.UNKNOWN_VARIABLE}`
      )
    }

    const value = this.context.variables[variableName]!
    return value
  }

  /**
   * Evaluate parameter reference
   */
  private evaluateParameter(node: ASTNode): number {
    const parameterName = node.value as string

    if (!(parameterName in this.context.parameters)) {
      throw new Error(
        `Parameter '${parameterName}' not found in calculation context. ` +
          `Error type: ${ErrorType.UNKNOWN_VARIABLE}`
      )
    }

    const value = this.context.parameters[parameterName]!
    return value
  }

  /**
   * Evaluate binary operation (+, -, *, /)
   */
  private evaluateBinaryOp(node: ASTNode): number {
    const left = this.evaluate(node.left!)
    const right = this.evaluate(node.right!)

    switch (node.operator) {
      case '+':
        return left + right
      case '-':
        return left - right
      case '*':
        return left * right
      case '/':
        if (right === 0) {
          throw new Error(
            `Division by zero. Error type: ${ErrorType.DIVISION_BY_ZERO}`
          )
        }
        return left / right
      default:
        throw new Error(`Unknown binary operator: ${node.operator}`)
    }
  }

  /**
   * Evaluate unary operation (unary minus: -x)
   */
  private evaluateUnaryOp(node: ASTNode): number {
    const value = this.evaluate(node.right!)

    switch (node.operator) {
      case '-':
        return -value
      default:
        throw new Error(`Unknown unary operator: ${node.operator}`)
    }
  }

  /**
   * Evaluate function call
   */
  private evaluateFunction(node: ASTNode): number {
    const functionName = node.functionName!
    const args = (node.args ?? []).map((arg) => this.evaluate(arg))

    switch (functionName) {
      case 'MAX':
        return this.funcMax(args)
      case 'MIN':
        return this.funcMin(args)
      case 'IF':
        return this.funcIf(args)
      case 'ABS':
        return this.funcAbs(args)
      case 'SQRT':
        return this.funcSqrt(args)
      case 'ROUND':
        return this.funcRound(args)
      case 'CEILING':
        return this.funcCeiling(args)
      case 'FLOOR':
        return this.funcFloor(args)
      case 'POW':
        return this.funcPow(args)
      case 'SKU_LOOKUP':
        return this.funcSkuLookup(args)
      default:
        throw new Error(
          `Unknown function: ${functionName}. Error type: ${ErrorType.INVALID_FUNCTION}`
        )
    }
  }

  // ==========================================
  // FUNCTION IMPLEMENTATIONS
  // ==========================================

  /**
   * MAX(a, b, ...) - Return maximum value
   */
  private funcMax(args: number[]): number {
    if (args.length === 0) {
      throw new Error(
        `MAX function requires at least 1 argument. Error type: ${ErrorType.INVALID_ARGUMENT}`
      )
    }
    return Math.max(...args)
  }

  /**
   * MIN(a, b, ...) - Return minimum value
   */
  private funcMin(args: number[]): number {
    if (args.length === 0) {
      throw new Error(
        `MIN function requires at least 1 argument. Error type: ${ErrorType.INVALID_ARGUMENT}`
      )
    }
    return Math.min(...args)
  }

  /**
   * IF(condition, trueValue, falseValue)
   * Condition: 0 = false, non-zero = true
   */
  private funcIf(args: number[]): number {
    if (args.length !== 3) {
      throw new Error(
        `IF function requires exactly 3 arguments (condition, trueValue, falseValue). ` +
          `Got ${args.length}. Error type: ${ErrorType.INVALID_ARGUMENT}`
      )
    }

    const [condition, trueValue, falseValue] = args
    return condition! !== 0 ? trueValue! : falseValue!
  }

  /**
   * ABS(x) - Absolute value
   */
  private funcAbs(args: number[]): number {
    if (args.length !== 1) {
      throw new Error(
        `ABS function requires exactly 1 argument. Got ${args.length}. ` +
          `Error type: ${ErrorType.INVALID_ARGUMENT}`
      )
    }
    return Math.abs(args[0]!)
  }

  /**
   * SQRT(x) - Square root
   */
  private funcSqrt(args: number[]): number {
    if (args.length !== 1) {
      throw new Error(
        `SQRT function requires exactly 1 argument. Got ${args.length}. ` +
          `Error type: ${ErrorType.INVALID_ARGUMENT}`
      )
    }

    const value = args[0]!
    if (value < 0) {
      throw new Error(
        `SQRT function requires non-negative argument. Got ${value}. ` +
          `Error type: ${ErrorType.INVALID_ARGUMENT}`
      )
    }

    return Math.sqrt(value)
  }

  /**
   * ROUND(x, decimals) - Round to N decimal places
   * ROUND(x) defaults to 0 decimals
   */
  private funcRound(args: number[]): number {
    if (args.length < 1 || args.length > 2) {
      throw new Error(
        `ROUND function requires 1 or 2 arguments (value, decimals?). ` +
          `Got ${args.length}. Error type: ${ErrorType.INVALID_ARGUMENT}`
      )
    }

    const value = args[0]!
    const decimals = args[1] ?? 0

    const multiplier = Math.pow(10, decimals)
    return Math.round(value * multiplier) / multiplier
  }

  /**
   * CEILING(x) - Round up to nearest integer
   */
  private funcCeiling(args: number[]): number {
    if (args.length !== 1) {
      throw new Error(
        `CEILING function requires exactly 1 argument. Got ${args.length}. ` +
          `Error type: ${ErrorType.INVALID_ARGUMENT}`
      )
    }
    return Math.ceil(args[0]!)
  }

  /**
   * FLOOR(x) - Round down to nearest integer
   */
  private funcFloor(args: number[]): number {
    if (args.length !== 1) {
      throw new Error(
        `FLOOR function requires exactly 1 argument. Got ${args.length}. ` +
          `Error type: ${ErrorType.INVALID_ARGUMENT}`
      )
    }
    return Math.floor(args[0]!)
  }

  /**
   * POW(base, exponent) - Power function
   */
  private funcPow(args: number[]): number {
    if (args.length !== 2) {
      throw new Error(
        `POW function requires exactly 2 arguments (base, exponent). ` +
          `Got ${args.length}. Error type: ${ErrorType.INVALID_ARGUMENT}`
      )
    }

    const [base, exponent] = args
    return Math.pow(base!, exponent!)
  }

  /**
   * SKU_LOOKUP(skuCount) - Lookup SKU complexity effect multiplier from curve table
   * Finds the highest range start that's <= skuCount and returns its multiplier
   * E.g., SKU_LOOKUP(6550) with ranges [6500→1.0, 6550→1.01, 6600→1.02] returns 1.01
   */
  private funcSkuLookup(args: number[]): number {
    if (args.length !== 1) {
      throw new Error(
        `SKU_LOOKUP function requires exactly 1 argument (skuCount). ` +
          `Got ${args.length}. Error type: ${ErrorType.INVALID_ARGUMENT}`
      )
    }

    const skuCount = Math.floor(args[0]!)

    // Get SKU effect curves from context
    const curves = this.context.skuEffectCurves
    if (!curves || curves.length === 0) {
      // If no curves defined, default to linear (1.0)
      return 1.0
    }

    // Sort curves by skuRangeStart (ascending) and find the highest range that's <= skuCount
    const sortedCurves = [...curves].sort((a, b) => a.skuRangeStart - b.skuRangeStart)

    let matchedMultiplier = 1.0 // Default to linear if no match
    for (const curve of sortedCurves) {
      if (skuCount >= curve.skuRangeStart) {
        matchedMultiplier = curve.effectMultiplier
      } else {
        break // Stop once we've passed the SKU count
      }
    }

    return matchedMultiplier
  }
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Evaluate a formula AST with given context
 */
export function evaluateFormula(
  ast: ASTNode,
  context: CalculationContext
): number {
  const evaluator = new FormulaEvaluator(context)
  return evaluator.evaluate(ast)
}
