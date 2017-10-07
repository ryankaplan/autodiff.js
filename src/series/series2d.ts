// This file defines a two-dimensional Taylor series class called
// Series2D.
//
// WARNING: this file is not well documented. I hope to come back to it
// and make it readable, but there's a chance I never will. The theory
// behind this is based on the paper 'Efficient recurrence relations for
// univariate and multivariate Taylor Series coefficients' by Richard
// Neidinger.

import { factorial } from './factorial'
import { defaultContext } from './autodiff-context'

export function xEvaluatedAtPoint(value: number): Series2D {
  const series = defaultContext.series2DPool.allocate()
  series.set(0, 0, value)
  series.set(1, 0, 1)
  return series
}

export function yEvaluatedAtPoint(value: number): Series2D {
  const series = defaultContext.series2DPool.allocate()
  series.set(0, 0, value)
  series.set(0, 1, 1)
  return series
}

export function constantValue(value: number): Series2D {
  const series = defaultContext.series2DPool.allocate()
  series.set(0, 0, value)
  return series
}

// This holds the coefficients of a two-dimensional Taylor series.
export class Series2D {
  public isFree = false

  // This list stores a 2D array of numbers. It stores rows one after another,
  // so the array...
  //
  // 1 2 3
  // 4 5 6
  // 7 8 9
  //
  // is stored as 1 2 3 4 5 6 7 8 9. Indexing is done by column first, so
  // index (1, 0) has value 2 in the example above. The underlying data is
  // stored in a 1D array.
  public coefficients: number[] = []
  public size: number = -1

  constructor() {
    const globalDegree = defaultContext.numDerivativesToCompute()
    this.size = globalDegree + 1
    for (let y = 0; y <= globalDegree; y++) {
      for (let x = 0; x <= globalDegree; x++) {
        this.coefficients.push(0)
      }
    }
  }

  set(x: number, y: number, value: number) {
    this.coefficients[y * this.size + x] = value
  }

  get(x: number, y: number) {
    return this.coefficients[y * this.size + x]
  }

  debugPrint() {
    let s = ''
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        s += `${this.coefficients[y * this.size + x]} `
      }
      s += `\n`
    }
    console.log(s)
  }

  freeToPool() {
    defaultContext.series2DPool.markFree(this)
  }
}

export function toValueAndDerivatives(s: Series2D): number[] {
  let derivatives: number[] = []
  for (let y = 0; y < s.size; y++) {
    for (let x = 0; x < s.size; x++) {
      derivatives.push(
        s.get(x, y) * (factorial(x) * factorial(y))
      )
    }
  }

  return derivatives
}

// Functions on series objects
////////////////////////////////////////////////////////////////

export type Series2DOrNumber = Series2D | number

export function add(a: Series2DOrNumber, b: Series2DOrNumber): Series2D {
  if (typeof a === 'number' && typeof b === 'number') {
    return constantValue(a + b)
  }

  else if (typeof a === 'number' && b instanceof Series2D) {
    const res = defaultContext.series2DPool.allocateCopy(b)
    res.coefficients[0] += a
    return res
  }

  else if (typeof b === 'number' && a instanceof Series2D) {
    const res = defaultContext.series2DPool.allocateCopy(a)
    res.coefficients[0] += b
    return res
  }

  else if (a instanceof Series2D && b instanceof Series2D) {
    const res = defaultContext.series2DPool.allocateCopy(a)
    for (let i = 0; i < a.coefficients.length; i++) {
      res.coefficients[i] += b.coefficients[i]
    }
    return res
  }

  throw new Error('Unhandled case in add')
}

export function negative(a: Series2DOrNumber): Series2D {
  if (typeof a === 'number') {
    return constantValue(- a)
  } else if (a instanceof Series2D) {
    const res = defaultContext.series2DPool.allocateCopy(a)
    for (let i = 0; i < res.coefficients.length; i++) {
      res.coefficients[i] *= -1
    }
    return res
  }

  throw new Error('Unhandled case in negative')
}

