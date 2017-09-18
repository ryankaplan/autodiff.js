import {
  setNumberOfDerivativesToCompute,
  variableEvaluatedAtPoint,
  ISeries,
  SeriesOrNumber,
  toValueAndDerivatives,
  add,
  multiply,
  divide,
  sqrt,
  exp,
  ln,
  pow,
  sin,
  cos,
  tan,
} from '../src/autodiff'
import * as list from '../src/list'

function expectDerivatives(series: SeriesOrNumber, expected: number[]) {
  const derivatives = toValueAndDerivatives(series as ISeries)
  expect(derivatives.length).toBe(expected.length)
  let areEqual = true
  for (let i = 0; i < derivatives.length; i++) {
    if (Math.abs(derivatives[i] - expected[i]) >= .001) {
      areEqual = false
      break
    }
  }
  if (!areEqual) {
    expect(derivatives).toEqual(expected)
  }
}

describe('series list', () => {
  it('should work on polynomials with order 0', () => {
    // Given f(x) = 1 and g(x) = 1,
    //
    // h_0 = 1
    const f = [1]
    const g = [1]
    expect(list.convolve(f, g, 0)).toEqual(1)
  })

  it('should work on polynomials with order 1', () => {
    // Given f(x) = 1 + x and g(x) = 1 + x,
    //
    // h_0 = 1
    // h_1 = 2
    // h_2 = 1
    const f = [1, 1]
    const g = [1, 1]
    expect(list.convolve(f, g, 0)).toEqual(1)
    expect(list.convolve(f, g, 1)).toEqual(2)
  })

  it('should work on polynomials with order 2', () => {
    // Given f(x) = 1 + x + 2 x ^ 2 and g(x) = 1 + x + 3 x ^ 2,
    //
    // h_0 = 1
    // h_1 = 2
    // h_2 = 6
    const f = [1, 1, 2]
    const g = [1, 1, 3]
    expect(list.convolve(f, g, 0)).toEqual(1)
    expect(list.convolve(f, g, 1)).toEqual(2)
    expect(list.convolve(f, g, 2)).toEqual(6)
  })
})

beforeEach(() => {
  setNumberOfDerivativesToCompute(3)
})

