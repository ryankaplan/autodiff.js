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

import * as list from './list'
import { factorial } from './factorial'
import { ISeries } from '../autodiff'

export function variableEvaluatedAtPoint(value: number): ISeries {
  return Series.create(value, 1)
}

export function constantValue(value: number): ISeries {
  return Series.create(value, 0)
}

enum CopyBehavior {
  COPY,
  MOVE,
}

// This holds the coefficients of a Taylor series. If we shorten the
// coefficients array of a series to a variable named c, the series
// would look like this...
//
// f(x) = c[0] + c[1] (x - a) + c[2] (x - a) ^ 2 + ...
//
// c[i] contains the ith derivative of f divided by factorial(i).
class Series implements ISeries {
  public coefficients: number[]

  // The second argument determines whether we copy the co-efficients
  // array when constructing the series object. The default is to copy
  // it, for safety. We use .MOVE for performance reasons when this
  // file creates Series objects internally.
  constructor(coefficients: number[], copyBehavior = CopyBehavior.COPY) {
    list.logErrorIfNaN(coefficients)

    this.coefficients = (
      copyBehavior === CopyBehavior.COPY ?
      coefficients.slice() :
      coefficients
    )
  }

  static create(value: number, derivative: number) {
    const coefficients = [ value, derivative ]
    while (coefficients.length <= globalDegree) {
      coefficients.push(0)
    }
    return new Series(coefficients)
  }

  static copy(series: Series): Series {
    return new Series(series.coefficients)
  }
}

