# autodiff.js

This is a library for computing the derivatives of single variable functions. It uses a method called automatic differentiation which is often more accurate than numerical integration and much faster than symbolic differentiation.

If you're interested in how it works, an excellent introduction is 'An Introduction to Automatic Differentiation and MATLAB Object-Oriented Programming' by Richard Neidinger. This library is loosely based on sections 5 and 6 of that paper.

## Usage

In the below example, we compute the first 10 derivatives of the function x ^ (x + 1) at the point x = PI.

```ts
import * as autodiff from 'autodiff'

// Tell autodiff to compute 10 derivatives for all future
// computations. The default is 2.
autodiff.setNumberOfDerivativesToCompute(10)

// Create a variable x
const x = autodiff.variableEvaluatedAtPoint(Math.PI)

// Construct the function f(x) = x ^ (x + 1) out of the variable
// x and various autodiff helpers
const f = autodiff.pow(
  x,
  autodiff.add(x, 1)
)

// result is an array whose first value is f(PI), whose second
// value is f'(PI), third value is f''(PI) and so on...
const result = autodiff.toValueAndDerivatives(expression)
```

The following mathematical functions are supported...

```ts
add(a, b)
subtract(a, b)
multiply(a, b)
divide(a, b)

exp(a)
log(a)

pow(a, b) // right now only for b > 0
sqrt(a)

sin(a)
cos(a)
tan(a)

asin(a)
acos(a)
atan(a)
```

## Performance

autodiff.js is way faster than symbolic differentiation for most equations. x ^ (x ^ 2 + 1) takes a really long time to compute the derivative of symbolicly (trying to compute its 30th derivative symbolicly on a popular math computation website times out). But autodiff.js computes its 100th derivative 27000 times per second.
