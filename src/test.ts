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
  log,
  pow,

  sin,
  cos,
  tan,

  asin,
  acos,
  atan,
} from '../src/autodiff'

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

  it('log', () => {
    // At x = Math.E
    //
    // f(x)   = log(x * x)   = 2
    // f'(x)  = 2 / x       = 2 / e
    // f''(x) = - 2 / x ^ 2 = - 2 / e ^ 2
    // f'''(x) = 4 / x ^ 3  = 4 / e ^ 3
    let x = variableEvaluatedAtPoint(Math.E)
    let value = log(multiply(x, x))
    expectDerivatives(value, [
      2,
      2 / Math.E,
      - 2 / Math.pow(Math.E, 2),
      4 / Math.pow(Math.E, 3),
    ])
  })

  it('pow works with two series arguments', () => {
    // At x = 2
    //
    // f(x)    = x ^ x
    // f'(x)   = x ^ x (log(x) + 1)
    // f''(x)  = x ^ x (1 / x + (log(x) + 1) ^ 2)
    // f'''(x) = TODO(ryan): fill this in
    const pt = 2
    const x = variableEvaluatedAtPoint(pt)
    const value = pow(x, x)
    expectDerivatives(value, [
      Math.pow(pt, pt),
      Math.pow(pt, pt) * (Math.log(pt) + 1),
      Math.pow(pt, pt) * (1 / pt + Math.pow(Math.log(pt) + 1, 2)),
      28.574184025053153,
    ])
  })

  // TODO(ryan): make this function work!
  //
  // it('pow works with negative powers', () => {
  //   // At x = 2
  //   //
  //   // f(x)    = x ^ - 2 = 1 / 4
  //   // f'(x)   = - 2 x  = - 4
  //   // f''(x)  = - 2    = - 2
  //   // f'''(x) = 0      = 0
  //   const pt = 2
  //   const x = variableEvaluatedAtPoint(pt)
  //   const value = pow(x, -2)
  //   expectDerivatives(value, [
  //     Math.pow(pt, -2),
  //     - 2 * pt,
  //     - 2,
  //     0,
  //   ])
  // })

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
