// This class defines a Series object that represents a truncated Taylor
// series. It also defines methods for doing algebra on Taylor series.
// These methods can be used to compute derivatives efficiently. This
// falls into the general family of algorithms referred to as automatic
// differentiation.
//
// For a great, detailed, introduction to the subject I recommend
// 'Introduction to Automatic Differentiation and MATLAB Object-Oriented
// Programming' by Richard D. Neidinger. The theory behind the code
// in this file is based on this paper. If a comment mentions, 'equation
// x.y in the paper', it means *this* paper :-)

import { factorial } from './factorial'
import { Pool } from './pool'

function newSeries(): Series {
  return new Series()
}

function clearSeries(s: Series) {
  for (let i = 0; i < s.coefficients.length; i++) {
    s.coefficients[i] = 0
  }
}

function copySeries(to: Series, from: Series) {
  for (let i = 0; i < to.coefficients.length; i++) {
    to.coefficients[i] = from.coefficients[i]
  }
}

export const seriesPool = new Pool<Series>(newSeries, clearSeries, copySeries)

export function variableEvaluatedAtPoint(value: number): Series {
  const series = seriesPool.allocate()
  series.coefficients[0] = value
  series.coefficients[1] = 1
  return series
}

export function constantValue(value: number): Series {
  const series = seriesPool.allocate()
  series.coefficients[0] = value
  return series
}

// This holds the coefficients of a Taylor series. If we shorten the
// coefficients array of a series to a variable named c, the series
// would look like this...
//
// f(x) = c[0] + c[1] (x - a) + c[2] (x - a) ^ 2 + ...
//
// c[i] contains the ith derivative of f divided by factorial(i).
export class Series {
  public isFree = false
  public coefficients: number[] = []

  constructor() {
    while (this.coefficients.length <= globalDegree) {
      this.coefficients.push(0)
    }
  }

  freeToPool() {
    seriesPool.markFree(this)
  }
}

export function toValueAndDerivatives(s: Series) {
  let derivatives: number[] = []
  for (let i = 0; i < s.coefficients.length; i++) {
    derivatives.push(s.coefficients[i] * factorial(i))
  }
  return derivatives
}

let globalDegree = 2
export function setNumberOfDerivativesToCompute(degree: number) {
  globalDegree = degree
}

// Functions on series objects
////////////////////////////////////////////////////////////////

export type SeriesOrNumber = Series | number

export function add(a: SeriesOrNumber, b: SeriesOrNumber): Series {
  if (typeof a === 'number' && typeof b === 'number') {
    return constantValue(a + b)
  }

  else if (typeof a === 'number' && b instanceof Series) {
    const res = seriesPool.allocateCopy(b)
    res.coefficients[0] += a
    return res
  }

  else if (typeof b === 'number' && a instanceof Series) {
    const res = seriesPool.allocateCopy(a)
    res.coefficients[0] += b
    return res
  }

  else if (a instanceof Series && b instanceof Series) {
    const res = seriesPool.allocateCopy(a)
    for (let i = 0; i < a.coefficients.length; i++) {
      res.coefficients[i] += b.coefficients[i]
    }
    return res
  }

  throw new Error('Unhandled case in add')
}

export function negative(a: SeriesOrNumber): Series {
  if (typeof a === 'number') {
    return constantValue(- a)
  } else if (a instanceof Series) {
    const res = seriesPool.allocateCopy(a)
    for (let i = 0; i < res.coefficients.length; i++) {
      res.coefficients[i] *= -1
    }
    return res
  }

  throw new Error('Unhandled case in negative')
}

export function subtract(a: SeriesOrNumber, b: SeriesOrNumber): Series {
  if (typeof a === 'number' && typeof b === 'number') {
    return constantValue(a - b)
  }

  else if (typeof a === 'number' && b instanceof Series) {
    const res = seriesPool.allocate()
    for (let i = 0; i < res.coefficients.length; i++) {
      res.coefficients[i] = a - b.coefficients[i]
    }
    return res
  }

  else if (typeof b === 'number' && a instanceof Series) {
    const res = seriesPool.allocate()
    for (let i = 0; i < res.coefficients.length; i++) {
      res.coefficients[i] = a.coefficients[i] - b
    }
    return res
  }

  else if (a instanceof Series && b instanceof Series) {
    const res = seriesPool.allocate()
    for (let i = 0; i < res.coefficients.length; i++) {
      res.coefficients[i] = a.coefficients[i] - b.coefficients[i]
    }
    return res
  }

  throw new Error('Unhandled case in subtract')
}

