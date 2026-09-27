/**
 * V7 §10.3 facade — moved to `@thyrox/memory/sessionMemoryPrompts`.
 */
export * from '@thyrox/memory/sessionMemoryPrompts'
// Nombres de valor generados por src/verify/expandStarShims.ts — `bun build` no
// los ve a través de un `export *` externo cuando el shim también es entrada.
export { buildSessionMemoryUpdatePrompt, DEFAULT_SESSION_MEMORY_TEMPLATE, isSessionMemoryEmpty, loadSessionMemoryPrompt, loadSessionMemoryTemplate, truncateSessionMemoryForCompact } from '@thyrox/memory/sessionMemoryPrompts'
