export class Stream<T> {
  private _index = 0

  constructor(private _values: Array<T>) { }

  public next(): T | null {
    const value = this.peek()
    this._index++
    return value
  }

  public peek(): T | null {
    let value = null
    if (this._index < this._values.length) {
      value = this._values[this._index]
    }
    return value
  }

  public isDone() {
    return this._index >= this._values.length
  }
}