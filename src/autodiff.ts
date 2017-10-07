export {
  toValueAndDerivatives,
  SeriesOrNumber,
} from './series/series'

import {
  buildSingleVariableAutodiffFunctionForExpression,
  buildTwoVariableAutodiffFunctionForExpression,
} from './code-generation/code-generator'

import { parseExpression } from './parser/expression-parser'
import { defaultContext } from './series/autodiff-context'

export type SingleVariableAutodiffFunction = (x: number) => number[]
export type TwoVariableAutodiffFunction = (x: number, y: number) => number[]

export function setNumberOfDerivativesToCompute(n: number) {
  defaultContext.setNumberOfDerivativesToCompute(n)
}

export function compileFunction(independentVariable: string, exprString: string): SingleVariableAutodiffFunction {
  const { expression, userReadableError } = parseExpression(exprString)
  if (userReadableError) {
    throw new Error(userReadableError)
  }

  return buildSingleVariableAutodiffFunctionForExpression(expression, independentVariable)
}

export function compileTwoVariableFunction(firstIndependentVariable: string, secondIndependentVariable: string, exprString: string): TwoVariableAutodiffFunction {
  const { expression, userReadableError } = parseExpression(exprString)
  if (userReadableError) {
    throw new Error(userReadableError)
  }

  return buildTwoVariableAutodiffFunctionForExpression(expression, [
    firstIndependentVariable,
    secondIndependentVariable,
  ])
}