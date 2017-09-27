// This file implements a recursive descent "pratt parser". If you're
// interested in how this works, or how to build it for yourself,
// I recommend this excellent introduction:
//
// http://journal.stuffwithstuff.com/2011/03/19/pratt-parsers-expression-parsing-made-easy/
//

import { Token, TokenType } from './tokenizer'
import { ParserContext } from './parser-context'
import { ParserError, ErrorMsg } from './error'
import { Node, NodeType } from './expression-parser'

export enum Precedence {
  LOWEST,
  SUM,
  PRODUCT,
  EXPONENT,
  PREFIX,
  CALL
}

export interface PrefixParse {
  (parser: ExpressionParser, token: Token): Node
}

export interface InfixParse {
  (parser: ExpressionParser, left: Node, token: Token): Node
}

export interface Parselet {
  prefixParse?: PrefixParse | null
  infixPrecedence?: Precedence | null
  infixParse?: InfixParse | null
}

export class ExpressionParser {
  private _parselets: { [key: number]: Parselet } = Object.create(null)

  constructor(
    private _ctx: ParserContext
  ) { }

  public registerParseletPrefix(tokenType: TokenType, prefixParse: PrefixParse) {
    this.getParselet(tokenType).prefixParse = prefixParse
  }

  public registerParseletInfix(tokenType: TokenType, infixPrecedence: Precedence, infixParse: InfixParse) {
    this.getParselet(tokenType, infixPrecedence).infixParse = infixParse
  }

  // Used for literals, names, and other single-token nodes
  public registerTerminal(tokenType: TokenType, createNode: (token: Token) => Node) {
    this.registerParseletPrefix(tokenType, (_: ExpressionParser, token: Token) => {
      return createNode(token)
    })
  }

  public registerPrefixUnaryOperator(tokenType: TokenType) {
    this.registerParseletPrefix(tokenType, (parser: ExpressionParser, token: Token) => {
      const operand = parser.parseExpression(Precedence.PREFIX)
      if (!operand) {
        // It's possible that the user has entered some totally invalid input, like
        // "--=++-=+"" but it's more likely that they've typed in something like
        // "f(x) = -" and are about to type an operand.
        throw new ParserError(ErrorMsg.operatorMissingRightOperand(token.value))
      }

      return {
        type: NodeType.PREFIX_OPERATOR,
        token,
        argument: operand,
      }
    })
  }

  public registerInfixBinaryOperator(tokenType: TokenType, precedence: Precedence) {
    this.registerParseletInfix(tokenType, precedence, (parser: ExpressionParser, left: Node, token: Token) => {
      const right = parser.parseExpression(precedence)
      if (!right) {
        // It's possible that the user has entered some totally invalid input, like
        // "3 --=++-=+"" but it's more likely that they've typed in something like
        // "f(x) = 3 + ".
        throw new ParserError(ErrorMsg.operatorMissingRightOperand(token.value))
      }

      return {
        type: NodeType.BINARY_OPERATOR,
        token,
        firstArgument: left,
        secondArgument: right,
      }
    })
  }

  public getParselet(tokenType: TokenType, infixPrecedence: Precedence | null = null): Parselet {
    if (!this._parselets[tokenType]) {
      this._parselets[tokenType] = {
        prefixParse: null,
        infixPrecedence: null,
        infixParse: null,
      }
    }

    const parselet = this._parselets[tokenType]
    if (infixPrecedence !== null) {
      parselet.infixPrecedence = infixPrecedence
    }
    return parselet
  }

  public peek(): Token {
    return this._ctx.peek()
  }

  public consumeIfPresent(tokenType: TokenType): boolean {
    if (this._ctx.peek().type === tokenType) {
      this._ctx.next()
      return true
    }
    return false
  }

  private peekTokenPrecedence(): Precedence {
    const token = this._ctx.peek()
    if (!token) {
      return Precedence.LOWEST
    }

    const parselet = this._parselets[token.type]
    return (
      parselet && parselet.infixPrecedence != null ?
      parselet.infixPrecedence :
      Precedence.LOWEST
    )
  }

  public parseExpression(precedence: number): Node | null {
    let token = this._ctx.peek()
    if (!token) {
      throw Error('Missing token in parseExpression')
    }

    const parselet = this._parselets[token.type]
    if (!parselet || !parselet.prefixParse) {
      // This might happen if the user calls parseExpression when there isn't
      // an expression present. TODO(ryan): log an error when this happens.
      return null
    }

    // Above we peeked at the current token. Now that we have a prefix parselet
    // for it - and we think it will parse - consume it.
    this._ctx.next()

    let left = parselet.prefixParse(this, token)
    while (precedence < this.peekTokenPrecedence()) {
      token = this._ctx.next()

      const parselet = this._parselets[token.type]
      if (!parselet || !parselet.infixParse) {
        throw Error('Missing parselet or infix parselet')
      }

      left = parselet.infixParse(this, left, token)
    }

    return left
  }
}
