// Canonical owner is @thyrox/provider/systemConstants.
export * from '@thyrox/provider/systemConstants.js'
// Nombres de valor generados por src/verify/expandStarShims.ts — `bun build` no
// los ve a través de un `export *` externo cuando el shim también es entrada.
export { CLI_SYSPROMPT_PREFIXES, getAttributionHeader, getClientPlatform, getCLISyspromptPrefix } from '@thyrox/provider/systemConstants.js'