export function subtract(a: Series2DOrNumber, b: Series2DOrNumber): Series2D {
  if (typeof a === 'number' && typeof b === 'number') {
    return constantValue(a - b)
  }

  else if (typeof a === 'number' && b instanceof Series2D) {
    const res = defaultContext.series2DPool.allocate()
    for (let i = 0; i < res.coefficients.length; i++) {
      res.coefficients[i] = a - b.coefficients[i]
    }
    return res
  }

  else if (typeof b === 'number' && a instanceof Series2D) {
    const res = defaultContext.series2DPool.allocate()
    for (let i = 0; i < res.coefficients.length; i++) {
      res.coefficients[i] = a.coefficients[i] - b
    }
    return res
  }

  else if (a instanceof Series2D && b instanceof Series2D) {
    const res = defaultContext.series2DPool.allocate()
    for (let i = 0; i < res.coefficients.length; i++) {
      res.coefficients[i] = a.coefficients[i] - b.coefficients[i]
    }
    return res
  }

  throw new Error('Unhandled case in subtract')
}

export function convolve(a: Series2D, b: Series2D, boxWidth: number, boxHeight: number) {
  let total = 0
  for (let x = 0; x < boxWidth; x++) {
    for (let y = 0; y < boxHeight; y++) {
      total += a.get(x, y) * b.get(boxWidth - 1 - x, boxHeight - 1 - y)
    }
  }
  return total
}

enum Coordinate {
  X = 0,
  Y = 1,
}

// convolves the derivative of a with b
export function dConvolve(a: Series2D, b: Series2D, k_x: number, k_y: number) {
  if (k_x === 0 && k_y === 0) {
    throw new Error(`dConvolve called with k_x === 0 and k_y === 0`)
  }

  const k = [ k_x, k_y ]

  // Pick the co-ordinate with the smallest non-zero k_i
  const p = (
    k_x === 0 ? Coordinate.Y :
    k_y === 0 ? Coordinate.X :
    k_x <= k_y ? Coordinate.X :
    Coordinate.Y
  )

  const k_p = k[p]
  const e_p = p === Coordinate.X ? [ 1, 0 ] : [ 0, 1 ]

  let total = 0
  for (let x = e_p[0]; x <= k_x; x++) {
    for (let y = e_p[1]; y <= k_y; y++) {
      if (x === k_x && y === k_y) {
        continue
      }
      const j = [x, y]
      const j_p = j[p]
      total += j_p * a.get(x, y) * b.get(k_x - x, k_y - y)
    }
  }

  const res = total / k_p
  return res
}

export function multiply(a: Series2DOrNumber, b: Series2DOrNumber): Series2D {
  if (typeof a === 'number' && typeof b === 'number') {
    return constantValue(a * b)
  }

  else if (typeof a === 'number' && b instanceof Series2D) {
    const res = defaultContext.series2DPool.allocate()
    for (let i = 0; i < res.coefficients.length; i++) {
      res.coefficients[i] = a * b.coefficients[i]
    }
    return res
  }

  else if (typeof b === 'number' && a instanceof Series2D) {
    const res = defaultContext.series2DPool.allocate()
    for (let i = 0; i < res.coefficients.length; i++) {
      res.coefficients[i] = a.coefficients[i] * b
    }
    return res
  }

  else if (a instanceof Series2D && b instanceof Series2D) {
    const h = defaultContext.series2DPool.allocate()
    const size = a.size

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        // h_ij is the co-efficient next to x ^ i y ^ j in the Taylor series.
        // The co-efficient is a sum of all products in the original series
        // who had terms...
        //
        // (x ^ a y ^ b) and (x ^ c y ^ d) such that a + c = i and b + d = j
        //
        const h_ij = convolve(a, b, i + 1, j + 1)
        h.set(i, j, h_ij)
      }
    }

    return h
  }

  throw new Error('Unhandled case in multiply')
}

export function divide(a: Series2DOrNumber, b: Series2DOrNumber): Series2D {
  if (typeof a === 'number' && typeof b === 'number') {
    return constantValue(a / b)
  }

  else if (typeof a === 'number' && b instanceof Series2D) {
    const res = defaultContext.series2DPool.allocate()
    for (let i = 0; i < res.coefficients.length; i++) {
      res.coefficients[i] = a / b.coefficients[i]
    }
    return res
  }

  else if (typeof b === 'number' && a instanceof Series2D) {
    const res = defaultContext.series2DPool.allocate()
    for (let i = 0; i < res.coefficients.length; i++) {
      res.coefficients[i] = a.coefficients[i] / b
    }
    return res
  }

  else if (a instanceof Series2D && b instanceof Series2D) {
    const size = a.size
    const h = defaultContext.series2DPool.allocate()

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (i === 0 && j === 0) {
          h.set(i, j, a.get(0, 0) / b.get(0, 0))
          continue
        }

        const a_ij = a.get(i, j)
        const b_00 = b.get(0, 0)
        const sum = convolve(h, b, i + 1, j + 1) - h.get(i, j) * b_00
        const h_ij = (a_ij - sum) / b_00
        h.set(i, j, h_ij)
      }
    }

    return h
  }

  throw new Error('Unhandled case in divide')
}

