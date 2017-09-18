
const factorialValues = [
  1, // 0!
  1, // 1!
  2,
  6,
  24,
  120,
  720,
  5040,
  40320,
  362880,
  3628800,
  39916800,
  479001600,
]

export function factorial(i: number): number {
  if (i < factorialValues.length) {
    return factorialValues[i]
  }

  const result = factorial(i - 1) * i
  if (factorialValues.length !== i) {
    throw new Error(`Expected factorialValues length to be ${i}`)
  }
  factorialValues.push(result)
  return result
}