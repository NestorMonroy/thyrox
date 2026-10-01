// Canonical owner is @thyrox/config/git/gitConfigParser.
export type * from '@thyrox/config/git/gitConfigParser.js'
// Nombres de valor generados por src/verify/expandStarShims.ts — `bun build` no
// los ve a través de un `export *` externo cuando el shim también es entrada.
export { parseConfigString, parseGitConfigValue } from '@thyrox/config/git/gitConfigParser.js'