export function exp(a: Series2DOrNumber): Series2D {
  if (typeof a === 'number') {
    return constantValue(Math.exp(a))
  }

  else if (a instanceof Series2D) {
    const size = a.size
    const h = defaultContext.series2DPool.allocate()

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (x === 0 && y === 0) {
          h.set(x, y, Math.exp(a.get(0, 0)))
          continue
        }

        const h_ij = h.get(0, 0) * a.get(x, y) + dConvolve(a, h, x, y)
        h.set(x, y, h_ij)
      }
    }
    return h
  }

  throw new Error('Unhandled case in exp')
}

// This computes the natural logarithm of a. It's named log to match the
// Math.log function in Javascript, even though it'd be more appropriately
// named ln.
export function log(a: Series2DOrNumber): Series2D {
  if (typeof a === 'number') {
    if (a < 0) {
      throw new Error(`log called with a negative number`)
    }

    return constantValue(Math.log(a))
  }

  else if (a instanceof Series2D) {
    const size = a.size
    const h = defaultContext.series2DPool.allocate()

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (x === 0 && y === 0) {
          h.set(x, y, Math.log(a.get(0, 0)))
          continue
        }

        const h_ij = (a.get(x, y) - dConvolve(h, a, x, y)) / a.get(0, 0)
        h.set(x, y, h_ij)
      }
    }
    return h
  }

  throw new Error('Unhandled case in log')
}

export function sqrt(a: Series2DOrNumber): Series2D {
  if (typeof a === 'number') {
    return constantValue(Math.sqrt(a))
  }

  else if (a instanceof Series2D) {
    const size = a.size
    const h = defaultContext.series2DPool.allocate()

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (x === 0 && y === 0) {
          h.set(x, y, Math.sqrt(a.get(0, 0)))
          continue
        }

        const h_ij = (a.get(x, y) - 2 * dConvolve(h, h, x, y)) / (2 * h.get(0, 0))
        h.set(x, y, h_ij)
      }
    }
    return h
  }

  throw new Error('Unhandled case in sqrt')
}

function isNegative(a: Series2DOrNumber): boolean {
  if (typeof a === 'number') {
    return a < 0
  } else if (a instanceof Series2D) {
    return a.get(0, 0) < 0
  }
  throw new Error('Unhandled case in isNegative')
}

// Just like Math.pow in Javascript, we do not support fractional
// powers of negative bases. See slightly more info here:
//
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/pow
export function pow(a: Series2DOrNumber, b: Series2DOrNumber): Series2D {
  if (isNegative(a)) {
    const series = defaultContext.series2DPool.allocate()
    for (let i = 0; i < series.coefficients.length; i++) {
      series.coefficients[i] = NaN
    }
    return series
  }

  // If we got here, then a is positive and is a valid argument to log.
  return exp(multiply(b, log(a)))
}

// Returns a list of two SeriesOrNumber objects.
function sinAndCos(a: Series2DOrNumber): Series2D[] {
  if (typeof a === 'number') {
    return [
      constantValue(Math.sin(a)),
      constantValue(Math.cos(a)),
    ]

  } else if (a instanceof Series2D) {
    const size = a.size
    const sinResult = defaultContext.series2DPool.allocate()
    const cosResult = defaultContext.series2DPool.allocate()

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (x === 0 && y === 0) {
          sinResult.set(x, y, Math.sin(a.get(0, 0)))
          cosResult.set(x, y, Math.cos(a.get(0, 0)))
          continue
        }

        const s_ij = cosResult.get(0, 0) * a.get(x, y) + dConvolve(a, cosResult, x, y)
        sinResult.set(x, y, s_ij)

        const c_ij = - sinResult.get(0, 0) * a.get(x, y) - dConvolve(a, sinResult, x, y)
        cosResult.set(x, y, c_ij)
      }
    }

    return [
      sinResult,
      cosResult,
    ]
  }

  throw new Error('Unhandled case in sinAndCos')
}

export function sin(a: Series2DOrNumber): Series2D {
  const res = sinAndCos(a)
  res[1].freeToPool()
  return res[0]
}

