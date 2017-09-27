import { tokenize, Token, TokenType } from './tokenizer'
import { Stream } from './stream'
import { isParserError, ParserError, ErrorMsg } from './error'
import { ParserContext } from './parser-context'
import { ExpressionParser, Precedence } from './pratt-parser'

// Define type Node which describes a node in our AST
////////////////////////////////////////////////////////////

export enum NodeType {
  FUNCTION_CALL,
  IDENTIFIER,
  LITERAL,
  PREFIX_OPERATOR,
  BINARY_OPERATOR,
  GROUP,
}

export interface FunctionCall {
  type: NodeType.FUNCTION_CALL
  token: Token
  function: Identifier
  argument: Node
}

export interface Identifier {
  type: NodeType.IDENTIFIER
  token: Token
}

export interface Literal {
  type: NodeType.LITERAL
  token: Token
}

export interface PrefixOperator {
  type: NodeType.PREFIX_OPERATOR
  token: Token
  argument: Node
}

export interface BinaryOperator {
  type: NodeType.BINARY_OPERATOR
  token: Token
  firstArgument: Node
  secondArgument: Node
}

export interface Group {
  type: NodeType.GROUP
  token: Token
  argument: Node
}

export type Node =
  FunctionCall |
  Identifier |
  Literal |
  PrefixOperator |
  BinaryOperator |
  Group

export function children(node: Node): Node[] {
  switch (node.type) {
    case NodeType.BINARY_OPERATOR: return [ node.firstArgument, node.secondArgument ]
    case NodeType.FUNCTION_CALL: return [ node.argument ]
    case NodeType.IDENTIFIER: return []
    case NodeType.LITERAL: return []
    case NodeType.PREFIX_OPERATOR: return [ node.argument ]
    case NodeType.GROUP: return [ node.argument ]
  }
}

export function toDebugString(node: Node): string {
  switch (node.type) {
    case NodeType.BINARY_OPERATOR:
      return `[${toDebugString(node.firstArgument)} ${node.token.value} ${toDebugString(node.secondArgument)}]`
    case NodeType.FUNCTION_CALL: return `[${toDebugString(node.function)}(${toDebugString(node.argument)})]`
    case NodeType.IDENTIFIER: return `[${node.token.value}]`
    case NodeType.LITERAL: return `[${node.token.value}]`
    case NodeType.PREFIX_OPERATOR: return `[${node.token.value} ${toDebugString(node.argument)}]`
    case NodeType.GROUP: return `[( ${toDebugString(node.argument)} )]`
  }
}

export function forEachNode(node: Node, callback: (node: Node) => void) {
  switch (node.type) {
    case NodeType.BINARY_OPERATOR: {
      forEachNode(node.firstArgument, callback);
      forEachNode(node.secondArgument, callback);
      break;
    }
    case NodeType.IDENTIFIER:
    case NodeType.LITERAL: {
      break;
    }
    case NodeType.FUNCTION_CALL:
    case NodeType.PREFIX_OPERATOR:
    case NodeType.GROUP: {
      forEachNode(node.argument, callback);
      break;
    }
  }

  callback(node);
}

// define parseExpression, an exported method for parsing
// a string into either an AST or a user-readable error.
////////////////////////////////////////////////////////////

export interface ParsedExpression {
  expression: Node
  userReadableError: string
}

export function parseExpression(source: string): ParsedExpression {
  source = source.trim()

  if (source.length === 0) {
    // An empty expression is valid (i.e. doesn't deserve an error message).
    return {
      expression: null,
      userReadableError: ''
    }
  }

  let tokens: Stream<Token> = null
  try {
    tokens = new Stream<Token>(tokenize(source))
  } catch (err) {
    if (isParserError(err)) {
      return {
        expression: null,
        userReadableError: err.message,
      }
    }
  }

  const ctx = new ParserContext(tokens)
  const parser = new ExpressionParser(ctx)

  parser.registerTerminal(TokenType.INT_LITERAL, (token: Token) => {
    return {
      type: NodeType.LITERAL,
      token,
    }
  })

  parser.registerTerminal(TokenType.FLOAT_LITERAL, (token: Token) => {
    return {
      type: NodeType.LITERAL,
      token,
    }
  })

  parser.registerTerminal(TokenType.IDENTIFIER, (token: Token) => {
    return {
      type: NodeType.IDENTIFIER,
      token,
    }
  })

  parser.registerPrefixUnaryOperator(TokenType.PLUS)
  parser.registerPrefixUnaryOperator(TokenType.MINUS)

  parser.registerInfixBinaryOperator(TokenType.PLUS, Precedence.SUM)
  parser.registerInfixBinaryOperator(TokenType.MINUS, Precedence.SUM)
  parser.registerInfixBinaryOperator(TokenType.MULTIPLY, Precedence.PRODUCT)
  parser.registerInfixBinaryOperator(TokenType.DIVIDE, Precedence.PRODUCT)
  parser.registerInfixBinaryOperator(TokenType.POW, Precedence.EXPONENT)

  // Parse groups
  parser.registerParseletPrefix(TokenType.LEFT_PAREN, (parser: ExpressionParser, _: Token): Group => {
    const peek = parser.peek()
    if (peek && peek.value === ')') {
      throw new ParserError(ErrorMsg.emptyParens)
    }

    const expr = parser.parseExpression(Precedence.LOWEST)
    if (!expr) {
      throw new ParserError(ErrorMsg.genericFailure)
    }

    if (!parser.consumeIfPresent(TokenType.RIGHT_PAREN)) {
      throw new ParserError(ErrorMsg.missingRightParen)
    }

    return {
      type: NodeType.GROUP,
      token: null,
      argument: expr,
    }
  })

  // Parse function calls
  parser.registerParseletInfix(
    TokenType.LEFT_PAREN,
    Precedence.CALL,
    (parser: ExpressionParser, left: Node, _: Token): FunctionCall => {
      const children: Array<Node> = []
      children.push(left)

      // This parser only supports function calls with a single argument, like
      // sin(x), tan(x + y) and not pow(a, b).
      const expr = parser.parseExpression(Precedence.LOWEST)
      if (!expr) {
        throw new ParserError(ErrorMsg.invalidArgument(left.token.value))
      }

      if (!parser.consumeIfPresent(TokenType.RIGHT_PAREN)) {
        throw new ParserError(ErrorMsg.missingRightParen)
      }

      if (left.type !== NodeType.IDENTIFIER) {
        throw new ParserError(ErrorMsg.nonIdentifierFunctionName)
      }

      return {
        type: NodeType.FUNCTION_CALL,
        token: null,
        function: left,
        argument: expr,
      }
  })

  let expression: Node = null
  let userReadableError = null

  try {
    expression = parser.parseExpression(Precedence.LOWEST)
  } catch (err) {
    if (isParserError(err)) {
      userReadableError = err.message
    } else {
      userReadableError = ErrorMsg.genericFailure
    }
  }

  if (!userReadableError && ctx.hasMoreTokens()) {
    userReadableError = ErrorMsg.genericFailure
  }

  if (userReadableError != null) {
    return { expression: null, userReadableError }
  }

  return {
    expression,
    userReadableError,
  }
}
