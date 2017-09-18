// This class defines a Series object that represents a truncated
// Taylor series. It also defines methods for doing algebra on
// Taylor series, which is used to compute derivatives efficiently.
// This falls into the general family of algorithms referred to
// as automatic differentiation.
//
// For a great, detailed, introduction to the subject I recommend
// 'Introduction to Automatic Differentiation and MATLAB
// Object-Oriented Programming' by Richard D. Neidinger (it's a
// good paper even if you, like me, know nothing about Matlab).

import * as list from './list'
import { factorial } from './factorial'

export interface ISeries {
  coefficients: number[]
}

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

// This holds the coefficients of a Taylor series. If we
// shorten the coefficients array of a series to a variable
// named c, the series would look like this...
//
// f(x) = c[0] + c[1] (x - a) + c[2] (x - a) ^ 2 + ...
//
// c[i] contains the ith derivative of f divided by
// factorial(i).
class Series implements ISeries {
  public coefficients: number[]

  // The second argument determines whether we copy the
  // co-efficients array when constructing the series
  // object. The default is to copy it, for safety. This
  // is avoided for performance reasons when this file
  // creates Series objects internally.
  constructor(coefficients: number[], copyBehavior = CopyBehavior.COPY) {
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
    copy[0] *= -1
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

export function multiply(a: SeriesOrNumber, b: SeriesOrNumber): SeriesOrNumber {
  if (typeof a === 'number' && typeof b === 'number') {
    return a * b
  }

  else if (typeof a === 'number' && b instanceof Series) {
    return new Series(list.multiplyScalar(b.coefficients, a))
  }

  else if (typeof b === 'number' && a instanceof Series) {
    return new Series(list.multiplyScalar(a.coefficients, b))
  }

  else if (a instanceof Series && b instanceof Series) {
    const aSeries = a.coefficients
    const bSeries = b.coefficients

    let result: number[] = []
    for (let k = 0; k < aSeries.length; k++) {
      result.push(list.convolve(aSeries, bSeries, k))
    }

    return new Series(result)
  }

  throw new Error('Unhandled case in add')
}

export function divide(a: SeriesOrNumber, b: SeriesOrNumber): SeriesOrNumber {
  if (typeof a === 'number' && typeof b === 'number') {
    return a / b
  }

  else if (typeof a === 'number' && b instanceof Series) {
    return new Series(list.divideScalar(b.coefficients, a))
  }

  else if (typeof b === 'number' && a instanceof Series) {
    return new Series(list.divideScalar(a.coefficients, b))
  }

  else if (a instanceof Series && b instanceof Series) {
    const aSeries = a.coefficients
    const bSeries = b.coefficients

    let result: number[] = [ aSeries[0] / bSeries[0] ]
    for (let k = 1; k < aSeries.length; k++) {
      const ak = aSeries[k]
      const b0 = bSeries[0]

      let convolution = 0
      for (let i = 0; i < k; i++) {
        convolution += result[i] * bSeries[k - i]
      }

      result.push((ak - convolution) / b0)
    }

    return new Series(result, CopyBehavior.MOVE)
  }

  throw new Error('Unhandled case in divide')
}

export function sqrt(a: SeriesOrNumber): SeriesOrNumber {
  if (typeof a === 'number') {
    return Math.sqrt(a)
  }

  else if (a instanceof Series) {
    const series = a.coefficients

    let result: number[] = [ Math.sqrt(series[0]) ]
    for (let k = 1; k < series.length; k++) {
      const ak = series[k]

      let convolution = 0
      for (let i = 1; i < k; i++) {
        convolution += result[i] * result[k - i]
      }

      result.push((ak - convolution) / (2 * result[0]))
    }

    return new Series(result, CopyBehavior.MOVE)
  }

  throw new Error('Unhandled case in divide')
}

export function exp(a: SeriesOrNumber): SeriesOrNumber {
  if (typeof a === 'number') {
    return Math.exp(a)
  }

  else if (a instanceof Series) {
    const series = a.coefficients

    let result: number[] = [ Math.exp(series[0]) ]
    for (let k = 1; k < series.length; k++) {
      let convolution = 0
      for (let i = 1; i < k + 1; i++) {
        convolution += i * series[i] * result[k - i]
      }

      result.push(convolution / k)
    }

    return new Series(result, CopyBehavior.MOVE)
  }

  throw new Error('Unhandled case in divide')
}

export function ln(a: SeriesOrNumber): SeriesOrNumber {
  if (typeof a === 'number') {
    return Math.log(a)
  }

  else if (a instanceof Series) {
    const series = a.coefficients

    let result: number[] = [ Math.log(series[0]) ]
    for (let k = 1; k < series.length; k++) {
      let convolution = 0
      for (let i = 1; i < k; i++) {
        convolution += i * result[i] * series[k - i]
      }

      const s0 = series[0]
      const sk = series[k]

      result.push((1 / s0) * (sk - convolution / k))
    }

    return new Series(result, CopyBehavior.MOVE)
  }

  throw new Error('Unhandled case in divide')
}

export function pow(a: SeriesOrNumber, b: SeriesOrNumber): SeriesOrNumber {
  return exp(multiply(b, ln(a)))
}

// Returns a list of two SeriesOrNumber objects.
function sinAndCos(a: SeriesOrNumber): SeriesOrNumber[] {
  if (typeof a === 'number') {
    return [ Math.sin(a), Math.cos(a) ]

  } else if (a instanceof Series) {
    const series = a.coefficients

    let sinResult: number[] = [ Math.sin(series[0]) ]
    let cosResult: number[] = [ Math.cos(series[0]) ]

    for (let k = 1; k < series.length; k++) {
      let sinConvolution = 0
      let cosConvolution = 0

      for (let i = 1; i < k + 1; i++) {
        sinConvolution += i * series[i] * cosResult[k - i]
        cosConvolution += i * series[i] * sinResult[k - i]
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

export function tan(a: SeriesOrNumber): SeriesOrNumber {
  return divide(sin(a), cos(a))
}
