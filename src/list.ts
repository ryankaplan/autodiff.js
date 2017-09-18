function throwUnlessEqualLength(a: number[], b: number[]) {
  if (a.length !== b.length) {
    throw new Error('Lists are of different lengths')
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

// Given two polynomials like...
//
// f(x) = a[0] + a[1] x + a[2] x ^ 2 + a[3] x ^ 3 + ...
// g(x) = b[0] + b[1] x + b[2] x ^ 2 + b[3] x ^ 3 + ...
//
// This returns the sum of coefficients that contribute
// to term of order k in their product.
//
// If h(x) = f(x) g(x), then h_k -- the co-efficient next
// to x ^ k -- in the result, consists of all pairs of
// terms f_i and g_j such that i + j is k.
export function convolve(
  a: number[],
  b: number[],
  k: number,
): number {
  throwUnlessEqualLength(a, b)
  if (k >= a.length) {
    throw new Error(
      `k = ${k} is too large a term for polynomials of degree ${b.length - 1}`
    )
  }

  let total = 0
  for (let i = 0; i < k + 1; i++) {
    total += a[i] * b[k - i]
  }
  return total
}
