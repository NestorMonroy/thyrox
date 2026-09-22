/**
 * Barrel del porte de `@claude-code-how-works/tool-registry` (ccnmt) a
 * thyrox.
 *
 * La superficie runtime y sus host bindings ya tienen implementaciones
 * canónicas en `runtime.ts` y `host.ts`. El barrel las publica de forma
 * explícita: los consumidores no deben saltarse la inicialización del runtime
 * importando `api.ts`, ni mantener una segunda lista de presets.
 *
 * `progressTypes.js` NO se reexporta por separado: `Tool.js` ya reexporta
 * sus ocho símbolos (`AgentToolProgress`, `BashProgress`, `MCPProgress`,
 * `REPLToolProgress`, `SkillToolProgress`, `TaskOutputProgress`,
 * `WebSearchProgress`, `ToolProgressData`) — un `export *` de ambos
 * produciría exports ambiguos/duplicados (TS2308 en cualquier
 * typechecker). Quien necesite un símbolo de `progressTypes.ts` que
 * `Tool.ts` no reexporte lo importa directo de `./progressTypes.js`.
 */

export * from './Tool.js'
export * from './appStateTypes.js'
export * from './genericTypeUtils.js'
export * from './fileStateCache.js'
export * from './codeIndexing.js'
export * from './utils/array.js'
export * from './utils/lazySchema.js'

export type {
  Tool,
  ToolPermissionContext,
  ToolPreset,
  Tools,
} from './runtime.ts'
export {
  TOOL_PRESETS,
  assembleToolPool,
  filterToolsByDenyRules,
  getAllBaseTools,
  getMergedTools,
  getToolRegistry,
  getTools,
  getToolsForDefaultPreset,
  installToolRegistryRuntimeBindings,
  parseToolPreset,
} from './runtime.ts'
export { installToolRegistryHostBindings } from './host.ts'
