/**
 * Puerto de `ccnmt: packages/memory/src/index.ts` (verbatim).
 */
export type {
  MemFsImplementation,
  MemoryFileHeader,
  MemoryHostBindings,
} from './contracts.js'
export { getMemoryHostBindings, installMemoryHostBindings } from './host.js'

export * from './memdir.js'
export * from './memoryAge.js'
export * from './findRelevantMemories.js'
export * from './paths.js'
export * from './teamMemPaths.js'
export * from './teamMemPrompts.js'
export * from './memoryTypes.js'
export * from './extractMemories.js'
export * from './autoDreamConfig.js'
export * from './consolidationLock.js'
export * from './consolidationPrompt.js'
export * from './teamMemorySync.js'
export * from './agentMemory.js'
export * from './errors.js'

// La fuente importa estos dos desde la RAÍZ del paquete
// (`@claude-code-how-works/memory`) en `agent/internal/stopHooksCore.ts`.
// Re-exportarlos aquí es portar su superficie pública, no una comodidad.
export { executeExtractMemories } from './extractMemories.ts'
export { isExtractModeActive } from './paths.ts'
