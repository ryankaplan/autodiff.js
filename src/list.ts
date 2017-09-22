// This files contains functions for numeric operations on lists.

function throwUnlessEqualLength(a: number[], b: number[]) {
  if (a.length !== b.length) {
    throw new Error('Lists are of different lengths')
  }
}

export function logErrorIfNaN(a: number[]) {
  for (let i = 0; i < a.length; i++) {
    if (isNaN(a[i])) {
      console.error(`autodiff.js has encountered NaN's in computation; this is probably not what you want and is due to some invalid math operation, like taking asin(1000) or raising something to a negative power which is not yet supported`)
    }
  }
}

export function add(a: number[], b: number[]) {
  throwUnlessEqualLength(a, b)

  const aCopy = a.slice()
  for (let i = 0; i < aCopy.length; i++) {
    aCopy[i] += b[i]
  }
  return aCopy
}

export function subtract(a: number[], b: number[]) {
  throwUnlessEqualLength(a, b)

  const aCopy = a.slice()
  for (let i = 0; i < aCopy.length; i++) {
    aCopy[i] -= b[i]
  }
  return aCopy
}

export function multiply(a: number[], b: number[]) {
  throwUnlessEqualLength(a, b)

  const aCopy = a.slice()
  for (let i = 0; i < aCopy.length; i++) {
    aCopy[i] *= b[i]
  }
  return aCopy
}

export function divide(a: number[], b: number[]) {
  throwUnlessEqualLength(a, b)

  const aCopy = a.slice()
  for (let i = 0; i < aCopy.length; i++) {
    aCopy[i] /= b[i]
  }
  return aCopy
}


export function addScalar(a: number[], b: number) {
  const aCopy = a.slice()
  for (let i = 0; i < aCopy.length; i++) {
    aCopy[i] += b
  }
  return aCopy
}

export function subtractScalar(a: number[], b: number) {
  const aCopy = a.slice()
  for (let i = 0; i < aCopy.length; i++) {
    aCopy[i] -= b
  }
  return aCopy
}

export function multiplyScalar(a: number[], b: number) {
  const aCopy = a.slice()
  for (let i = 0; i < aCopy.length; i++) {
    aCopy[i] *= b
  }
  return aCopy
}

export function divideScalar(a: number[], b: number) {
  const aCopy = a.slice()
  for (let i = 0; i < aCopy.length; i++) {
    aCopy[i] /= b
  }
  return aCopy
}

export function negative(a: number[]) {
  const copy = a.slice()
  for (let i = 0; i < copy.length; i++) {
    i *= -1
  }
  return copy
}
