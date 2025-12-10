/**
 * Calculation Engine Type Definitions
 */

// ==========================================
// FORMULA PARSING
// ==========================================

export enum TokenType {
  // Literals
  NUMBER = 'NUMBER',
  VARIABLE = 'VARIABLE', // INPUT_*, OUTPUT_*
  PARAMETER = 'PARAMETER', // PARAM_*

  // Operators
  PLUS = 'PLUS',
  MINUS = 'MINUS',
  MULTIPLY = 'MULTIPLY',
  DIVIDE = 'DIVIDE',

  // Grouping
  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  COMMA = 'COMMA',

  // Functions
  FUNCTION = 'FUNCTION', // MAX, MIN, IF, etc.

  // Control
  EOF = 'EOF',
}

export interface Token {
  type: TokenType
  value: string | number
  position: number
}

export enum ASTNodeType {
  NUMBER = 'NUMBER',
  VARIABLE = 'VARIABLE',
  PARAMETER = 'PARAMETER',
  BINARY_OP = 'BINARY_OP',
  UNARY_OP = 'UNARY_OP',
  FUNCTION_CALL = 'FUNCTION_CALL',
}

export interface ASTNode {
  type: ASTNodeType
  value?: number | string
  operator?: string
  left?: ASTNode
  right?: ASTNode
  functionName?: string
  args?: ASTNode[]
}

// ==========================================
// CALCULATION CONTEXT
// ==========================================

export interface CalculationContext {
  variables: Record<string, number> // Variable name → value
  parameters: Record<string, number> // Parameter name → value
  skuEffectCurves?: Array<{ skuRangeStart: number; effectMultiplier: number }> // SKU lookup table
}

export interface VariableDefinition {
  id: string
  name: string
  displayName: string
  variableType: 'INPUT' | 'OUTPUT'
  formula: string | null
  dependencies: string[] // Variable names this depends on
  effectCurveId: string | null
  unit: string | null
}

export interface ParameterDefinition {
  id: string
  name: string
  displayName: string
  value: number
  unit: string | null
}

export interface VariableValueInput {
  variableId: string
  variableName: string
  value: number
}

// ==========================================
// CALCULATION RESULTS
// ==========================================

export interface VariableResult {
  value: number // Final value (after effect curve)
  rawValue: number // Before effect curve
  delta: number | null // Difference from baseline
  percentChange: number | null // % change from baseline
  baselineValue: number | null
  effectCurveApplied: boolean
  calculatedAt: string
  dependencies: string[] // Variable names used in calculation
}

export interface CalculationResult {
  scenarioId: string
  periodStart: Date | null
  periodEnd: Date | null
  baselineScenarioId: string | null
  results: Record<string, VariableResult> // Variable name → result
  calculationTime: Date
  executionTimeMs: number
  version: number
  hasErrors: boolean
  errorLog: ErrorEntry[] | null
}

export enum ErrorType {
  MISSING_VALUE = 'MISSING_VALUE',
  DIVISION_BY_ZERO = 'DIVISION_BY_ZERO',
  FORMULA_ERROR = 'FORMULA_ERROR',
  CIRCULAR_DEPENDENCY = 'CIRCULAR_DEPENDENCY',
  INVALID_FUNCTION = 'INVALID_FUNCTION',
  UNKNOWN_VARIABLE = 'UNKNOWN_VARIABLE',
  INVALID_ARGUMENT = 'INVALID_ARGUMENT',
}

export interface ErrorEntry {
  variableName: string
  errorType: ErrorType
  message: string
  timestamp: string
}

// ==========================================
// DEPENDENCY GRAPH
// ==========================================

export interface DependencyNode {
  variableId: string
  variableName: string
  dependencies: string[] // Variable names (not IDs)
  dependents: string[] // Variables that depend on this one
  inDegree: number // Number of dependencies
}

export interface DependencyGraph {
  nodes: Map<string, DependencyNode> // Variable name → node
  sortedOrder: string[] // Topologically sorted variable names
  hasCycle: boolean
  cycleDescription: string | null
}

// ==========================================
// FORMULA VALIDATION
// ==========================================

export interface FormulaValidationResult {
  valid: boolean
  errors: string[]
  dependencies: string[] // Variable/parameter names found in formula
  ast: ASTNode | null
}

// ==========================================
// EFFECT CURVES (Phase 3)
// ==========================================

export enum CurveType {
  LINEAR = 'LINEAR',
  LOGARITHMIC = 'LOGARITHMIC',
  EXPONENTIAL = 'EXPONENTIAL',
  STEP_WISE = 'STEP_WISE',
  CUSTOM_INTERPOLATED = 'CUSTOM_INTERPOLATED',
}

export interface EffectCurveDefinition {
  id: string
  name: string
  curveType: CurveType
  parameters: unknown // JSON - type depends on curveType
}

// Linear: { slope: number, intercept: number }
export interface LinearCurveParams {
  slope: number
  intercept: number
}

// Logarithmic: { base: number, multiplier: number, offset: number }
export interface LogarithmicCurveParams {
  base: number
  multiplier: number
  offset: number
}

// Exponential: { base: number, exponent: number, multiplier: number }
export interface ExponentialCurveParams {
  base: number
  exponent: number
  multiplier: number
}

// Step-wise: thresholds and corresponding values
export interface StepWiseCurveParams {
  thresholds: number[] // Ascending order
  values: number[] // Length = thresholds.length + 1
}

// Custom interpolated: user-defined points with linear interpolation
export interface CustomCurveParams {
  points: Array<{ x: number; y: number }> // Sorted by x
  interpolationMethod: 'linear' // Future: 'cubic', 'spline'
}

// ==========================================
// CALCULATION ENGINE OPTIONS
// ==========================================

export interface CalculationOptions {
  scenarioId: string
  organizationId: string
  periodStart?: Date
  periodEnd?: Date
  forceRecalculate?: boolean // Ignore cache
  storeResults?: boolean // Save to database (default: true)
}

export interface CalculationEngineContext {
  variables: VariableDefinition[]
  parameters: ParameterDefinition[]
  inputValues: VariableValueInput[]
  baselineResults: Record<string, VariableResult> | null
  effectCurves: Map<string, EffectCurveDefinition>
}
