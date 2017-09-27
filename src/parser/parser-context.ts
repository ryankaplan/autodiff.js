// ParserContext is a class that makes it easier for the parser to
// consume tokens in an easy-to-read way.

import { Stream } from './stream'
import { Token, TokenType } from './tokenizer'

export class ParserContext {
  constructor(
    private _tokens: Stream<Token>
  ) { }

  public hasMoreTokens() {
    return !this._tokens.isDone()
  }

  public advanceToNextTokenOfType(tokenType: TokenType): boolean {
    while (this.peek().type !== tokenType && this.peek().type !== TokenType.EOF) {
      this.next()
    }

    return this.peek().type !== TokenType.EOF
  }

  public consumeIfType(tokenType: TokenType): Token | null {
    if (this.peek().type === tokenType) {
      return this.next()
    }
    return null
  }

  public consumeIf(predicate: (token: Token) => boolean): Token | null {
    const token = this.peek()
    if (predicate(token)) {
      return this._tokens.next()
    }
    return null
  }

  public peek(): Token {
    const token = this._tokens.peek()
    return token ? token : { type: TokenType.EOF, value: null }
  }

  public next(): Token {
    const token = this.peek()
    this._tokens.next()
    return token
  }
}