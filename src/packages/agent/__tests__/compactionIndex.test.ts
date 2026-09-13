/**
 * Control de que `compaction/index.ts` expone EXACTAMENTE los símbolos de
 * valor que `ccnmt: packages/agent/compaction/index.ts` re-exporta (los
 * tipos no dejan huella en `Object.keys` de un módulo ESM compilado, así
 * que este control cubre la mitad runtime -- funciones, constantes y
 * clases -- no los `export type`).
 *
 * Es el control de anulación de la tarea "portar el índice completo": si
 * un módulo se desconectara del barrel, este test lo detectaría por
 * ausencia, sin tener que releer los catorce archivos fuente cada vez.
 */
import { describe, expect, test } from 'bun:test'
import * as compaction from '../compaction/index.ts'

const EXPECTED_VALUE_EXPORTS = [
  'groupMessagesByApiRound',
  'isSnipBoundaryMessage',
  'projectSnippedView',
  'getCompactPrompt',
  'getPartialCompactPrompt',
  'getCompactUserSummaryMessage',
  'formatCompactSummary',
  'estimateMessageTokens',
  'SNIP_MARKER_SUBTYPE',
  'SNIP_BOUNDARY_SUBTYPE',
  'SNIP_NUDGE_TEXT',
  'MIN_KEEP_GROUPS',
  'isSnipMarkerMessage',
  'createSnipBoundaryMessage',
  'snipCompactCore',
  'shouldNudgeForSnips',
  'collectCompactableToolIds',
  'DEFAULT_SM_COMPACT_CONFIG',
  'hasTextBlocks',
  'adjustIndexToPreserveAPIInvariants',
  'calculateMessagesToKeepIndex',
  'DEFAULT_CACHED_MC_CONFIG',
  'getCachedMCConfig',
  'TIME_BASED_MC_CONFIG_DEFAULTS',
  'getTimeBasedMCConfig',
  'createCachedMCState',
  'resetCachedMCState',
  'markToolsSentToAPI',
  'registerToolResult',
  'registerToolMessage',
  'getToolResultsToDelete',
  'createCacheEditsBlock',
  'isCachedMicrocompactEnabled',
  'isModelSupportedForCacheEditing',
  'getCachedMCSimpleConfig',
  'getAPIContextManagement',
  'compactWarningStore',
  'suppressCompactWarning',
  'clearCompactWarningSuppression',
  'stripImagesFromMessages',
  'buildPostCompactMessages',
  'annotateBoundaryWithPreservedSegment',
  'mergeHookInstructions',
  'isCompactBoundaryMessage',
  'truncateHeadForPTLRetry',
  'POST_COMPACT_MAX_FILES_TO_RESTORE',
  'POST_COMPACT_TOKEN_BUDGET',
  'POST_COMPACT_MAX_TOKENS_PER_FILE',
  'POST_COMPACT_MAX_TOKENS_PER_SKILL',
  'POST_COMPACT_SKILLS_TOKEN_BUDGET',
  'MAX_COMPACT_STREAMING_RETRIES',
  'ERROR_MESSAGE_NOT_ENOUGH_MESSAGES',
  'ERROR_MESSAGE_PROMPT_TOO_LONG',
  'ERROR_MESSAGE_USER_ABORT',
  'ERROR_MESSAGE_INCOMPLETE_RESPONSE',
  'getEffectiveContextWindowSize',
  'getAutoCompactThreshold',
  'calculateTokenWarningState',
  'isMainThreadSource',
  'AUTOCOMPACT_BUFFER_TOKENS',
  'WARNING_THRESHOLD_BUFFER_TOKENS',
  'ERROR_THRESHOLD_BUFFER_TOKENS',
  'MANUAL_COMPACT_BUFFER_TOKENS',
  'MAX_CONSECUTIVE_AUTOCOMPACT_FAILURES',
].sort()

describe('compaction/index.ts', () => {
  test('expone exactamente los 62 símbolos de VALOR que ccnmt/compaction/index.ts re-exporta', () => {
    const actual = Object.keys(compaction).sort()
    expect(actual).toEqual(EXPECTED_VALUE_EXPORTS)
  })

  test('control de anulación: quitar un símbolo de la lista esperada hace fallar el test contra el barrel real', () => {
    const truncated = EXPECTED_VALUE_EXPORTS.slice(0, -1)
    expect(Object.keys(compaction).sort()).not.toEqual(truncated)
  })

  test('una muestra de cada módulo hermano responde como función/valor utilizable', () => {
    expect(typeof compaction.groupMessagesByApiRound).toBe('function')
    expect(typeof compaction.getCompactPrompt).toBe('function')
    expect(typeof compaction.estimateMessageTokens).toBe('function')
    expect(typeof compaction.snipCompactCore).toBe('function')
    expect(typeof compaction.collectCompactableToolIds).toBe('function')
    expect(typeof compaction.calculateMessagesToKeepIndex).toBe('function')
    expect(typeof compaction.getCachedMCConfig).toBe('function')
    expect(typeof compaction.getTimeBasedMCConfig).toBe('function')
    expect(typeof compaction.createCachedMCState).toBe('function')
    expect(typeof compaction.getAPIContextManagement).toBe('function')
    expect(compaction.compactWarningStore.getState()).toBe(false)
    expect(typeof compaction.stripImagesFromMessages).toBe('function')
    expect(typeof compaction.getEffectiveContextWindowSize).toBe('function')
    expect(compaction.MIN_KEEP_GROUPS).toBe(2)
    expect(compaction.AUTOCOMPACT_BUFFER_TOKENS).toBe(13_000)
  })
})
