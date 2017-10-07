// I have long-term plans to avoid global settings in this way, but it's
// a pain to do right now.

import { Pool } from './pool'
import { Series } from './series'
import { Series2D } from './series2d'

// Pool parameters for Series
////////////////////////////////////////////////////////////

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

// Pool parameters for Series2D
////////////////////////////////////////////////////////////

function newSeries2D(): Series2D {
  return new Series2D()
}

function clearSeries2D(s: Series2D) {
  for (let i = 0; i < s.coefficients.length; i++) {
    s.coefficients[i] = 0
  }
}

function copySeries2D(to: Series2D, from: Series2D) {
  for (let i = 0; i < to.coefficients.length; i++) {
    to.coefficients[i] = from.coefficients[i]
  }
}

// AutodiffContext
////////////////////////////////////////////////////////////


export interface Options {
  numDerivativesToCompute: number
}

export class AutodiffContext {
  private _numDerivativesToCompute = 3
  public seriesPool = new Pool<Series>(newSeries, clearSeries, copySeries)
  public series2DPool = new Pool<Series2D>(newSeries2D, clearSeries2D, copySeries2D)

  constructor(opts: Options) {
    this._numDerivativesToCompute = opts.numDerivativesToCompute
  }

  setNumberOfDerivativesToCompute(n: number) {
    if (n !== this._numDerivativesToCompute) {
      this.seriesPool.forgetFreeElements()
      this.series2DPool.forgetFreeElements()
    }

    this._numDerivativesToCompute = n
  }

  numDerivativesToCompute(): number {
    return this._numDerivativesToCompute
  }
}

export const defaultContext = new AutodiffContext({
  numDerivativesToCompute: 5,
})
