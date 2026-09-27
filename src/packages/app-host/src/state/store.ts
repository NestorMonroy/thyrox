// Canonical owner is @thyrox/repl/stateStore.
export * from '@thyrox/repl/stateStore.js'
// Nombres de valor generados por src/verify/expandStarShims.ts — `bun build` no
// los ve a través de un `export *` externo cuando el shim también es entrada.
export { createStore } from '@thyrox/repl/stateStore.js'
