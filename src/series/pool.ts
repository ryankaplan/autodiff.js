// We cache instances of Series to avoid unnecessary allocations during
// computation. This sounds like not a big deal, but is pretty easy to
// do and has a measurable impact on the performance test, espectially
// when computing many derivatives.
//
// Without this caching, the performance test runs at ~25k autodiff
// function evaluations per second. With it, it grows to ~31k.

export interface Freeable {
  isFree: boolean
}

export class Pool<T extends Freeable> {
  private _free: T[] = []
  private _trackedAllocations: T[] = null

  constructor(
    private _newT: () => T,
    private _clearT: (t: T) => void,
    private _copyT: (to: T, from: T) => void
  ) { }

  // Use this to capture all allocated series in the process of a computation
  // and to free them all afterward.
  public trackAndReleaseAllocations(callback: () => void) {
    // Set _capturedAllocations to an empty array indicating that
    // we want to start tracking all allocated series so that they
    // can be freed at the end of a computation.
    this._trackedAllocations = []

    // Perform the computation.
    callback()

    // Free all necessary allocations.
    for (let i = 0; i < this._trackedAllocations.length; i++) {
      if (!this._trackedAllocations[i].isFree) {
        this.markFree(this._trackedAllocations[i])
      }
    }

    // Stop tracking allocations
    this._trackedAllocations = null
  }

  public allocate(): T {
    let res: T = null

    if (this._free.length > 0) {
      // There are free series. Pop one and clear its memory.
      res = this._free.pop()
      this._clearT(res)
    } else {
      // Otherwise allocate a new one.
      res = this._newT()
    }

    // If we're currently tracking allocations, save this one so that
    // it can be freed and re-used later.
    if (this._trackedAllocations) {
      this._trackedAllocations.push(res)
    }

    res.isFree = false
    return res
  }

  public allocateCopy(s: T): T {
    const copy = this.allocate()
    this._copyT(copy, s)
    copy.isFree = false
    return copy
  }

  public markFree(series: T) {
    series.isFree = true
    this._free.push(series)
  }
}