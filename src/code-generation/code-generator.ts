import { Node, NodeType } from '../parser/expression-parser'
import { SingleVariableAutodiffFunction, TwoVariableAutodiffFunction } from '../autodiff'
import * as series from '../series/series'
import * as series2D from '../series/series2d'

// From here: https://stackoverflow.com/a/10624119/1026198
function getFunctionName(f: Function) {
  return (
    (f as any).name != null ?
    (f as any).name :
    /function ([^(]*)/.exec( f + '' )[1]
  )
}

export const supportedFunctions = [
  getFunctionName(series.sqrt),
  getFunctionName(series.exp),
  getFunctionName(series.log),
  getFunctionName(series.sin),
  getFunctionName(series.cos),
  getFunctionName(series.tan),
  getFunctionName(series.asin),
  getFunctionName(series.acos),
  getFunctionName(series.atan),
]

// TODO(ryan): ensure that Series2D uses all the same function names as series1D

export enum FunctionType {
  SINGLE_VARIABLE,
  TWO_VARIABLE,
}

export interface CodeGenerationContext {
  type: FunctionType
  independentVariables: string[]
}

export function generateJavascriptForExpression(ctx: CodeGenerationContext, node: Node): string {
  switch (node.type) {
    case NodeType.BINARY_OPERATOR: {
      const op = node.token.value
      const functionName = (
        op === '+' ? 's.' + getFunctionName(series.add) :
        op === '-' ? 's.' + getFunctionName(series.subtract) :
        op === '*' ? 's.' + getFunctionName(series.multiply) :
        op === '/' ? 's.' + getFunctionName(series.divide) :
        op === '^' ? 's.' + getFunctionName(series.pow) :
        null
      )

      if (!functionName) {
        throw new Error(`Unhandled operator in toAutodiffSource`)
      }

      return `${functionName}(${generateJavascriptForExpression(ctx, node.firstArgument)}, ${generateJavascriptForExpression(ctx, node.secondArgument)})`
    }
    case NodeType.FUNCTION_CALL: {
      const functionName = node.function.token.value
      if (supportedFunctions.indexOf(functionName) === -1) {
        throw new Error(`${functionName} is not a supported function`)
      }
      return `s.${functionName}(${generateJavascriptForExpression(ctx, node.argument)})`
    }
    case NodeType.IDENTIFIER: {
      const name = node.token.value
      const idx = ctx.independentVariables.indexOf(name)
      if (idx === -1) {
        throw new Error(`That expression contains an identifier that isn't an independent variable: ${name}`)
      }

      switch (ctx.type) {
        case FunctionType.SINGLE_VARIABLE: {
          return `s.variableEvaluatedAtPoint(${name})`
        }
        case FunctionType.TWO_VARIABLE: {
          if (idx === 0) {
            return `s.xEvaluatedAtPoint(${name})`
          } else if (idx === 1) {
            return `s.yEvaluatedAtPoint(${name})`
          } else {
            throw new Error(`Invalid idx ${idx} for function of type ${FunctionType[ctx.type]}`)
          }
        }
      }


    }
    case NodeType.LITERAL: {
      return node.token.value
    }
    case NodeType.PREFIX_OPERATOR: {
      if (node.token.value === '-') {
        return `s.${getFunctionName(series.negative)}(${generateJavascriptForExpression(ctx, node.argument)})`
      } else if (node.token.value === '+') {
        // Do nothing
      } else {
        throw new Error(`Unhandled operator in toAutodiffSource`)
      }
    }
    case NodeType.GROUP: {
      return generateJavascriptForExpression(ctx, node.argument)
    }
  }
}

const seriesAPI = {
  toValueAndDerivatives: series.toValueAndDerivatives,
  variableEvaluatedAtPoint: series.variableEvaluatedAtPoint,
  add: series.add,
  subtract: series.subtract,
  divide: series.divide,
  multiply: series.multiply,
  negative: series.negative,
  sqrt: series.sqrt,
  pow: series.pow,
  exp: series.exp,
  log: series.log,
  sin: series.sin,
  cos: series.cos,
  tan: series.tan,
  asin: series.asin,
  acos: series.acos,
  atan: series.atan,
}

const series2DAPI = {
  toValueAndDerivatives: series2D.toValueAndDerivatives,
  xEvaluatedAtPoint: series2D.xEvaluatedAtPoint,
  yEvaluatedAtPoint: series2D.yEvaluatedAtPoint,
  add: series2D.add,
  subtract: series2D.subtract,
  divide: series2D.divide,
  multiply: series2D.multiply,
  negative: series2D.negative,
  sqrt: series2D.sqrt,
  pow: series2D.pow,
  exp: series2D.exp,
  log: series2D.log,
  sin: series2D.sin,
  cos: series2D.cos,
  tan: series2D.tan,
  asin: series2D.asin,
  acos: series2D.acos,
  atan: series2D.atan,
}

export function buildSingleVariableAutodiffFunctionForExpression(
  expression: Node,
  independentVariable: string,
): SingleVariableAutodiffFunction {

  const ctx: CodeGenerationContext = {
    type: FunctionType.SINGLE_VARIABLE,
    independentVariables: [ independentVariable ],
  }
  const src = generateJavascriptForExpression(ctx, expression)

  // The second argument is the SeriesAPI object
  const wrappedFunc = new Function(
    independentVariable,
    "s",
    `return s.${getFunctionName(series.toValueAndDerivatives)}(${src})`
  )

  return (x: number) => {
    let res: number[] = null
    series.seriesPool.trackAndReleaseAllocations(() => {
      res = wrappedFunc(x, seriesAPI)
    })
    return res
  }
}

export function buildTwoVariableAutodiffFunctionForExpression(
  expression: Node,
  independentVariables: string[],
): TwoVariableAutodiffFunction {

  const ctx: CodeGenerationContext = {
    type: FunctionType.TWO_VARIABLE,
    independentVariables,
  }
  const src = generateJavascriptForExpression(ctx, expression)

  // The second argument is the SeriesAPI object
  const wrappedFunc = new Function(
    independentVariables[0],
    independentVariables[1],
    "s",
    `return s.${getFunctionName(series2D.toValueAndDerivatives)}(${src})`
  )

  return (x: number, y: number) => {
    let res: number[] = null
    series2D.series2DPool.trackAndReleaseAllocations(() => {
      res = wrappedFunc(x, y, series2DAPI)
    })
    return res
  }
}
