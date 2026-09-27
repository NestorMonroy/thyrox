// Canonical owner is @thyrox/agent/command.
export * from '@thyrox/agent/command.js'
// Nombres de valor generados por src/verify/expandStarShims.ts — `bun build` no
// los ve a través de un `export *` externo cuando el shim también es entrada.
export { getCommandName, isCommandEnabled } from '@thyrox/agent/command.js'