// Suppose we have two functions a(x) and b(x) such that...
//
//  a(x) = a_0 + a_1 x + a_2 x ^ 2 + ...
//  b(x) = b_0 + b_1 x + b_2 x ^ 2 + ...
//
// I've used ellisis to indicate that a(x) and b(x) can be series of
// any length. In practice they have some fixed length. Suppose we
// want to compute h(x) of the same length. h(x) series is something
// like h_0 + h_1 x + h_2 x ^ 2 + ...
//
// The key is that h_i accompanies x ^ i, so it has to be a product of
// some a_x and b_y such that x + y = i. So you can define h_k as...
//
//  h_k = a_0 * b_k + a_1 + b_k-1 + ... + a_k b_0
//
// This sum has a special name which is 'discrete convolution' and it
// is denoted in the paper by [a_1, ..., a_k] [b_k, b_k-1, ..., b_0]'
// (where the ' is a super-script T in the paper, short for 'transpose').
export function multiply(aInput: SeriesOrNumber, bInput: SeriesOrNumber): Series {
  if (typeof aInput === 'number' && typeof bInput === 'number') {
    return constantValue(aInput * bInput)
  }

  else if (typeof aInput === 'number' && bInput instanceof Series) {
    const res = seriesPool.allocate()
    for (let i = 0; i < res.coefficients.length; i++) {
      res.coefficients[i] = aInput * bInput.coefficients[i]
    }
    return res
  }

  else if (typeof bInput === 'number' && aInput instanceof Series) {
    const res = seriesPool.allocate()
    for (let i = 0; i < res.coefficients.length; i++) {
      res.coefficients[i] = aInput.coefficients[i] * bInput
    }
    return res
  }

  else if (aInput instanceof Series && bInput instanceof Series) {
    const a = aInput.coefficients
    const b = bInput.coefficients
    const h = seriesPool.allocate()

    for (let k = 0; k < a.length; k++) {
      let convolution = 0;
      for (let i = 0; i < k + 1; i++) {
        convolution += a[i] * b[k - i]
      }
      h.coefficients[k] = convolution
    }

    return h
  }

  throw new Error('Unhandled case in multiply')
}

// We want to find h(x) such that h(x) = a(x) / b(x). We can do this by
// re-arranging to get a(x) = h(x) b(x) which, by our definition of
// multiplication above gives us...
//
//  a_k = [h_1, ..., h_k] [b_k, b_k-1, ..., b_0]'
//
// If we 'pop off' the last term of the convolution, we get...
//
//  a_k = [h_1, ..., h_k-1] [b_k, b_k-1, ..., b_1]' + h_k b_0
//
// We can re-arrange to solve for h_k...
//
// h_k = (a_k - [h_1, ..., h_k-1] [b_k, b_k-1, ..., b_1]') / b_0
export function divide(aInput: SeriesOrNumber, bInput: SeriesOrNumber): Series {
  if (typeof aInput === 'number' && typeof bInput === 'number') {
    return constantValue(aInput / bInput)
  }

  else if (typeof aInput === 'number' && bInput instanceof Series) {
    const res = seriesPool.allocate()
    for (let i = 0; i < res.coefficients.length; i++) {
      res.coefficients[i] = aInput / bInput.coefficients[i]
    }
    return res
  }

  else if (typeof bInput === 'number' && aInput instanceof Series) {
    const res = seriesPool.allocate()
    for (let i = 0; i < res.coefficients.length; i++) {
      res.coefficients[i] = aInput.coefficients[i] / bInput
    }
    return res
  }

  else if (aInput instanceof Series && bInput instanceof Series) {
    const a = aInput.coefficients
    const b = bInput.coefficients
    const h = seriesPool.allocate()
    h.coefficients[0] = a[0] / b[0]

    for (let k = 1; k < a.length; k++) {
      let convolution = 0
      for (let i = 0; i < k; i++) {
        convolution += h.coefficients[i] * b[k - i]
      }
      h.coefficients[k] = (a[k] - convolution) / b[0]
    }

    return h
  }

  throw new Error('Unhandled case in divide')
}