describe('series', () => {
  it('add', () => {
    setNumberOfDerivativesToCompute(3)

    // f(x) = x at x = 2
    let x = variableEvaluatedAtPoint(2)
    expectDerivatives(x, [2, 1, 0, 0])

    // f(x) = x * 2 at x = 2
    let value = add(x, x)
    expectDerivatives(value, [4, 2, 0, 0])

  })

  it('multiply', () => {
    // f(x) = x * 132 at x = 2
    let x = variableEvaluatedAtPoint(2)
    let value = multiply(x, 132)
    expectDerivatives(value, [264, 132, 0, 0])

    // At x = 2...
    //
    // f(x)   = x ^ 2  = 4
    // f'(x)  = 2 x    = 4
    // f''(x) = 2      = 2
    value = multiply(x, x)
    expectDerivatives(value, [4, 4, 2, 0])

    // At x = -1
    //
    // f(x)    = 4 * x ^ 3   = -4
    // f'(x)   = 12 * x ^ 2  = 12
    // f''(x)  = 24 * x      = -24
    // f'''(x) = 24          = 24
    x = variableEvaluatedAtPoint(-1)
    value = multiply(multiply(multiply(x, x), x), 4)
    expectDerivatives(value, [-4, 12, -24, 24])
  })

  it('divide', () => {
    // At x = 6
    //
    // f(x)  = x / 3 = 2
    // f'(x) = 1 / 3 = 1 / 3
    let x = variableEvaluatedAtPoint(6)
    let value = divide(x, 3)
    expectDerivatives(value, [2, 1 / 3, 0, 0])

    // At x = 2
    //
    // f(x)    = (x + 2) / x   = 2
    // f'(x)   = - 2 / (x ^ 2) = - .5
    // f''(x)  = 4 / x ^ 3     = .5
    // f'''(x) = - 12 / x ^ 4  = - .75
    x = variableEvaluatedAtPoint(2)
    const twoX = add(x, 2)
    value = divide(twoX, x)
    expectDerivatives(value, [2, - .5, .5, - .75])
  })

  it('sqrt', () => {
    // At x = 16
    //
    // f(x)   = sqrt(x)               = 4
    // f'(x)  = 1 / (2 * sqrt(x))     = 1 / 8     = .125
    // f''(x) = - 1 / (4 x ^ (3 / 2)) = - 1 / 256 = - .0039...
    let x = variableEvaluatedAtPoint(16)
    let value = sqrt(x)
    expectDerivatives(value, [4, 0.125, -0.00390625, 0.0003662109375])

    // At x = 16...
    //
    // f(x)   = sqrt(x + 1)
    // f'(x)  = 1 / (2 sqrt(x + 1))
    // f''(x) = - 1 / (4 (x + 1) ^ 3 / 2)
    // ...
    //
    const pt = 16
    x = variableEvaluatedAtPoint(pt)
    value = sqrt(add(x, 1))
    expectDerivatives(value, [
      Math.sqrt(pt + 1),
      1 / (2 * Math.sqrt(pt + 1)),
      - 1 / (4 * Math.pow(pt + 1, 3 / 2)),
      - 3 / (8 * Math.pow(pt + 1, 5 / 2)),
    ])
  })

  it('exp', () => {
    // At x = 2
    //
    // f(x)    = exp(x ^ 2)                   = Math.exp(4)
    // f'(x)   = 2 x exp(x ^ 2)               = 4 * Math.exp(4)
    // f''(x)  = 2 (2 x ^ 2 + 1) exp(x ^ 2)   = 18 * Math.exp(4)
    // f'''(x) = 4 x exp(x ^ 2) (2 x ^ 2 + 3) = 88 * Math.exp(4)
    let x = variableEvaluatedAtPoint(2)
    let value = exp(multiply(x, x))
    expectDerivatives(value, [
      Math.exp(4),
      4 * Math.exp(4),
      18 * Math.exp(4),
      88 * Math.exp(4),
    ])
  })

  it('ln', () => {
    // At x = Math.E
    //
    // f(x)   = ln(x * x)   = 2
    // f'(x)  = 2 / x       = 2 / e
    // f''(x) = - 2 / x ^ 2 = - 2 / e ^ 2
    // f'''(x) = 4 / x ^ 3  = 4 / e ^ 3
    let x = variableEvaluatedAtPoint(Math.E)
    let value = ln(multiply(x, x))
    expectDerivatives(value, [
      2,
      2 / Math.E,
      - 2 / Math.pow(Math.E, 2),
      4 / Math.pow(Math.E, 3),
    ])
  })

  it('pow', () => {
    // At x = 2
    //
    // f(x)    = x ^ x
    // f'(x)   = x ^ x (ln(x) + 1)
    // f''(x)  = x ^ x (1 / x + (ln(x) + 1) ^ 2)
    // f'''(x) = TODO(ryan): fill this in
    const pt = 2
    let x = variableEvaluatedAtPoint(pt)
    let value = pow(x, x)
    expectDerivatives(value, [
      Math.pow(pt, pt),
      Math.pow(pt, pt) * (Math.log(pt) + 1),
      Math.pow(pt, pt) * (1 / pt + Math.pow(Math.log(pt) + 1, 2)),
      28.574184025053153,
    ])
  })

  it('sin', () => {
    // At x = 2
    //
    // f(x) = sin(x + 1)
    // f'(x) = cos(x + 1)
    // f''(x) = - sin(x + 1)
    // f'''(x) = - cos(x + 1)
    const pt = 2
    const x = variableEvaluatedAtPoint(pt)
    let value = sin(add(x, 1))
    expectDerivatives(value, [
      Math.sin(pt + 1),
      Math.cos(pt + 1),
      - Math.sin(pt + 1),
      - Math.cos(pt + 1),
    ])
  })

  it('cos', () => {
    // At x = 2
    //
    // f(x) = cos(x + 1)
    // f'(x) = - sin(x + 1)
    // f''(x) = - cos(x + 1)
    // f'''(x) = sin(x + 1)
    const pt = 2
    const x = variableEvaluatedAtPoint(pt)
    let value = cos(add(x, 1))
    expectDerivatives(value, [
      Math.cos(pt + 1),
      - Math.sin(pt + 1),
      - Math.cos(pt + 1),
      Math.sin(pt + 1),
    ])
  })

  it('tan', () => {
    // At x = 2
    //
    // f(x) = tan(x + 1)
    // f'(x) = sec(x + 1) ^ 2
    // f''(x) = 2 tan(x + 1) sec(x + 1) ^ 2
    // f'''(x) = 2 sec(x + 1) ^ 4 + 4 tan(x + 1) ^ 2 sec(x + 1) ^ 2
    const pt = 2
    const x = variableEvaluatedAtPoint(pt)
    let value = tan(add(x, 1))
    const t = Math.tan(pt + 1)
    const s = 1 / Math.cos(pt + 1)
    expectDerivatives(value, [
      t,
      s * s,
      2 * t * s * s,
      2 * s * s * s * s + 4 * t * t * s * s,
    ])
  })
})
