import { ParserError, ErrorMsg } from './error'
import { supportedFunctions } from '../code-generation/code-generator'

export enum TokenType {
  NONE,

  // arithmetic operators
  PLUS,
  MINUS,
  MULTIPLY,
  DIVIDE,
  POW,

  // grouping
  LEFT_PAREN,
  RIGHT_PAREN,

  // number literals
  FLOAT_LITERAL,
  INT_LITERAL,

  // single characters, or a known identifier like sin
  IDENTIFIER,
  EOF,
}

// Returns true if this token is the start of an expression that evaluates
// to a value.
//
// "5" <-- evaluates to 5
// "x" <-- evaluates to the value of x
// "sin(x)" <-- "sin" is the start of an expression that evaluates to a value
//              but "(" is not
//
function startsExpression(token: Token) {
  const type = token.type
  return (
    type === TokenType.IDENTIFIER ||
    type === TokenType.INT_LITERAL ||
    type === TokenType.FLOAT_LITERAL ||
    type === TokenType.LEFT_PAREN
  )
}

function endsExpression(token: Token) {
  const type = token.type

  // Hack: we specifically don't insert multiplications between tokens like
  // 'sin' and '(x)' which should be function calls
  const isSpecialFunction = (
    token.type === TokenType.IDENTIFIER &&
    supportedFunctions.indexOf(token.value) !== -1
  )

  return (
    !isSpecialFunction &&
    type === TokenType.IDENTIFIER ||
    type === TokenType.INT_LITERAL ||
    type === TokenType.FLOAT_LITERAL ||
    type === TokenType.RIGHT_PAREN
  )
}

export interface Token {
  type: TokenType
  value: string
}

function insertImplicitMultiplications(tokens: Token[]) {
  const result: Token[] =[]
  for (let token of tokens) {
    if (result.length === 0) {
      result.push(token)
      continue
    }

    // Decide if we should insert a multiplication before the
    // next symbol.
    const prevToken = result[result.length - 1]
    const nextToken = token

    if (endsExpression(prevToken) && startsExpression(nextToken)) {
      // Pretend that we saw a '*' token
      result.push({
        type: TokenType.MULTIPLY,
        value: '*',
      })
    }

    result.push(nextToken)
  }
  return result
}

// The order of or-operands in the regex below is important because it does
// greedy matching. The operands match on the following types of tokens...
//
// floating point numbers, e.g. '27834.23478'
// floating point numbers, e.g. '34.'
// floating point numbers, e.g., '.34'
// integers, e.g. '34'
// whitespace, e.g. ' '
// operators, e.g. '*'
// identifiers, e.g. 'x' or 'cat'
// parentheses, e.g. '(' and ')'
const tokenRegex = new RegExp(
  `([0-9]+\\.[0-9]+|[0-9]+\\.|\\.[0-9]+|[0-9]+|[ \t\r\n]+|[-\+\*\/^]|[a-zA-Z]+|[\(\)])`
)

export function tokenize(input: string): Token[] {
  const parts = input.split(tokenRegex)
  const tokens: Token[] = []
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]

    if (i % 2 === 0) {
      if (part.length !== 0) {
        // We failed to parse this piece of text
        throw new ParserError(ErrorMsg.invalidCharacter(part[0]))
      }
      continue
    }

    if ((part[0] >= '0' && part[0] <= '9') || part[0] === '.' && part.length !== 0) {
      // Either a float or integer
      if (part.indexOf('.') === 0) {
        tokens.push({
          type: TokenType.INT_LITERAL,
          value: part,
        })
      } else {
        tokens.push({
          type: TokenType.FLOAT_LITERAL,
          value: part,
        })
      }
    }

    else if (part[0] === ' ' || part[0] === '\t' || part[0] === '\r' || part[0] === '\n') {
      // Ignore all whitespace.
    }

    else if ((part[0] >= 'a' && part[0] <= 'z') || (part[0] >= 'A' && part[0] <= 'Z')) {
      // Identifier
      tokens.push({
        type: TokenType.IDENTIFIER,
        value: part,
      })
    }

    else if (part[0] === '-' || part[0] === '*' || part[0] === '/' || part[0] === '+' || part[0] === '^') {
      // Operator
      const type = (
        part[0] === '-' ? TokenType.MINUS :
        part[0] === '+' ? TokenType.PLUS :
        part[0] === '/' ? TokenType.DIVIDE :
        part[0] === '*' ? TokenType.MULTIPLY :
        part[0] === '^' ? TokenType.POW :
        TokenType.NONE
      )

      tokens.push({
        type,
        value: part,
      })
    }

    else if (part[0] === '(' || part[0] === ')') {
      tokens.push({
        type: part[0] === '(' ? TokenType.LEFT_PAREN : TokenType.RIGHT_PAREN,
        value: part,
      })
    }

    else {
      throw new ParserError(ErrorMsg.invalidCharacter(part[0]))
    }
  }

  return insertImplicitMultiplications(tokens)
}