export function sqrt(aInput: SeriesOrNumber): Series {
  if (typeof aInput === 'number') {
    return constantValue(Math.sqrt(aInput))
  }

  else if (aInput instanceof Series) {
    const a = aInput.coefficients
    const h = seriesPool.allocate()
    h.coefficients[0] = Math.sqrt(a[0])

    for (let k = 1; k < a.length; k++) {
      const ak = a[k]
      let convolution = 0
      for (let i = 1; i < k; i++) {
        convolution += h.coefficients[i] * h.coefficients[k - i]
      }
      h.coefficients[k] = (ak - convolution) / (2 * h.coefficients[0])
    }

    return h
  }

  throw new Error('Unhandled case in sqrt')
}

export function exp(aInput: SeriesOrNumber): Series {
  if (typeof aInput === 'number') {
    return constantValue(Math.exp(aInput))
  }

  else if (aInput instanceof Series) {
    const a = aInput.coefficients
    const h = seriesPool.allocate()
    h.coefficients[0] = Math.exp(a[0])

    for (let k = 1; k < a.length; k++) {
      let convolution = 0
      for (let i = 1; i < k + 1; i++) {
        convolution += i * a[i] * h.coefficients[k - i]
      }
      h.coefficients[k] = convolution / k
    }

    return h
  }

  throw new Error('Unhandled case in exp')
}

// This computes the natural logarithm of a. It's named log to match the
// Math.log function in Javascript, even though it'd be more appropriately
// named ln.
export function log(aInput: SeriesOrNumber): Series {
  if (typeof aInput === 'number') {
    if (aInput < 0) {
      throw new Error(`log called with a negative number`)
    }

    return constantValue(Math.log(aInput))
  }

  else if (aInput instanceof Series) {
    if (aInput.coefficients[0] < 0) {
      throw new Error(`log called with a series whose first coefficient is negative`)
    }

    const a = aInput.coefficients
    const h = seriesPool.allocate()
    h.coefficients[0] = Math.log(a[0])

    for (let k = 1; k < a.length; k++) {
      let convolution = 0
      for (let i = 1; i < k; i++) {
        convolution += i * h.coefficients[i] * a[k - i]
      }
      h.coefficients[k] = (1 / a[0]) * (a[k] - convolution / k)
    }

    return h
  }

  throw new Error('Unhandled case in log')
}

function isNegative(a: SeriesOrNumber): boolean {
  if (typeof a === 'number') {
    return a < 0
  } else if (a instanceof Series) {
    return a.coefficients[0] < 0
  }
  throw new Error('Unhandled case in isNegative')
}

// Just like Math.pow in Javascript, we do not support fractional
// powers of negative bases. See slightly more info here:
//
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/pow
export function pow(a: SeriesOrNumber, b: SeriesOrNumber): Series {
  if (isNegative(a)) {
    const series = seriesPool.allocate()
    for (let i = 0; i < series.coefficients.length; i++) {
      series.coefficients[i] = NaN
    }
    return series
  }

  // If we got here, then a is positive and is a valid argument to log.
  return exp(multiply(b, log(a)))
}

// Returns a list of two SeriesOrNumber objects.
function sinAndCos(aInput: SeriesOrNumber): Series[] {
  if (typeof aInput === 'number') {
    return [
      constantValue(Math.sin(aInput)),
      constantValue(Math.cos(aInput)),
    ]

  } else if (aInput instanceof Series) {
    const a = aInput.coefficients

    const sinResult = seriesPool.allocate()
    sinResult.coefficients[0] = Math.sin(a[0])

    const cosResult = seriesPool.allocate()
    cosResult.coefficients[0] = Math.cos(a[0])

    for (let k = 1; k < a.length; k++) {
      let sinConvolution = 0
      let cosConvolution = 0

      for (let i = 1; i < k + 1; i++) {
        sinConvolution += i * a[i] * cosResult.coefficients[k - i]
        cosConvolution += i * a[i] * sinResult.coefficients[k - i]
      }

      sinResult.coefficients[k] = sinConvolution / k
      cosResult.coefficients[k] = - cosConvolution / k
    }

    return [
      sinResult,
      cosResult,
    ]
  }

  throw new Error('Unhandled case in sinAndCos')
}

export function sin(a: SeriesOrNumber): Series {
  const res = sinAndCos(a)
  res[1].freeToPool()
  return res[0]
}

export function cos(a: SeriesOrNumber): Series {
  const res = sinAndCos(a)
  res[0].freeToPool()
  return res[1]
}

