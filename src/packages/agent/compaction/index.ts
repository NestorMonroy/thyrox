/**
 * Porte de `ccnmt: packages/agent/compaction/index.ts` -- el barrel que
 * junta los símbolos públicos de compactación de este árbol.
 *
 * Reexporta, en el MISMO orden que la fuente, los símbolos de: `types.ts`
 * (porte de `../types/compaction.ts`), `deps.ts` (porte de
 * `../types/compaction-deps.ts`, que `compactionDeps.ts` reexporta entero
 * en la fuente), y once módulos hermanos de este directorio.
 *
 * `microCompactUtils.ts` y `compactWarningState.ts` ya vivían en este árbol
 * antes de este pase (ambos idénticos a la fuente); el resto se agregó en
 * el mismo pase que este barrel.
 *
 * DOS AGREGADOS sin equivalente en la fuente (no divergencias -- superficie
 * NUEVA, porque `prompt.ts` de este árbol inyecta lo que la fuente lee de un
 * singleton): `CompactUserSummaryDeps`, el tipo del sexto parámetro de
 * `getCompactUserSummaryMessage`.
 *
 * Este barrel es DISTINTO de `loop/context/{autocompact,microcompact}.ts`:
 * esos dos son diseños NATIVOS de este árbol (leen `MODELS`/`loop/types.ts`
 * directamente, sin inyección de dependencias) para el bucle real; los de
 * `compaction/` son porte fiel de la fuente, con DI en cada punto donde la
 * fuente depende de un servicio externo (feature flags, catálogo de
 * modelos, hooks, ...). Ninguno sustituye al otro todavía.
 */
export type {
  CompactionResult,
  CompactionTrigger,
  CompactionContext,
  TokenWarningState,
  SnipCompactResult,
  MicrocompactResult,
  CachedMCConfig,
  TimeBasedMCConfig,
  ContextEditStrategy,
  ContextManagementConfig,
  PostCompactCleanupActions,
  ToolNameConstants,
  SessionMemoryCompactConfig,
} from './types.ts'

export type {
  CompactionDeps,
  FeatureFlagDep,
  ConfigDep,
  ModelDep,
  TokenDep,
  AnalyticsDep,
  ApiDep,
  MessagesDep,
  AttachmentsDep,
  HooksDep,
  StateDep,
  SessionMemoryDep,
  SessionStorageDep,
  PlansDep,
  SkillsDep,
  ToolSearchDep,
  ForkDep,
  ActivityDep,
  TranscriptDep,
  ContextCleanupDep,
} from './deps.ts'

export { groupMessagesByApiRound } from './grouping.ts'
export { isSnipBoundaryMessage, projectSnippedView } from './snipProjection.ts'
export {
  getCompactPrompt,
  getPartialCompactPrompt,
  getCompactUserSummaryMessage,
  formatCompactSummary,
} from './prompt.ts'
export type { CompactDirection, CompactUserSummaryDeps } from './prompt.ts'
export { estimateMessageTokens } from './estimateTokens.ts'
export type { TokenEstimationDeps } from './estimateTokens.ts'

export {
  SNIP_MARKER_SUBTYPE,
  SNIP_BOUNDARY_SUBTYPE,
  SNIP_NUDGE_TEXT,
  MIN_KEEP_GROUPS,
  isSnipMarkerMessage,
  createSnipBoundaryMessage,
  snipCompactCore,
  shouldNudgeForSnips,
} from './snipCompactCore.ts'
export type { SnipMessage, SnipCompactDeps, SnipCompactResult as SnipCoreResult } from './snipCompactCore.ts'

export { collectCompactableToolIds } from './microCompactUtils.ts'

export {
  DEFAULT_SM_COMPACT_CONFIG,
  hasTextBlocks,
  adjustIndexToPreserveAPIInvariants,
  calculateMessagesToKeepIndex,
} from './sessionMemoryCalc.ts'
export type { SMMessage, SessionMemoryCalcDeps } from './sessionMemoryCalc.ts'

export { DEFAULT_CACHED_MC_CONFIG, getCachedMCConfig } from './cachedMCConfig.ts'
export type { CachedMCConfigDeps } from './cachedMCConfig.ts'

export { TIME_BASED_MC_CONFIG_DEFAULTS, getTimeBasedMCConfig } from './timeBasedMCConfig.ts'
export type { TimeBasedMCConfigDeps } from './timeBasedMCConfig.ts'

export {
  createCachedMCState,
  resetCachedMCState,
  markToolsSentToAPI,
  registerToolResult,
  registerToolMessage,
  getToolResultsToDelete,
  createCacheEditsBlock,
  isCachedMicrocompactEnabled,
  isModelSupportedForCacheEditing,
  getCachedMCSimpleConfig,
} from './cachedMicrocompact.ts'
export type { CachedMCState, CacheEditsBlock, PinnedCacheEdits } from './cachedMicrocompact.ts'

export { getAPIContextManagement } from './apiMicrocompact.ts'
export type { ApiMicrocompactDeps } from './apiMicrocompact.ts'

export { compactWarningStore, suppressCompactWarning, clearCompactWarningSuppression } from './compactWarningState.ts'

export {
  stripImagesFromMessages,
  buildPostCompactMessages,
  annotateBoundaryWithPreservedSegment,
  mergeHookInstructions,
  isCompactBoundaryMessage,
  truncateHeadForPTLRetry,
  POST_COMPACT_MAX_FILES_TO_RESTORE,
  POST_COMPACT_TOKEN_BUDGET,
  POST_COMPACT_MAX_TOKENS_PER_FILE,
  POST_COMPACT_MAX_TOKENS_PER_SKILL,
  POST_COMPACT_SKILLS_TOKEN_BUDGET,
  MAX_COMPACT_STREAMING_RETRIES,
  ERROR_MESSAGE_NOT_ENOUGH_MESSAGES,
  ERROR_MESSAGE_PROMPT_TOO_LONG,
  ERROR_MESSAGE_USER_ABORT,
  ERROR_MESSAGE_INCOMPLETE_RESPONSE,
} from './compactUtils.ts'
export type {
  CompactableMessage,
  CompactBoundaryMessage,
  CompactionResult as CompactUtilsResult,
  RecompactionInfo,
} from './compactUtils.ts'

export {
  getEffectiveContextWindowSize,
  getAutoCompactThreshold,
  calculateTokenWarningState,
  isMainThreadSource,
  AUTOCOMPACT_BUFFER_TOKENS,
  WARNING_THRESHOLD_BUFFER_TOKENS,
  ERROR_THRESHOLD_BUFFER_TOKENS,
  MANUAL_COMPACT_BUFFER_TOKENS,
  MAX_CONSECUTIVE_AUTOCOMPACT_FAILURES,
} from './contextWindowManager.ts'
export type { ContextWindowDeps } from './contextWindowManager.ts'
