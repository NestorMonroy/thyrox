// Canonical owner is @thyrox/memory/memorySourceTypes.
export * from '@thyrox/memory/memorySourceTypes'
// Nombres de valor generados por src/verify/expandStarShims.ts — `bun build` no
// los ve a través de un `export *` externo cuando el shim también es entrada.
export { MEMORY_TYPE_VALUES } from '@thyrox/memory/memorySourceTypes'
