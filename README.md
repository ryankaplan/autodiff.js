# autodiff.js

This is a library for efficiently and accurately computing the derivatives of single variable functions. It uses a method called automatic differentiation.

If you're interested in how it works, an excellent introduction is 'An Introduction to Automatic Differentiation and MATLAB Object-Oriented Programming' by Richard Neidinger. This library is loosely based on sections 5 and 6 of that paper.

## Usage

In the below example, we compute the first 10 derivatives of the function x ^ (x + 1) at the point x = PI.

```ts
import * as autodiff from 'autodiff'

autodiff.setNumDerivativesToCompute(100)

// In Chrome on OSX, compileExpression is fast enough to be called
// > 10k times per second for most simple math equations
const mathFunc = autodiff.compileExpression('x * 3 + x ^ 2 / (x + 1)')

// In Chrome on OSX, mathFunc is fast enough to be called > 20k times
// per second for most simple math expressions and numDerivativesToCompute = 100
const result = mathFunc(3)
const valueAtThree = result[0]
const firstDerivativeAtThree = result[1]
const secondDerivativeAtThree = result[2]
// etc...
```

The following mathematical functions are supported...

```ts
add(a, b)
subtract(a, b)
multiply(a, b)
divide(a, b)

exp(a)
log(a)

pow(a, b) // for a > 0
sqrt(a)

sin(a)
cos(a)
tan(a)

asin(a)
acos(a)
atan(a)
```

## Performance

autodiff.js is way faster than symbolic differentiation for most equations. For example `x ^ (x ^ 2 + 1)` takes a really long time to compute the derivative of symbolicly (trying to compute its 30th derivative symbolicly on a popular math computation website times out). But autodiff.js computes its 100th derivative 27000 times per second.
