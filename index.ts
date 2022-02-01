// A typescript implementation of Mini-Adapton.
// Based on A Minimal Implementation of Incremental Computation in Scheme,
// by Dakota Fisher, Matthew Hammer, William Byrd, Matthew Might
// https://arxiv.org/pdf/1609.05337.pdf

// Micro-Adapton
//=================

// An Adapton is a node in our computation graph.
interface Adapton {
  /** The computation */
  thunk: Function

  /** The last computed result */
  result: any

  /** Set of subcomputations that this node depends on */
  sub: Set<Adapton>

  /** Set of supercomputations that depend on this node */
  super: Set<Adapton>

  /** Is the result still valid? */
  clean: boolean
}

/** Given a thunk, initialize an adapton. */
const makeAthunk = (thunk: (self: Adapton) => any): Adapton => {
  const a: Adapton = {
    thunk: () => {},
    result: undefined,
    sub: new Set(),
    super: new Set(),
    clean: false
  }

  // We deviate slightly from the paper because JS doesn't allow recursive bindings--
  // the thunk passed in by the user can access the adapton itself via an argument.
  a.thunk = () => thunk(a)

  return a
}

/** Add a dependency edge from a supercomputation to a subcomputation */
const addEdge = (superComp: Adapton, subComp: Adapton) => {
  superComp.sub.add(subComp)
  subComp.super.add(superComp)
}

/** Remove a dependency edge */
const deleteEdge = (superComp: Adapton, subComp: Adapton) => {
  superComp.sub.delete(subComp)
  subComp.super.delete(superComp)
}

/** Compute the current value of an adapton */
const adaptonCompute = (a: Adapton): any => {
  if (a.clean) {
    // It the adapton is clean, the existing result is valid
    return a.result
  } else {
    // Remove subcomputations before recomputing.
    // Any necessary subcomputations will be added back while computing.
    for (const x of a.sub) {
      deleteEdge(a, x)
    }
    a.clean = true
    a.result = a.thunk()

    // Recursively call, rather than directly return the result--
    // this is to handle cases where the subcomputation set might have changed while computing
    return adaptonCompute(a)
  }
}

/** Mark an adapton as dirty, including recursively any supercomputations needed. */
const adaptonDirty = (a: Adapton) => {
  // Short-circuit if already dirty; this prevents duplicated dirtying work
  if(!a.clean) return
  a.clean = false
  for (const x of a.super) {
    adaptonDirty(x)
  }
}

/** Create a ref cell with an initial value */
const adaptonRef = (val: any): Adapton => {
  const a: Adapton = makeAthunk(self => self.result)
  a.result = val
  a.clean = true
  return a
}

/** Set the value of a ref cell */
const adaptonRefSet = (a: Adapton, val: any) => {
  a.result = val
  adaptonDirty(a)
}

// Test out the code so far
// ===============

const r1 = adaptonRef(8)
const r2 = adaptonRef(10)

let a: Adapton = makeAthunk(a => {
  // Dynamically add edges for dependencies before computing
  addEdge(a, r1)
  addEdge(a, r2)
  return adaptonCompute(r1) - adaptonCompute(r2)
})

console.log(`8 - 10 = ${adaptonCompute(a)}`)
adaptonRefSet(r1, 2)
console.log(`2 - 10 = ${adaptonCompute(a)}`)

// Mini-Adapton: some helpers
//============================

let currentlyAdapting: Adapton | null = null

/** Compute an Adapton's result, while auto-tracking dependencies.
 *  Include any value referenced during the computation as a subcomputation.
 */
const adaptonForce = (a: Adapton) => {
  // Remember what we were adapting
  let prevAdapting = currentlyAdapting

  // Compute a in a context where it's being adapted, then reset
  currentlyAdapting = a
  let result = adaptonCompute(a)
  currentlyAdapting = prevAdapting

  if(currentlyAdapting) {
    addEdge(currentlyAdapting, a)
  }
  return result
}

// Some more tests
// ================

console.log("Mini-adapton")
let r = adaptonRef(5)
a = makeAthunk(() => adaptonForce(r) + 3)
console.log(`a = ${adaptonForce(a)} (expected: 8)`)
adaptonRefSet(r, 2)
console.log(`a = ${adaptonForce(a)} (expected: 5)`)

let s = adaptonRef(4)
let b = makeAthunk(() => adaptonForce(a) + adaptonForce(s))
console.log(`b = ${adaptonForce(b)} (expected: 9)`)
adaptonRefSet(r, 4)
adaptonRefSet(s, 5)
console.log(`b = ${adaptonForce(b)} (expected: 12)`)