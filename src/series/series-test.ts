import { ISeries } from '../autodiff'
import {
  setNumberOfDerivativesToCompute,
  variableEvaluatedAtPoint,
  SeriesOrNumber,
  toValueAndDerivatives,

  add,
  multiply,
  divide,

  negative,

  exp,
  log,

  sqrt,
  pow,

  sin,
  cos,
  tan,

  asin,
  acos,
  atan,
} from './series'

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

beforeEach(() => {
  setNumberOfDerivativesToCompute(3)
})

describe('series', () => {
  it('negative', () => {
    // f(x) = - x at x = 2
    const x = variableEvaluatedAtPoint(2)
    expectDerivatives(negative(x), [- 2, - 1, 0, 0])

    // f(x) = x + x at x = 2
    const value = add(x, x)
    expectDerivatives(value, [4, 2, 0, 0])
  })

  it('add', () => {
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

  it('exp for x > 0, x = 0 and x < 0', () => {
    for (let pt of [ 2, 0, -2 ]) {
      // f(x)    = exp(x ^ 2)
      // f'(x)   = 2 x exp(x ^ 2)
      // f''(x)  = 2 (2 x ^ 2 + 1) exp(x ^ 2)
      // f'''(x) = 4 x exp(x ^ 2) (2 x ^ 2 + 3)
      const x = variableEvaluatedAtPoint(pt)
      const value = exp(multiply(x, x))
      expectDerivatives(value, [
        Math.exp(pt * pt),
        2 * pt * Math.exp(pt * pt),
        2 * (2 * pt * pt + 1) * Math.exp(pt * pt),
        4 * pt * Math.exp(pt * pt) * (2 * pt * pt + 3),
      ])
    }
  })

  it('log of x > 1, x < 1 and x < 0', () => {
    // f(x)   = log(x * x)   = 2
    // f'(x)  = 2 / x       = 2 / e
    // f''(x) = - 2 / x ^ 2 = - 2 / e ^ 2
    // f'''(x) = 4 / x ^ 3  = 4 / e ^ 3
    for (let pt of [ Math.E, .5, -1 ]) {
      const x = variableEvaluatedAtPoint(pt)
      const value = log(multiply(x, x))
      expectDerivatives(value, [
        Math.log(pt * pt),
        2 / pt,
        - 2 / (pt * pt),
        4 / (pt * pt * pt),
      ])
    }
  })

  // Test the following combinations of cases for pow(a, b)
  // with a >= 0
  //
  //  a === 0, 0 < a < 1, and a > 1
  //  positive and negative integer exponent
  //  positive and negative fractional exponent
  //
  // Testing pow with negative base is done below because it
  // takes a separate code path.
  it('pow(a, b) where a >= 0', () => {
    // f(x)    = x ^ b
    // f'(x)   = b x ^ (b - 1)
    // f''(x)  = b (b - 1) x ^ (b - 2)
    // f'''(x) = b (b - 1) (b - 2) x ^ (b - 3)
    for (let pt of [ 0, .5, 2 ]) {
      for (let b of [ -2, -.5, 0, .5, 2 ]) {
        const x = variableEvaluatedAtPoint(pt)
        const value = pow(x, b)
        expectDerivatives(value, [
          pt ** b,
          b * pt ** (b - 1),
          b * (b - 1) * pt ** (b - 2),
          b * (b - 1) * (b - 2) * pt ** (b - 3),
        ])
      }
    }
  })

  it('pow(a, b) where a < 0', () => {
    // Check that taking the power of a negative base returns NaNs.
    const pt = -1
    const x = variableEvaluatedAtPoint(pt)
    const value = pow(x, .5)
    const coefficients = (value as any).coefficients
    expect(coefficients[0]).toBeNaN()
    expect(coefficients[1]).toBeNaN()
    expect(coefficients[2]).toBe(0)
    expect(coefficients[3]).toBe(0)
  })

  it('pow(a, b) where both a and b are series', () => {
    // f(x)    = x ^ x
    // f'(x)   = x ^ x (log(x) + 1)
    // f''(x)  = x ^ x (1 / x + (log(x) + 1) ^ 2)
    // f'''(x) = x ^ (x - 2) * (
    //             x ^ 2 +
    //             x ^ 2 log(x) ^ 3 +
    //             3 x ^ 2 log(x) ^ 2 +
    //             3 x +
    //             3 x (x + 1) log(x) -
    //             1
    //           )
    const pt = -3
    const x = variableEvaluatedAtPoint(pt)
    const value = pow(x, x)
    expectDerivatives(value, [
      Math.pow(pt, pt),
      Math.pow(pt, pt) * (Math.log(pt) + 1),
      Math.pow(pt, pt) * (1 / pt + Math.pow(Math.log(pt) + 1, 2)),
      Math.pow(pt, pt - 2) * (
        pt * pt +
        pt * pt * Math.log(pt) ** 3 +
        3 * pt * pt * Math.log(pt) ** 2 +
        3 * pt +
        3 * pt * (pt + 1) * Math.log(pt) -
        1
      ),
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

  it('asin', () => {
    // At x = .5
    //
    // f(x) = asin(x)
    // f'(x) = 1 / sqrt(1 - x ^ 2)
    // f''(x) = x / (1 - x ^ 2) ^ (3 / 2)
    // f'''(x) = (2 x ^ 2 + 1) / (1 - x ^ 2) ^ (5 / 2)
    const pt = .5
    const x = variableEvaluatedAtPoint(pt)
    let value = asin(x)
    expectDerivatives(value, [
      Math.asin(pt),
      1 / Math.sqrt(1 - pt * pt),
      pt / Math.pow(1 - pt * pt, 3 / 2),
      (2 * pt * pt + 1) / Math.pow(1 - pt * pt, 5 / 2),
    ])
  })

  it('acos', () => {
    // At x = .5
    //
    // f(x) = acos(x)
    // f'(x) = - 1 / sqrt(1 - x ^ 2)
    // f''(x) = - x / (1 - x ^ 2) ^ (3 / 2)
    // f'''(x) = - (2 x ^ 2 + 1) / (1 - x ^ 2) ^ (5 / 2)
    const pt = .5
    const x = variableEvaluatedAtPoint(pt)
    let value = acos(x)
    expectDerivatives(value, [
      Math.acos(pt),
      - 1 / Math.sqrt(1 - pt * pt),
      - pt / Math.pow(1 - pt * pt, 3 / 2),
      - (2 * pt * pt + 1) / Math.pow(1 - pt * pt, 5 / 2),
    ])
  })

  it('atan', () => {
    // At x = .5
    //
    // f(x) = atan(x)
    // f'(x) = 1 / (1 + x ^ 2)
    // f''(x) = - 2 x / (x ^ 2 + 1) ^ 2
    // f'''(x) = (6 x ^ 2 - 2) / (x ^ 2 + 1) ^ 3
    const pt = .5
    const x = variableEvaluatedAtPoint(pt)
    let value = atan(x)
    expectDerivatives(value, [
      Math.atan(pt),
      1 / (1 + pt * pt),
      - 2 * pt / Math.pow(pt * pt + 1, 2),
      (6 * pt * pt - 2) / Math.pow(pt * pt + 1, 3)
    ])
  })
})