export function cos(a: Series2DOrNumber): Series2D {
  const res = sinAndCos(a)
  res[0].freeToPool()
  return res[1]
}

export function tan(a: Series2DOrNumber): Series2D {
  if (typeof a === 'number') {
    return constantValue(Math.tan(a))

  } else if (a instanceof Series2D) {
    const size = a.size
    const h = defaultContext.series2DPool.allocate()
    const b = defaultContext.series2DPool.allocate()

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (x === 0 && y === 0) {
          const a_00 = a.get(0, 0)

          h.set(x, y, Math.tan(a_00))
          b.set(x, y, 1 / (Math.cos(a_00) * Math.cos(a_00)))
          continue
        }

        const h_xy = b.get(0, 0) * a.get(x, y) + dConvolve(a, b, x, y)
        h.set(x, y, h_xy)

        const b_xy = 2 * (h.get(0, 0) * h.get(x, y) + dConvolve(h, h, x, y))
        b.set(x, y, b_xy)
      }
    }

    b.freeToPool()
    return h
  }

  throw new Error('Unhandled case in tan')
}

export function asin(a: Series2DOrNumber): Series2D {
  if (typeof a === 'number') {
    if (Math.abs(a) >= 1) {
      console.warn(`asin called with value ${a}`)
    }

    return constantValue(Math.asin(a))

  } else if (a instanceof Series2D) {
    if (Math.abs(a.coefficients[0]) >= 1) {
      console.warn(`asin called with value ${a.coefficients[0]}`)
    }

    const size = a.size
    const h = defaultContext.series2DPool.allocate()
    const b = defaultContext.series2DPool.allocate()

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (x === 0 && y === 0) {
          h.set(0, 0, Math.asin(a.get(0, 0)))
          b.set(0, 0, Math.cos(h.get(0, 0)))
          continue
        }

        const h_ij = (a.get(x, y) - dConvolve(h, b, x, y)) / b.get(0, 0)
        h.set(x, y, h_ij)

        const b_ij = - a.get(0, 0) * h.get(x, y) - dConvolve(h, a, x, y)
        b.set(x, y, b_ij)
      }
    }

    b.freeToPool()
    return h
  }

  throw new Error('Unhandled case in asin')
}

export function acos(a: Series2DOrNumber): Series2D {
  if (typeof a === 'number') {
    if (Math.abs(a) >= 1) {
      console.warn(`asin called with value ${a}`)
    }

    return constantValue(Math.acos(a))

  } else if (a instanceof Series2D) {
    if (Math.abs(a.coefficients[0]) >= 1) {
      console.warn(`asin called with value ${a.coefficients[0]}`)
    }

    const size = a.size
    const h = defaultContext.series2DPool.allocate()
    const b = defaultContext.series2DPool.allocate()

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (x === 0 && y === 0) {
          h.set(0, 0, Math.acos(a.get(0, 0)))
          b.set(0, 0, Math.sin(h.get(0, 0)))
          continue
        }

        const h_ij = (a.get(x, y) + dConvolve(h, b, x, y)) / - b.get(0, 0)
        h.set(x, y, h_ij)

        const b_ij = a.get(0, 0) * h.get(x, y) + dConvolve(h, a, x, y)
        b.set(x, y, b_ij)
      }
    }

    b.freeToPool()
    return h
  }

  throw new Error('Unhandled case in asin')
}

export function atan(a: Series2DOrNumber): Series2D {
  if (typeof a === 'number') {
    return constantValue(Math.atan(a))

  } else if (a instanceof Series2D) {
    if (Math.abs(a.coefficients[0]) >= 1) {
      console.warn(`asin called with value ${a.coefficients[0]}`)
    }

    const size = a.size
    const h = defaultContext.series2DPool.allocate()
    const b = defaultContext.series2DPool.allocate()

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (x === 0 && y === 0) {
          const a_00 = a.get(0, 0)
          h.set(x, y, Math.atan(a_00))
          b.set(x, y, 1 + a_00 * a_00)
          continue
        }

        const h_ij = (a.get(x, y) - dConvolve(h, b, x, y)) / b.get(0, 0)
        h.set(x, y, h_ij)

        const b_ij = 2 * (a.get(0, 0) * a.get(x, y) + dConvolve(a, a, x, y))
        b.set(x, y, b_ij)
      }
    }

    b.freeToPool()
    return h
  }

  throw new Error('Unhandled case in atan')
}