// We could implement this by calling `divide(sin(a), cos(a))`. But that
// would require at least three convolutions per term in the series.
// Instead, we define...
//
//  h(x) = tan(a(x))
//  b(x) = 1 + h(x) ^ 2 = 1 / cos(x) ^ 2
//
// This gives us two differential equations...
//
//  h'(x) = a'(x) b(x)
//  b'(x) = 2 h'(x) h(x)
//
// Using the DE theorem, we know that...
//
// h_k = (1 / k) [1 a_1, ..., k a_k] [b_k-1, ..., b_0]'
// b_k = (2 / k) [1 h_1, ..., k h_k] [h_k-1, ..., h_0]'
//
// We compute two series in parallel: h_k for tan(x) and b_k for
// (1 / cos(x) ^ 2). We return only the former.
export function tan(aInput: SeriesOrNumber): Series {
  if (typeof aInput === 'number') {
    return constantValue(Math.tan(aInput))

  } else if (aInput instanceof Series) {
    const a = aInput.coefficients
    const b = seriesPool.allocate()
    b.coefficients[0] = 1 / (Math.cos(a[0]) * Math.cos(a[0]))

    const h = seriesPool.allocate()
    h.coefficients[0] = Math.tan(a[0])

    for (let k = 1; k < a.length; k++) {
      // convolve over i..k
      let hConvolution = 0
      for (let i = 1; i < k + 1; i++) {
        hConvolution += i * a[i] * b.coefficients[k - i]
      }
      h.coefficients[k] = hConvolution / k

      // convolve over i..k
      let bConvolution = 0
      for (let i = 1; i < k + 1; i++) {
        bConvolution += i * h.coefficients[i] * h.coefficients[k - i]
      }
      b.coefficients[k] = 2 * bConvolution / k
    }

    b.freeToPool()
    return h
  }

  throw new Error('Unhandled case in tan')
}

// To derive a the co-efficients for the series of asin(x), first
// define...
//
//  h(x) = asin(a(x))
//  b(x) = sqrt(1 - a(x) ^ 2)
//
// With some computation, you can show that...
//
//  a'(x) = h'(x) b(x)
//  b'(x) = - h'(x) a(x)
//
// Using the DE theorem, we know that...
//
//  a_k = (1 / k) [1 h_1, ..., k h_k] [b_k-1, ..., b_0]'
//  b_k = - (1 / k) [1 h_1, ..., k h_k] [a_k-1, ..., a_0]'
//
// We can re-arrange the first equation to get a formula for h_k...
//
//  a_k = (1 / k) [1 h_1, ..., k h_k] [b_k-1, ..., b_0]'
//  a_k = (1 / k) [1 h_1, ..., k-1 h_k-1] [b_k-1, ..., b_1]' + h_k b_0
//  h_k b_0 = a_k - (1 / k) [1 h_1, ..., k-1 h_k-1] [b_k-1, ..., b_1]'
//  h_k = (a_k - (1 / k) [1 h_1, ..., k-1 h_k-1] [b_k-1, ..., b_1]') / b_0
//
// Here are some values to help when debugging...
//
// sqrt(1 - x ^ 2)    at x = .5 is .866
// sqrt(1 - x ^ 2)'   at x = .5 is - .577
// sqrt(1 - x ^ 2)''  at x = .5 is - 1.53
// sqrt(1 - x ^ 2)''' at x = .5 is - 3.07
//
export function asin(aInput: SeriesOrNumber): Series {
  if (typeof aInput === 'number') {
    if (Math.abs(aInput) >= 1) {
      console.warn(`asin called with value ${aInput}`)
    }

    return constantValue(Math.asin(aInput))

  } else if (aInput instanceof Series) {
    if (Math.abs(aInput.coefficients[0]) >= 1) {
      console.warn(`asin called with value ${aInput.coefficients[0]}`)
    }

    const a = aInput.coefficients
    const b = seriesPool.allocate()
    b.coefficients[0] = Math.sqrt(1 - a[0] * a[0])

    const h = seriesPool.allocate()
    h.coefficients[0] = Math.asin(a[0])

    for (let k = 1; k < a.length; k++) {
      // sum from i = 1..k-1
      let hConvolution = 0
      for (let i = 1; i < k; i++) {
        hConvolution += i * h.coefficients[i] * b.coefficients[k - i]
      }
      h.coefficients[k] = (a[k] - hConvolution / k) / b.coefficients[0]

      // sum from i = 1..k
      let bConvolution = 0
      for (let i = 1; i < k + 1; i++) {
        bConvolution += i * h.coefficients[i] * a[k - i]
      }
      b.coefficients[k] = - bConvolution / k
    }

    b.freeToPool()
    return h
  }

  throw new Error('Unhandled case in asin')
}

