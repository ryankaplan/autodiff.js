export {
  toValueAndDerivatives,
  SeriesOrNumber,
  setNumberOfDerivativesToCompute,
} from './series/series'

import { parseExpression } from './parser/expression-parser'
import { buildAutodiffFunctionForExpression } from './code-generation/code-generator'

export interface ISeries {
  coefficients: number[]
}

export type AutodiffFunction = (x: number) => number[]

export function compileExpression(input: string): AutodiffFunction {
  const { expression, userReadableError } = parseExpression(input)
  if (userReadableError) {
    throw new Error(userReadableError)
  }

  return buildAutodiffFunctionForExpression(expression)
}