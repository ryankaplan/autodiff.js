
// Errors thrown by the expression parser are of type
// ParserError. When thrown they are each given a valid
// user-readable error message which is caught inside
// parseExpression and returned to the caller in the
// result.

export const ERROR_NAME_PARSER = 'ParserError'

export class ParserError extends Error {
  name = ERROR_NAME_PARSER

  constructor(public message: string) {
    super(message)
  }
}
export function isParserError(err: Error): err is ParserError {
  return err.name === ERROR_NAME_PARSER
}

export module ErrorMsg {
  export const genericFailure = `Couldn't parse that expression`

  export const emptyParens = `The expression contains an empty set of parentheses like (); this is not valid syntax`

  export const missingRightParen = `The expression is missing a right parenthesis`

  export const nonIdentifierFunctionName = `It looks like you're trying to call something that isn't a function`

  export const invalidArgument = (functionName: string) => {
    return `Couldn't parse an argument to the function ${functionName}. Perhaps you're missing a closing parenthesis.`
  }

  export const operatorMissingRightOperand = (operator: string) => {
    return `We expected something after the operator ${operator}`
  }

  export const invalidCharacter = (s: string) => {
    return `${s} isn't a valid character`
  }
}