// This involves a similar computation as asin(a(x))...
//
//  h(x) = acos(a(x))
//  b(x) = sqrt(1 - x ^ 2)
//
// Except it turns out that the signs are switched in the equations
// for a'(x) and b'(x)
//
//  a'(x) = - h'(x) b(x)
//  b'(x) = h'(x) a(x)
export function acos(aInput: SeriesOrNumber): Series {
  if (typeof aInput === 'number') {
    if (Math.abs(aInput) >= 1) {
      console.warn(`asin called with value ${aInput}`)
    }

    return constantValue(Math.acos(aInput))

  } else if (aInput instanceof Series) {
    if (Math.abs(aInput.coefficients[0]) >= 1) {
      console.warn(`asin called with value ${aInput.coefficients[0]}`)
    }

    const a = aInput.coefficients

    const b = seriesPool.allocate()
    b.coefficients[0] = Math.sqrt(1 - a[0] * a[0])

    const h = seriesPool.allocate()
    h.coefficients[0] = Math.acos(a[0])

    for (let k = 1; k < a.length; k++) {
      // sum from i = 1..k-1
      let hConvolution = 0
      for (let i = 1; i < k; i++) {
        hConvolution += i * h.coefficients[i] * b.coefficients[k - i]
      }
      h.coefficients[k] = ((a[k] + hConvolution / k) / - b.coefficients[0])

      // sum from i = 1..k
      let bConvolution = 0
      for (let i = 1; i < k + 1; i++) {
        bConvolution += i * h.coefficients[i] * a[k - i]
      }
      b.coefficients[k] = bConvolution / k
    }

    b.freeToPool()
    return h
  }

  throw new Error('Unhandled case in asin')
}

// To derive a the co-efficients for the series of acos(x), first
// define...
//
//  h(x) = atan(a(x))
//  b(x) = 1 + a(x) ^ 2
//
// With some computation, you can show that...
//
//  a'(x) = h'(x) b(x)
//  b'(x) = 2 a'(x) a(x)
//
// Using the DE theorem, we know that...
//
//  a_k = (1 / k) [1 h_1, ..., k h_k] [b_k-1, ..., b_0]'
//  b_k = 2 (1 / k) [1 a_1, ..., k a_k] [a_k-1, ..., a_0]'
//
// We can re-arrange the first equation to get a formula for h_k...
//
//  a_k = (1 / k) [1 h_1, ..., k h_k] [b_k-1, ..., b_0]'
//  a_k = (1 / k) [1 h_1, ..., k-1 h_k-1] [b_k-1, ..., b_1]' + h_k b_0
//  h_k b_0 = a_k - (1 / k) [1 h_1, ..., k-1 h_k-1] [b_k-1, ..., b_1]'
//  h_k = (a_k - (1 / k) [1 h_1, ..., k-1 h_k-1] [b_k-1, ..., b_1]') / b_0
//
export function atan(aInput: SeriesOrNumber): Series {
  if (typeof aInput === 'number') {
    return constantValue(Math.atan(aInput))

  } else if (aInput instanceof Series) {

    const a = aInput.coefficients

    const b = seriesPool.allocate()
    b.coefficients[0] = 1 + a[0] * a[0]

    const h = seriesPool.allocate()
    h.coefficients[0] = Math.atan(a[0])

    for (let k = 1; k < a.length; k++) {
      // sum from i = 1..k-1
      let hConvolution = 0
      for (let i = 1; i < k; i++) {
        hConvolution += i * h.coefficients[i] * b.coefficients[k - i]
      }
      h.coefficients[k] = (a[k] - hConvolution / k) / b.coefficients[0]

      // sum from i = 1..k
      let bConvolution = 0
      for (let i = 1; i < k + 1; i++) {
        bConvolution += i * a[i] * a[k - i]
      }
      b.coefficients[k] = 2 * bConvolution / k
    }

    b.freeToPool()
    return h
  }

  throw new Error('Unhandled case in atan')
}