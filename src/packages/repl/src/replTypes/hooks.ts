// Canonical owner is @thyrox/agent/types/hooks.
export type * from '@thyrox/agent/types/hooks.js'
// Nombres de valor generados por src/verify/expandStarShims.ts — `bun build` no
// los ve a través de un `export *` externo cuando el shim también es entrada.
export { HOOK_EVENTS, hookJSONOutputSchema, isAsyncHookJSONOutput, isHookEvent, isSyncHookJSONOutput, promptRequestSchema } from '@thyrox/agent/types/hooks.js'
