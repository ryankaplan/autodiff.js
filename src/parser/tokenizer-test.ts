import { tokenize } from './tokenizer'
import { isParserError, ErrorMsg } from './error'

function checkTokens(input: string, expected: string[]) {
  const tokens = tokenize(input).map(t => t.value)
  expect(tokens).toEqual(expected)
}

function checkError(input: string, expected: string) {
  let didThrow = false

  try {
    tokenize(input)
  } catch (e) {
    didThrow = true
    expect(isParserError(e)).toBe(true)
    if (isParserError(e)) {
      expect(e.message).toEqual(expected)
    }
  }

  expect(didThrow).toBe(true)
}

describe('tokenizer', () => {
  it('should tokenize simple expressions', () => {
    // single-char identifiers
    checkTokens('a', ['a'])

    // integers
    checkTokens('1', ['1'])

    // floats
    checkTokens('1.7834', ['1.7834'])

    // floats withour prededing digit
    checkTokens('.7', ['.7'])

    // addition
    checkTokens(`a + b`, ['a', '+', 'b'])
    checkTokens(`a+b`, ['a', '+', 'b'])

    // groups
    checkTokens(`(a + b)`, ['(', 'a', '+', 'b', ')'])

    // multiple-character identifiers
    checkTokens(`and ^ bat / cat - dat`, ['and', '^', 'bat', '/', 'cat', '-', 'dat'])
  })

  it('should insert multiplications when necessary', () => {
    checkTokens('a b', ['a', '*', 'b'])
    checkTokens('(a) (b)', ['(', 'a', ')', '*', '(', 'b', ')'])
    checkTokens('3 4', ['3', '*', '4'])
    checkTokens('3. .4', ['3.', '*', '.4'])
    checkTokens('(a)b', ['(', 'a', ')', '*', 'b'])
  })

  it('should give errors for invalid tokens', () => {
    checkError('c.d', ErrorMsg.invalidCharacter('.'))
    checkError('[a]', ErrorMsg.invalidCharacter('['))
    checkError('3~', ErrorMsg.invalidCharacter('~'))
  })
})
