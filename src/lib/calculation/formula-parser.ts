/**
 * Formula Parser - Tokenizer + AST Builder
 *
 * Converts formula strings like "INPUT_A * INPUT_B + PARAM_TAX"
 * into an Abstract Syntax Tree (AST) for evaluation.
 */

import {
  Token,
  TokenType,
  ASTNode,
  ASTNodeType,
  FormulaValidationResult,
} from './types'

// ==========================================
// TOKENIZER
// ==========================================

const SUPPORTED_FUNCTIONS = [
  'MAX',
  'MIN',
  'IF',
  'ABS',
  'SQRT',
  'ROUND',
  'CEILING',
  'FLOOR',
  'POW',
  'SKU_LOOKUP',
] as const

export class FormulaTokenizer {
  private formula: string
  private position: number
  private currentChar: string | null

  constructor(formula: string) {
    this.formula = formula.trim()
    this.position = 0
    this.currentChar = this.formula.length > 0 ? this.formula[0]! : null
  }

  private advance(): void {
    this.position++
    this.currentChar =
      this.position < this.formula.length ? this.formula[this.position]! : null
  }

  private peek(offset = 1): string | null {
    const peekPos = this.position + offset
    return peekPos < this.formula.length ? this.formula[peekPos]! : null
  }

  private skipWhitespace(): void {
    while (this.currentChar !== null && /\s/.test(this.currentChar)) {
      this.advance()
    }
  }

  private readNumber(): Token {
    const startPos = this.position
    let numStr = ''

    // Read digits and decimal point
    while (
      this.currentChar !== null &&
      /[0-9.]/.test(this.currentChar)
    ) {
      numStr += this.currentChar
      this.advance()
    }

    const value = parseFloat(numStr)
    if (isNaN(value)) {
      throw new Error(`Invalid number at position ${startPos}: ${numStr}`)
    }

    return {
      type: TokenType.NUMBER,
      value,
      position: startPos,
    }
  }

  private readIdentifier(): Token {
    const startPos = this.position
    let identifier = ''

    // Read alphanumeric + underscore
    while (
      this.currentChar !== null &&
      /[A-Z0-9_]/.test(this.currentChar)
    ) {
      identifier += this.currentChar
      this.advance()
    }

    // Check if it's a function
    if (SUPPORTED_FUNCTIONS.includes(identifier as never)) {
      return {
        type: TokenType.FUNCTION,
        value: identifier,
        position: startPos,
      }
    }

    // Check if it's a parameter (PARAM_*)
    if (identifier.startsWith('PARAM_')) {
      return {
        type: TokenType.PARAMETER,
        value: identifier,
        position: startPos,
      }
    }

    // Check if it's a variable (INPUT_* or OUTPUT_*)
    if (identifier.startsWith('INPUT_') || identifier.startsWith('OUTPUT_')) {
      return {
        type: TokenType.VARIABLE,
        value: identifier,
        position: startPos,
      }
    }

    throw new Error(
      `Invalid identifier at position ${startPos}: ${identifier}. ` +
        `Variables must start with INPUT_ or OUTPUT_. Parameters must start with PARAM_.`
    )
  }

  public tokenize(): Token[] {
    const tokens: Token[] = []

    while (this.currentChar !== null) {
      this.skipWhitespace()

      if (this.currentChar === null) break

      // Numbers
      if (/[0-9]/.test(this.currentChar)) {
        tokens.push(this.readNumber())
        continue
      }

      // Identifiers (variables, parameters, functions)
      if (/[A-Z]/.test(this.currentChar)) {
        tokens.push(this.readIdentifier())
        continue
      }

      // Operators and punctuation
      const char = this.currentChar
      const pos = this.position

      switch (char) {
        case '+':
          tokens.push({ type: TokenType.PLUS, value: '+', position: pos })
          this.advance()
          break
        case '-':
          tokens.push({ type: TokenType.MINUS, value: '-', position: pos })
          this.advance()
          break
        case '*':
          tokens.push({ type: TokenType.MULTIPLY, value: '*', position: pos })
          this.advance()
          break
        case '/':
          tokens.push({ type: TokenType.DIVIDE, value: '/', position: pos })
          this.advance()
          break
        case '(':
          tokens.push({ type: TokenType.LPAREN, value: '(', position: pos })
          this.advance()
          break
        case ')':
          tokens.push({ type: TokenType.RPAREN, value: ')', position: pos })
          this.advance()
          break
        case ',':
          tokens.push({ type: TokenType.COMMA, value: ',', position: pos })
          this.advance()
          break
        default:
          throw new Error(
            `Unexpected character at position ${pos}: '${char}'`
          )
      }
    }

    tokens.push({ type: TokenType.EOF, value: 'EOF', position: this.position })
    return tokens
  }
}

// ==========================================
// AST PARSER
// ==========================================

export class FormulaParser {
  private tokens: Token[]
  private position: number
  private currentToken: Token

  constructor(tokens: Token[]) {
    this.tokens = tokens
    this.position = 0
    this.currentToken = tokens[0]!
  }

  private advance(): void {
    this.position++
    if (this.position < this.tokens.length) {
      this.currentToken = this.tokens[this.position]!
    }
  }

  private expect(type: TokenType): Token {
    if (this.currentToken.type !== type) {
      throw new Error(
        `Expected ${type} but got ${this.currentToken.type} at position ${this.currentToken.position}`
      )
    }
    const token = this.currentToken
    this.advance()
    return token
  }

