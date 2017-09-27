import { parseExpression, toDebugString } from './expression-parser'
import { ErrorMsg } from './error'

function checkParse(input: string, expected: string) {
  const res = parseExpression(input)
  expect(res.userReadableError).toBe(null)
  expect(toDebugString(res.expression)).toEqual(expected)
}

function checkParseFails(input: string, expected: string) {
  const res = parseExpression(input)
  expect(res.userReadableError).toBe(expected)
  expect(res.expression).toEqual(null)
}

describe('expression parser', () => {
  it('should handle simple expressions', () => {
    checkParse(`1`, `[1]`)
    checkParse(`-1`, `[- [1]]`)
    checkParse(`x`, `[x]`)
    checkParse(`x + 1`, `[[x] + [1]]`)
    checkParse(`x * y`, `[[x] * [y]]`)
    checkParse(`x / 2`, `[[x] / [2]]`)
    checkParse(`x ^ (a + b)`, `[[x] ^ [( [[a] + [b]] )]]`)
    checkParse(`- + - x`, `[- [+ [- [x]]]]`)
  })

  it('should treat math operations with appropriate precedence', () => {
    // * and / have higher precedence than + or -
    checkParse(`a + b * c`, `[[a] + [[b] * [c]]]`)
    checkParse(`a - b / c`, `[[a] - [[b] / [c]]]`)

    // ^ has higher precedence than multiplication
    checkParse(`a * b ^ c`, `[[a] * [[b] ^ [c]]]`)
  })

  it('should give errors for invalid expressions', () => {
    checkParseFails(`x + (y +`, ErrorMsg.operatorMissingRightOperand('+'))
    checkParseFails(`x + (y`, ErrorMsg.missingRightParen)
    checkParseFails(`x + (`, ErrorMsg.genericFailure)
    checkParseFails(`3~`, ErrorMsg.invalidCharacter('~'))
    checkParseFails(`x!`, ErrorMsg.invalidCharacter('!'))
  })
})