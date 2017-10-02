import * as autodiff from './autodiff'

// This isn't a real test. Individual parts of this library are unit tested;
// this just demonstrates the API.
describe('autodiff', () => {
  it('not a real test', () => {
    autodiff.setNumberOfDerivativesToCompute(2)

    // Compile a single-variable function with independent variable x
    let f = autodiff.compileFunction('x', 'x + 1')
    expect(f(1)).toEqual([2, 1, 0, 0])

    // Compile a single-variable function with independent variable t
    f = autodiff.compileFunction('t', 't * 5')
    expect(f(2)).toEqual([10, 5, 0, 0])

    // Compute a multi-variable function with independent variables x and y
    const x = 3
    const y = 2
    const f2 = autodiff.compileTwoVariableFunction('x', 'y', '(x * y) ^ 2')
    expect(f2(x, y)).toEqual([
      (x * y) ** 2,   2 * x * y * y,   2 * y * y,
      2 * y * x * x,  4 * x * y,       4 * y,
      2 * x * x,      4 * x,           4,
    ])
  })
})