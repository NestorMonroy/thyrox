/**
 * V7 §10.3 facade — moved to `@thyrox/memory/sessionMemoryUtils`.
 */
export * from '@thyrox/memory/sessionMemoryUtils'
// Nombres de valor generados por src/verify/expandStarShims.ts — `bun build` no
// los ve a través de un `export *` externo cuando el shim también es entrada.
export { DEFAULT_SESSION_MEMORY_CONFIG, getLastSummarizedMessageId, getSessionMemoryConfig, getSessionMemoryContent, getToolCallsBetweenUpdates, hasMetInitializationThreshold, hasMetUpdateThreshold, isSessionMemoryInitialized, markExtractionCompleted, markExtractionStarted, markSessionMemoryInitialized, recordExtractionTokenCount, resetSessionMemoryState, setLastSummarizedMessageId, setSessionMemoryConfig, waitForSessionMemoryExtraction } from '@thyrox/memory/sessionMemoryUtils'
