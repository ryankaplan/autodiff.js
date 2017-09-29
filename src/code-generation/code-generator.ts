import { Node, NodeType } from '../parser/expression-parser'
import { AutodiffFunction } from '../autodiff'
import {
  SeriesPool,
  toValueAndDerivatives,
  variableEvaluatedAtPoint,
  add,
  subtract,
  multiply,
  divide,
  negative,

  sqrt,
  pow,

  exp,
  log,

  sin,
  cos,
  tan,

  asin,
  acos,
  atan,
} from '../series/series'

// From here: https://stackoverflow.com/a/10624119/1026198
function getFunctionName(f: Function) {
  return (
    (f as any).name != null ?
    (f as any).name :
    /function ([^(]*)/.exec( f + '' )[1]
  )
}

const supportedFunctions = [
  getFunctionName(sqrt),
  getFunctionName(exp),
  getFunctionName(log),
  getFunctionName(sin),
  getFunctionName(cos),
  getFunctionName(tan),
  getFunctionName(asin),
  getFunctionName(acos),
  getFunctionName(atan),
]

export function generateJavascriptForExpression(node: Node): string {
  switch (node.type) {
    case NodeType.BINARY_OPERATOR: {
      const op = node.token.value
      const functionName = (
        op === '+' ? 's.' + getFunctionName(add) :
        op === '-' ? 's.' + getFunctionName(subtract) :
        op === '*' ? 's.' + getFunctionName(multiply) :
        op === '/' ? 's.' + getFunctionName(divide) :
        op === '^' ? 's.' + getFunctionName(pow) :
        null
      )

      if (!functionName) {
        throw new Error(`Unhandled operator in toAutodiffSource`)
      }

      return `${functionName}(${generateJavascriptForExpression(node.firstArgument)}, ${generateJavascriptForExpression(node.secondArgument)})`
    }
    case NodeType.FUNCTION_CALL: {
      const functionName = node.function.token.value
      if (supportedFunctions.indexOf(functionName) === -1) {
        throw new Error(`${functionName} is not a supported function`)
      }
      return `s.${functionName}(${generateJavascriptForExpression(node.argument)})`
    }
    case NodeType.IDENTIFIER: {
      const name = node.token.value
      if (name !== 'x') {
        throw new Error(`${name} is not a supported identifier`)
      }
      return `s.variableEvaluatedAtPoint(${name})`
    }
    case NodeType.LITERAL: {
      return node.token.value
    }
    case NodeType.PREFIX_OPERATOR: {
      if (node.token.value === '-') {
        return `s.${getFunctionName(negative)}(${generateJavascriptForExpression(node.argument)})`
      } else if (node.token.value === '+') {
        // Do nothing
      } else {
        throw new Error(`Unhandled operator in toAutodiffSource`)
      }
    }
    case NodeType.GROUP: {
      return generateJavascriptForExpression(node.argument)
    }
  }
}

const seriesAPI = {
  toValueAndDerivatives,
  variableEvaluatedAtPoint,
  add,
  subtract,
  divide,
  multiply,
  negative,
  sqrt,
  pow,
  exp,
  log,
  sin,
  cos,
  tan,
  asin,
  acos,
  atan,
}

export function buildAutodiffFunctionForExpression(expression: Node): AutodiffFunction {
  const src = generateJavascriptForExpression(expression)
  // The second argument is the SeriesAPI object
  const wrappedFunc = new Function("x", "s", `return s.${getFunctionName(toValueAndDerivatives)}(${src})`)
  return (x: number) => {
    let res: number[] = null
    SeriesPool.trackAndReleaseAllocations(() => {
      res = wrappedFunc(x, seriesAPI)
    })
    return res
  }
}