import * as autodiff from './autodiff'

// This isn't a real test. Individual parts of this library are unit tested;
// this just demonstrates the API.
describe('autodiff', () => {
  it('not a real test', () => {
    autodiff.setNumberOfDerivativesToCompute(3)

    let f = autodiff.compileExpression('x + 1')
    expect(f(1)).toEqual([ 2, 1, 0, 0 ])

    f = autodiff.compileExpression('x x + 1')
    expect(f(2)).toEqual([ 5, 4, 2, 0 ])
  })
})