  /**
   * Parse expression (handles +, -)
   * EXPRESSION := TERM ((PLUS | MINUS) TERM)*
   */
  private parseExpression(): ASTNode {
    let node = this.parseTerm()

    while (
      this.currentToken.type === TokenType.PLUS ||
      this.currentToken.type === TokenType.MINUS
    ) {
      const operator = this.currentToken.value as string
      this.advance()
      const right = this.parseTerm()

      node = {
        type: ASTNodeType.BINARY_OP,
        operator,
        left: node,
        right,
      }
    }

    return node
  }

  /**
   * Parse term (handles *, /)
   * TERM := FACTOR ((MULTIPLY | DIVIDE) FACTOR)*
   */
  private parseTerm(): ASTNode {
    let node = this.parseFactor()

    while (
      this.currentToken.type === TokenType.MULTIPLY ||
      this.currentToken.type === TokenType.DIVIDE
    ) {
      const operator = this.currentToken.value as string
      this.advance()
      const right = this.parseFactor()

      node = {
        type: ASTNodeType.BINARY_OP,
        operator,
        left: node,
        right,
      }
    }

    return node
  }

  /**
   * Parse factor (handles numbers, variables, functions, parentheses, unary minus)
   * FACTOR := NUMBER | VARIABLE | PARAMETER | FUNCTION_CALL | LPAREN EXPRESSION RPAREN | MINUS FACTOR
   */
  private parseFactor(): ASTNode {
    const token = this.currentToken

    // Unary minus
    if (token.type === TokenType.MINUS) {
      this.advance()
      return {
        type: ASTNodeType.UNARY_OP,
        operator: '-',
        right: this.parseFactor(),
      }
    }

    // Number
    if (token.type === TokenType.NUMBER) {
      this.advance()
      return {
        type: ASTNodeType.NUMBER,
        value: token.value as number,
      }
    }

    // Variable
    if (token.type === TokenType.VARIABLE) {
      this.advance()
      return {
        type: ASTNodeType.VARIABLE,
        value: token.value as string,
      }
    }

    // Parameter
    if (token.type === TokenType.PARAMETER) {
      this.advance()
      return {
        type: ASTNodeType.PARAMETER,
        value: token.value as string,
      }
    }

    // Function call
    if (token.type === TokenType.FUNCTION) {
      return this.parseFunctionCall()
    }

    // Parentheses
    if (token.type === TokenType.LPAREN) {
      this.advance() // consume (
      const node = this.parseExpression()
      this.expect(TokenType.RPAREN) // consume )
      return node
    }

    throw new Error(
      `Unexpected token ${token.type} at position ${token.position}`
    )
  }

  /**
   * Parse function call
   * FUNCTION_CALL := FUNCTION LPAREN ARGS RPAREN
   * ARGS := EXPRESSION (COMMA EXPRESSION)*
   */
  private parseFunctionCall(): ASTNode {
    const functionName = this.currentToken.value as string
    this.advance() // consume function name

    this.expect(TokenType.LPAREN) // consume (

    const args: ASTNode[] = []

    // Parse arguments (if any)
    if (this.currentToken.type !== TokenType.RPAREN) {
      args.push(this.parseExpression())

      while (this.currentToken.type === TokenType.COMMA) {
        this.advance() // consume comma
        args.push(this.parseExpression())
      }
    }

    this.expect(TokenType.RPAREN) // consume )

    return {
      type: ASTNodeType.FUNCTION_CALL,
      functionName,
      args,
    }
  }

  /**
   * Parse the entire formula
   */
  public parse(): ASTNode {
    const ast = this.parseExpression()

    if (this.currentToken.type !== TokenType.EOF) {
      throw new Error(
        `Unexpected token after expression: ${this.currentToken.type} at position ${this.currentToken.position}`
      )
    }

    return ast
  }
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Extract all variable and parameter dependencies from an AST
 */
export function extractDependencies(ast: ASTNode): string[] {
  const dependencies = new Set<string>()

  function traverse(node: ASTNode): void {
    if (node.type === ASTNodeType.VARIABLE && node.value) {
      dependencies.add(node.value as string)
    }

    if (node.type === ASTNodeType.PARAMETER && node.value) {
      dependencies.add(node.value as string)
    }

    if (node.left) traverse(node.left)
    if (node.right) traverse(node.right)
    if (node.args) {
      node.args.forEach(traverse)
    }
  }

  traverse(ast)
  return Array.from(dependencies)
}

/**
 * Validate a formula string
 */
export function validateFormula(formula: string): FormulaValidationResult {
  try {
    const tokenizer = new FormulaTokenizer(formula)
    const tokens = tokenizer.tokenize()

    const parser = new FormulaParser(tokens)
    const ast = parser.parse()

    const dependencies = extractDependencies(ast)

    return {
      valid: true,
      errors: [],
      dependencies,
      ast,
    }
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
      dependencies: [],
      ast: null,
    }
  }
}

/**
 * Parse a formula string into an AST
 */
export function parseFormula(formula: string): ASTNode {
  const tokenizer = new FormulaTokenizer(formula)
  const tokens = tokenizer.tokenize()
  const parser = new FormulaParser(tokens)
  return parser.parse()
}