export function toValueAndDerivatives(s: ISeries) {
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

export type SeriesOrNumber = ISeries | number

export function add(a: SeriesOrNumber, b: SeriesOrNumber): SeriesOrNumber {
  if (typeof a === 'number' && typeof b === 'number') {
    return a + b
  }

  else if (typeof a === 'number' && b instanceof Series) {
    const copy = b.coefficients.slice()
    copy[0] += a
    return new Series(copy, CopyBehavior.MOVE)
  }

  else if (typeof b === 'number' && a instanceof Series) {
    const copy = a.coefficients.slice()
    copy[0] += b
    return new Series(copy, CopyBehavior.MOVE)
  }

  else if (a instanceof Series && b instanceof Series) {
    return new Series(list.add(a.coefficients, b.coefficients))
  }

  throw new Error('Unhandled case in add')
}

export function negative(a: SeriesOrNumber): SeriesOrNumber {
  if (typeof a === 'number') {
    return - a
  } else if (a instanceof Series) {
    const copy = a.coefficients.slice()
    for (let i = 0; i < copy.length; i++) {
      copy[i] *= -1
    }
    return new Series(copy, CopyBehavior.MOVE)
  }

  throw new Error('Unhandled case in negative')
}

export function subtract(a: SeriesOrNumber, b: SeriesOrNumber): SeriesOrNumber {
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b
  }

  else if (typeof a === 'number' && b instanceof Series) {
    const copy = list.negative(b.coefficients)
    copy[0] += a
    return new Series(copy, CopyBehavior.MOVE)
  }

  else if (typeof b === 'number' && a instanceof Series) {
    const copy = a.coefficients.slice()
    copy[0] -= b
    return new Series(copy, CopyBehavior.MOVE)
  }

  else if (a instanceof Series && b instanceof Series) {
    return new Series(list.subtract(a.coefficients, b.coefficients))
  }

  throw new Error('Unhandled case in add')
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
export function multiply(aInput: SeriesOrNumber, bInput: SeriesOrNumber): SeriesOrNumber {
  if (typeof aInput === 'number' && typeof bInput === 'number') {
    return aInput * bInput
  }

  else if (typeof aInput === 'number' && bInput instanceof Series) {
    return new Series(list.multiplyScalar(bInput.coefficients, aInput))
  }

  else if (typeof bInput === 'number' && aInput instanceof Series) {
    return new Series(list.multiplyScalar(aInput.coefficients, bInput))
  }

  else if (aInput instanceof Series && bInput instanceof Series) {
    const a = aInput.coefficients
    const b = bInput.coefficients
    const h: number[] = []

    for (let k = 0; k < a.length; k++) {
      let convolution = 0;
      for (let i = 0; i < k + 1; i++) {
        convolution += a[i] * b[k - i]
      }
      h.push(convolution)
    }

    return new Series(h)
  }

  throw new Error('Unhandled case in add')
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
export function divide(aInput: SeriesOrNumber, bInput: SeriesOrNumber): SeriesOrNumber {
  if (typeof aInput === 'number' && typeof bInput === 'number') {
    return aInput / bInput
  }

  else if (typeof aInput === 'number' && bInput instanceof Series) {
    return new Series(list.divideScalar(bInput.coefficients, aInput))
  }

  else if (typeof bInput === 'number' && aInput instanceof Series) {
    return new Series(list.divideScalar(aInput.coefficients, bInput))
  }

  else if (aInput instanceof Series && bInput instanceof Series) {
    const a = aInput.coefficients
    const b = bInput.coefficients
    const h = [ a[0] / b[0] ]

    for (let k = 1; k < a.length; k++) {
      let convolution = 0
      for (let i = 0; i < k; i++) {
        convolution += h[i] * b[k - i]
      }
      h.push((a[k] - convolution) / b[0])
    }

    return new Series(h, CopyBehavior.MOVE)
  }

  throw new Error('Unhandled case in divide')
}

export function sqrt(aInput: SeriesOrNumber): SeriesOrNumber {
  if (typeof aInput === 'number') {
    return Math.sqrt(aInput)
  }

  else if (aInput instanceof Series) {
    const a = aInput.coefficients
    const h = [ Math.sqrt(a[0]) ]

    for (let k = 1; k < a.length; k++) {
      const ak = a[k]
      let convolution = 0
      for (let i = 1; i < k; i++) {
        convolution += h[i] * h[k - i]
      }
      h.push((ak - convolution) / (2 * h[0]))
    }

    return new Series(h, CopyBehavior.MOVE)
  }

  throw new Error('Unhandled case in divide')
}

export function exp(aInput: SeriesOrNumber): SeriesOrNumber {
  if (typeof aInput === 'number') {
    return Math.exp(aInput)
  }

  else if (aInput instanceof Series) {
    const a = aInput.coefficients
    const h = [ Math.exp(a[0]) ]

    for (let k = 1; k < a.length; k++) {
      let convolution = 0
      for (let i = 1; i < k + 1; i++) {
        convolution += i * a[i] * h[k - i]
      }
      h.push(convolution / k)
    }

    return new Series(h, CopyBehavior.MOVE)
  }

  throw new Error('Unhandled case in divide')
}

// This computes the natural logarithm of a. It's named log to match the
// Math.log function in Javascript, even though it'd be more appropriately
// named ln.
export function log(aInput: SeriesOrNumber): SeriesOrNumber {
  if (typeof aInput === 'number') {
    if (aInput < 0) {
      throw new Error(`log called with a negative number`)
    }

    return Math.log(aInput)
  }

  else if (aInput instanceof Series) {
    if (aInput.coefficients[0] < 0) {
      throw new Error(`log called with a series whose first coefficient is negative`)
    }

    const a = aInput.coefficients
    const h = [ Math.log(a[0]) ]

    for (let k = 1; k < a.length; k++) {
      let convolution = 0
      for (let i = 1; i < k; i++) {
        convolution += i * h[i] * a[k - i]
      }
      h.push((1 / a[0]) * (a[k] - convolution / k))
    }

    return new Series(h, CopyBehavior.MOVE)
  }

  throw new Error('Unhandled case in divide')
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
export function pow(a: SeriesOrNumber, b: SeriesOrNumber): SeriesOrNumber {
  if (isNegative(a)) {
    return Series.create(NaN, NaN)
  }

  // If we got here, then a is positive. We still need to handle the
  // case where b is negative
  return exp(multiply(b, log(a)))
}

// Returns a list of two SeriesOrNumber objects.
function sinAndCos(aInput: SeriesOrNumber): SeriesOrNumber[] {
  if (typeof aInput === 'number') {
    return [ Math.sin(aInput), Math.cos(aInput) ]

  } else if (aInput instanceof Series) {
    const a = aInput.coefficients

    let sinResult: number[] = [ Math.sin(a[0]) ]
    let cosResult: number[] = [ Math.cos(a[0]) ]

    for (let k = 1; k < a.length; k++) {
      let sinConvolution = 0
      let cosConvolution = 0

      for (let i = 1; i < k + 1; i++) {
        sinConvolution += i * a[i] * cosResult[k - i]
        cosConvolution += i * a[i] * sinResult[k - i]
      }

      sinResult.push(sinConvolution / k)
      cosResult.push(- cosConvolution / k)
    }

    return [
      new Series(sinResult, CopyBehavior.MOVE),
      new Series(cosResult, CopyBehavior.MOVE),
    ]
  }

  throw new Error('Unhandled case in divide')
}

export function sin(a: SeriesOrNumber): SeriesOrNumber {
  return sinAndCos(a)[0]
}

export function cos(a: SeriesOrNumber): SeriesOrNumber {
  return sinAndCos(a)[1]
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
export function tan(aInput: SeriesOrNumber): SeriesOrNumber {
  if (typeof aInput === 'number') {
    return Math.tan(aInput)

  } else if (aInput instanceof Series) {
    const a = aInput.coefficients
    const b = [ 1 / (Math.cos(a[0]) * Math.cos(a[0])) ]
    const h = [ Math.tan(a[0]) ]

    for (let k = 1; k < a.length; k++) {
      // convolve over i..k
      let hConvolution = 0
      for (let i = 1; i < k + 1; i++) {
        hConvolution += i * a[i] * b[k - i]
      }
      h.push(hConvolution / k)

      // convolve over i..k
      let bConvolution = 0
      for (let i = 1; i < k + 1; i++) {
        bConvolution += i * h[i] * h[k - i]
      }
      b.push(2 * bConvolution / k)
    }

    return new Series(h, CopyBehavior.MOVE)
  }

  throw new Error('Unhandled case in divide')
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
export function asin(aInput: SeriesOrNumber): SeriesOrNumber {
  if (typeof aInput === 'number') {
    if (Math.abs(aInput) >= 1) {
      console.warn(`asin called with value ${aInput}`)
    }

    return Math.asin(aInput)

  } else if (aInput instanceof Series) {
    if (Math.abs(aInput.coefficients[0]) >= 1) {
      console.warn(`asin called with value ${aInput.coefficients[0]}`)
    }

    const a = aInput.coefficients
    const b = [ Math.sqrt(1 - a[0] * a[0]) ]
    const h = [ Math.asin(a[0]) ]

    for (let k = 1; k < a.length; k++) {
      // sum from i = 1..k-1
      let hConvolution = 0
      for (let i = 1; i < k; i++) {
        hConvolution += i * h[i] * b[k - i]
      }
      h.push((a[k] - hConvolution / k) / b[0])

      // sum from i = 1..k
      let bConvolution = 0
      for (let i = 1; i < k + 1; i++) {
        bConvolution += i * h[i] * a[k - i]
      }
      b.push(- bConvolution / k)
    }

    return new Series(h, CopyBehavior.MOVE)
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
export function acos(aInput: SeriesOrNumber): SeriesOrNumber {
  if (typeof aInput === 'number') {
    if (Math.abs(aInput) >= 1) {
      console.warn(`asin called with value ${aInput}`)
    }

    return Math.acos(aInput)

  } else if (aInput instanceof Series) {
    if (Math.abs(aInput.coefficients[0]) >= 1) {
      console.warn(`asin called with value ${aInput.coefficients[0]}`)
    }

    const a = aInput.coefficients
    const b = [ Math.sqrt(1 - a[0] * a[0]) ]
    const h = [ Math.acos(a[0]) ]

    for (let k = 1; k < a.length; k++) {
      // sum from i = 1..k-1
      let hConvolution = 0
      for (let i = 1; i < k; i++) {
        hConvolution += i * h[i] * b[k - i]
      }
      h.push((a[k] + hConvolution / k) / - b[0])

      // sum from i = 1..k
      let bConvolution = 0
      for (let i = 1; i < k + 1; i++) {
        bConvolution += i * h[i] * a[k - i]
      }
      b.push(bConvolution / k)
    }

    return new Series(h, CopyBehavior.MOVE)
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
export function atan(aInput: SeriesOrNumber): SeriesOrNumber {
  if (typeof aInput === 'number') {
    return Math.atan(aInput)

  } else if (aInput instanceof Series) {

    const a = aInput.coefficients
    const b = [ 1 + a[0] * a[0] ]
    const h = [ Math.atan(a[0]) ]

    for (let k = 1; k < a.length; k++) {
      // sum from i = 1..k-1
      let hConvolution = 0
      for (let i = 1; i < k; i++) {
        hConvolution += i * h[i] * b[k - i]
      }
      h.push((a[k] - hConvolution / k) / b[0])

      // sum from i = 1..k
      let bConvolution = 0
      for (let i = 1; i < k + 1; i++) {
        bConvolution += i * a[i] * a[k - i]
      }
      b.push(2 * bConvolution / k)
    }

    return new Series(h, CopyBehavior.MOVE)
  }

  throw new Error('Unhandled case in atan')
}