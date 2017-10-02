import {
  setNumberOfDerivativesToCompute,
  xEvaluatedAtPoint,
  yEvaluatedAtPoint,
  constantValue,
  Series2D,
  toValueAndDerivatives,

  dConvolve,
  convolve,

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
} from './series2d'

function expectDerivatives(series: Series2D, expected: number[]) {
  const derivatives = toValueAndDerivatives(series)
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
  setNumberOfDerivativesToCompute(2)
})

describe('series2D', () => {
  it('convolve', () => {
    const a = new Series2D()
    a.coefficients = [
      1, 2, 3,
      4, 5, 6,
      7, 8, 9
    ]

    const b = new Series2D()
    b.coefficients = [
      10, 11, 12,
      13, 14, 15,
      16, 17, 18
    ]

    expect(convolve(a, b, 1, 1)).toBe(1 * 10)

    expect(convolve(a, b, 1, 2)).toBe(1 * 13 + 4 * 10)
    expect(convolve(a, b, 2, 1)).toBe(1 * 11 + 2 * 10)

    expect(convolve(a, b, 1, 3)).toBe(1 * 16 + 4 * 13 + 7 * 10)
    expect(convolve(a, b, 3, 1)).toBe(1 * 12 + 2 * 11 + 3 * 10)

    expect(convolve(a, b, 2, 2)).toBe(1 * 14 + 2 * 13 + 4 * 11 + 5 * 10)
    expect(convolve(a, b, 2, 3)).toBe(
      1 * 17 + 2 * 16 +
      4 * 14 + 5 * 13 +
      7 * 11 + 8 * 10
    )
    expect(convolve(a, b, 3, 2)).toBe(
      1 * 15 + 2 * 14 + 3 * 13 +
      4 * 12 + 5 * 11 + 6 * 10
    )

    expect(convolve(a, b, 3, 3)).toBe(
      1 * 18 + 2 * 17 + 3 * 16 +
      4 * 15 + 5 * 14 + 6 * 13 +
      7 * 12 + 8 * 11 + 9 * 10
    )
  })

  it('dConvolve', () => {
    const a = new Series2D()
    a.coefficients = [
      1, 2, 3,
      4, 5, 6,
      7, 8, 9
    ]

    const b = new Series2D()
    b.coefficients = [
      10, 11, 12,
      13, 14, 15,
      16, 17, 18
    ]

    // This is going to iterate from (1, 0) to (2, 2) in a
    // and (0, 0) to (1, 2) in b, skipping the last term.
    let index = [2, 2]
    let k_p = 2
    expect(dConvolve(a, b, index[0], index[1])).toBe((
      1 * ( 2 * 17 + 5 * 14 + 8 * 11 ) +
      2 * ( 3 * 16 + 6 * 13)
    ) / k_p)

    // This is going to iterate from (1, 0) to (1, 1) in a
    // and (0, 0) to (0, 1) in b, skipping the last term.
    index = [1, 1]
    k_p = 1
    expect(dConvolve(a, b, index[0], index[1])).toBe((
      1 * (2 * 13)
    ) / k_p)

    // This is going to iterate from (0, 1) to (0, 2) in a
    // and (0, 0) to (0, 1) in b, skipping the last term.
    index = [0, 2]
    k_p = 2
    expect(dConvolve(a, b, index[0], index[1])).toBe((
      1 * (4 * 13)
    ) / k_p)
  })

  it('creating constants and values', () => {
    const x = xEvaluatedAtPoint(2)
    expectDerivatives(x, [
      2, 1, 0,
      0, 0, 0,
      0, 0, 0,
    ])

    const y = yEvaluatedAtPoint(2)
    expectDerivatives(y, [
      2, 0, 0,
      1, 0, 0,
      0, 0, 0,
    ])

    const c = constantValue(2)
    expectDerivatives(c, [
      2, 0, 0,
      0, 0, 0,
      0, 0, 0,
    ])
  })

  it('negative', () => {
    // f(x) = - x - y at (2, 2)
    const x = xEvaluatedAtPoint(2)
    const negX = negative(x)
    expectDerivatives(negX, [
      -2, -1, 0,
      0, 0, 0,
       0, 0, 0,
    ])

    const y = yEvaluatedAtPoint(2)
    const negY = negative(y)
    expectDerivatives(negY, [
      -2, 0, 0,
       -1, 0, 0,
       0, 0, 0,
    ])

    const f = add(negX, negY)
    expectDerivatives(f, [
      -4, -1, 0,
      -1, 0, 0,
       0, 0, 0,
    ])
  })

  it('add', () => {
    // f(x) = x + x + y + y at (2, 2)
    const x = xEvaluatedAtPoint(2)
    const y = yEvaluatedAtPoint(2)
    const value = add(add(x, x), add(y, y))
    expectDerivatives(value, [
      8, 2, 0,
      2, 0, 0,
      0, 0, 0,
    ])
  })

  it('multiply', () => {
    // f(x) = x x y y at (3, 2)
    let x = 3
    let y = 2
    let xVal = xEvaluatedAtPoint(x)
    let yVal = yEvaluatedAtPoint(y)
    let value = multiply(multiply(xVal, xVal), multiply(yVal, yVal))
    expectDerivatives(value, [
      x * x * y * y, 2 * x * y * y, 2 * y * y,
      2 * y * x * x, 4 * x * y    , 4 * y,
      2 * x * x    , 4 * x        , 4
    ])

    // f(x) = x y
    for (let x of [ -1, 0, 1 ]) {
      for (let y of [ -1, 0, 1 ]) {
        xVal = xEvaluatedAtPoint(x)
        yVal = yEvaluatedAtPoint(y)
        value = multiply(xVal, yVal)
        expectDerivatives(value, [
          x * y, y, 0,
          x    , 1, 0,
          0    , 0, 0,
        ])
      }
    }
  })

  it('divide', () => {
    // f(x) = x / y at (4, 2)
    const x = 4
    const y = 2
    const xVal = xEvaluatedAtPoint(x)
    const yVal = yEvaluatedAtPoint(y)
    const value = divide(xVal, yVal)
    expectDerivatives(value, [
      x / y              ,  1 / y           , 0,
      - x / (y * y)      ,  - 1 / (y * y)   , 0,
      2 * x / (y * y * y),  2 / ( y * y * y), 0
    ])
  })

  function testExy(x: number, y: number) {
    it(`exp for x = ${x}, y = ${y}`, () => {
      // f(x) = exp(x y)
      const xVal = xEvaluatedAtPoint(x)
      const yVal = yEvaluatedAtPoint(y)
      const xyVal = multiply(xVal, yVal)
      expectDerivatives(xyVal, [
        x * y, y, 0,
        x    , 1, 0,
        0    , 0, 0
      ])

      const value = exp(xyVal)
      const exy = Math.exp(x * y)
      expectDerivatives(value, [
        exy        , y * exy              , y * y * exy,
        x * exy    , (x * y + 1) * exy    , (x * y + 2) * y * exy,
        x * x * exy, (x * y + 2) * x * exy, exy * (x * x * y * y + 4 * x * y + 2),
      ])
    })
  }

  for (let x of [ -2, 0, 2 ]) {
    for (let y of [ -2, 0, 2 ]) {
      testExy(x, y)
    }
  }

  it('log of x > 1, x < 1 and x < 0', () => {
    for (let x of [ Math.E, .5, -1 ]) {
      for (let y of [ Math.E, .5, -1 ]) {
        // f(x) = log(x * y)
        const xVal = xEvaluatedAtPoint(x)
        const yVal = yEvaluatedAtPoint(y)
        const xyVal = multiply(xVal, yVal)
        const logVal = log(xyVal)
        expectDerivatives(logVal, [
          Math.log(x * y), 1 / x, - 1 / (x * x),
          1 / y          , 0    , 0,
          - 1 / (y * y)  , 0    , 0,
        ])
      }
    }
  })

  it('sqrt', () => {
    // f(x, y) = sqrt(x * y)
    const x = .3
    const y = 8

    const xVal = xEvaluatedAtPoint(x)
    const yVal = yEvaluatedAtPoint(y)
    const xyVal = multiply(xVal, yVal)
    const sqrtVal = sqrt(xyVal)

    expectDerivatives(sqrtVal, [
      Math.sqrt(x * y), y / (2 * Math.pow(x * y, 1 / 2)), - y * y / (4 * Math.pow(x * y, 3 / 2)),
      x / (2 * Math.pow(x * y, 1 / 2)), 1 / (4 * Math.pow(x * y, 1 / 2)), - y / (8 * Math.pow(x * y, 3 / 2)),
      - x * x / (4 * Math.pow(x * y, 3 / 2)), - x / (8 * Math.pow(x * y, 3 / 2)), 1 / (16 * Math.pow(x * y, 3 / 2)),
    ])
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
    // f(x)    = (x y) ^ b
    for (let pt of [ 0, .5, 2 ]) {
      for (let b of [ -2, -.5, 0, .5, 2 ]) {
        const x = pt
        const y = pt
        const xVal = xEvaluatedAtPoint(x)
        const yVal = yEvaluatedAtPoint(y)
        const xyVal = multiply(xVal, yVal)
        const powVal = pow(xyVal, b)

        const xyb = Math.pow(x * y, b)

        expectDerivatives(powVal, [
          xyb, b * xyb / x, (b - 1) * b * xyb / (x * x),
          b * xyb / y, b * b * Math.pow(x * y, b - 1), (b - 1) * b * b * y * Math.pow(x * y, b - 2),
          (b - 1) * b * xyb / (y * y), (b - 1) * b * b * x * Math.pow(x * y, b - 2), (b - 1) ** 2 * b ** 2 * xyb / (x * x * y * y)
        ])
      }
    }
  })

  it('pow(a, b) where a < 0', () => {
    // Check that taking the power of a negative base returns NaNs.
    const pt = -1
    const x = xEvaluatedAtPoint(pt)
    const y = yEvaluatedAtPoint(pt)
    const value = pow(x, y)
    const coefficients = (value as any).coefficients
    for (let i = 0; i < coefficients.length; i++) {
      expect(coefficients[i]).toBeNaN()
    }
  })

  it('sin', () => {
    // f(x, y) = sin(x y)
    const x = 2
    const y = 3
    const sinxy = Math.sin(x * y)
    const cosxy = Math.cos(x * y)

    const xVal = xEvaluatedAtPoint(x)
    const yVal = yEvaluatedAtPoint(y)
    const xyVal = multiply(xVal, yVal)
    const sinVal = sin(xyVal)

    expectDerivatives(sinVal, [
      sinxy, y * cosxy, - y * y * sinxy,
      x * cosxy, cosxy - x * y * sinxy, - y * (2 * sinxy + x * y * cosxy),
      - x * x * sinxy, - x * (2 * sinxy + x * y * cosxy), (x * x * y * y - 2) * sinxy - 4 * x * y * cosxy,
    ])
  })

  it('cos', () => {
    // f(x, y) = cos(x y)
    const x = 2
    const y = 3
    const sinxy = Math.sin(x * y)
    const cosxy = Math.cos(x * y)

    const xVal = xEvaluatedAtPoint(x)
    const yVal = yEvaluatedAtPoint(y)
    const xyVal = multiply(xVal, yVal)
    const sinVal = cos(xyVal)

    expectDerivatives(sinVal, [
      cosxy, - y * sinxy, - y * y * cosxy,
      - x * sinxy, - sinxy - x * y * cosxy, y * (x * y * sinxy - 2 * cosxy),
      -x * x * cosxy, x * (x * y * sinxy - 2 * cosxy), (x * x * y * y - 2) * cosxy + 4 * x * y * sinxy
    ])
  })

  it('tan', () => {
    // f(x, y) = tan(x y)
    const x = 2
    const y = 3
    const cosxy = Math.cos(x * y)
    const cosxy2 = cosxy * cosxy
    const secxy2 = 1 / cosxy2
    const secxy4 = secxy2 * secxy2

    const xVal = xEvaluatedAtPoint(x)
    const yVal = yEvaluatedAtPoint(y)
    const xyVal = multiply(xVal, yVal)
    const tanVal = tan(xyVal)

    expectDerivatives(tanVal, [
      // first row
      Math.tan(x * y), y / cosxy2, 2 * y * y * Math.tan(x * y) / cosxy2,

      // second row
      x / cosxy2,
      1 / cosxy2 + 2 * x * y * Math.tan(x * y) / cosxy2,
      2 * x * y * y * secxy4 + 4 * x * y * y * Math.tan(x * y) ** 2 * secxy2 + 4 * y * Math.tan(x * y) * secxy2,

      // TODO(ryan): compute these analytically
      -2.525199482369361, 30.120869154472246, -140.88014100510708
    ])
  })

  it('asin', () => {
    // f(x, y) = asin(x y)
    const x = .5
    const y = .3

    const xVal = xEvaluatedAtPoint(x)
    const yVal = yEvaluatedAtPoint(y)
    const xyVal = multiply(xVal, yVal)
    const asinVal = asin(xyVal)

    expectDerivatives(asinVal, [
      // first row
      Math.asin(x * y),
      y / Math.sqrt(1 - x * x * y * y),
      (x * y * y * y) / Math.pow(1 - x * x * y * y, 3 / 2),

      // second row
      x / Math.sqrt(1 - x * x * y * y),
      1 / Math.pow(1 - x * x * y * y, 3 / 2),
      3 * x * y * y / Math.pow(1 - x * x * y * y, 5 / 2),

      // third row
      (x * x * x * y) / Math.pow(1 - x * x * y * y, 3 / 2),
      3 * x * x * y / Math.pow(1 - x * x * y * y, 5 / 2),
      3 * x * y * (3 * x * x * y * y + 2) / Math.pow(1 - x * x * y * y, 7 / 2),
    ])
  })

  it('acos', () => {
    // f(x, y) = acos(x y)
    const x = .5
    const y = .3

    const xVal = xEvaluatedAtPoint(x)
    const yVal = yEvaluatedAtPoint(y)
    const xyVal = multiply(xVal, yVal)
    const asinVal = acos(xyVal)

    expectDerivatives(asinVal, [
      // first row
      Math.acos(x * y),
      - y / Math.pow(1 - x * x * y * y, 1 / 2),
      - x * y * y * y / Math.pow(1 - x * x * y * y, 3 / 2),

      // second row
      - x / Math.pow(1 - x * x * y * y, 1 / 2),
      - 1 / Math.pow(1 - x * x * y * y, 3 / 2),
      - 3 * x * y * y / Math.pow(1 - x * x * y * y, 5 / 2),

      // third row
      - x * x * x * y / Math.pow(1 - x * x * y * y, 3 / 2),
      - 3 * x * x * y / Math.pow(1 - x * x * y * y, 5 / 2),
      - (9 * x * x * x * y * y * y + 6 * x * y) / Math.pow(1 - x * x * y * y, 7 / 2)
    ])
  })

  it('atan', () => {
    // f(x, y) = atan(x y)
    const x = 2
    const y = 3

    const xVal = xEvaluatedAtPoint(x)
    const yVal = yEvaluatedAtPoint(y)
    const xyVal = multiply(xVal, yVal)
    const atanVal = atan(xyVal)

    expectDerivatives(atanVal, [
      // first row
      Math.atan(x * y),
      y / (x * x * y * y + 1),
      (- 2 * x * y * y * y) / Math.pow(1 + x * x * y * y, 2),

      // second row
      x / (x * x * y * y + 1),
      (1 - x * x * y * y) / Math.pow(x * x * y * y + 1, 2),
      2 * x * y * y * (x * x * y * y - 3) / Math.pow(x * x * y * y + 1, 3),

      // third row
      - 2 * x * x * x * y / Math.pow(x * x * y * y + 1, 2),
      2 * x * x * y * (x * x * y * y - 3) / Math.pow(x * x * y * y + 1, 3),
      - 4 * x * y * (x ** 4 * y ** 4 - 8 * x * x * y * y + 3) / Math.pow(x * x * y * y + 1, 4)
    ])
  })
})
