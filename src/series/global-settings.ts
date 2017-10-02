// I have long-term plans to avoid global settings in this way, but it's
// a pain to do right now.

let _numDerivativesToCompute = 3

export function setNumberOfDerivativesToCompute(n: number) {
  _numDerivativesToCompute = n
}

export function numDerivativesToCompute(): number {
  return _numDerivativesToCompute
}