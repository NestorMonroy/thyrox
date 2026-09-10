/**
 * Tipos del log de sesion — porte PARCIAL DECLARADO de
 * `ccnmt: packages/agent/logsTypes.ts`.
 *
 * La fuente declara 26 simbolos exportados (`SerializedMessage`, `LogOption`,
 * `SummaryMessage`, `CustomTitleMessage`, `AiTitleMessage`,
 * `LastPromptMessage`, `TaskSummaryMessage`, `TagMessage`,
 * `AgentNameMessage`, `AgentColorMessage`, `AgentSettingMessage`,
 * `PRLinkMessage`, `ModeEntry`, `PersistedWorktreeSession`,
 * `WorktreeStateEntry`, `ContentReplacementEntry`, `FileHistorySnapshotMessage`,
 * `ForkContextRefEntry`, `FileAttributionState`, `AttributionSnapshotMessage`,
 * `TranscriptMessage`, `SpeculationAcceptMessage`, `ContextCollapseCommitEntry`,
 * `ContextCollapseSnapshotEntry`, `Entry`, `sortLogs`) que modelan CADA tipo
 * de entrada que puede aparecer en el transcript persistido de una sesion.
 *
 * Se portan aqui SOLO los DOS que `commitAttribution.ts` consume y que
 * `__tests__/attributionSnapshotHelpers.test.ts` ejercita:
 * `FileAttributionState` y `AttributionSnapshotMessage`. El resto queda
 * fuera porque:
 *
 * - la mayoria son entradas de transcript (`SummaryMessage`,
 *   `CustomTitleMessage`, `TagMessage`, ...) sin consumidor en este cierre;
 * - `TranscriptMessage`/`SerializedMessage`/`Entry`/`LogOption` agregan la
 *   union completa de entradas y arrastran `ContentReplacementRecord` desde
 *   `@claude-code-how-works/storage/toolResultStorage.js`, un paquete
 *   hermano que este arbol no tiene;
 * - `FileHistorySnapshotMessage` necesitaria `FileHistorySnapshot` de
 *   `./fileHistory.js`, que tampoco tiene consumidor en este cierre.
 *
 * Se extraen cuando aparezca su primer consumidor real — mismo criterio que
 * ya declara `messageShapes.ts` en este mismo paquete.
 */

/** Estado de atribucion por archivo — contribucion de caracteres de Claude. */
export type FileAttributionState = {
  /** Hash SHA-256 del contenido del archivo. */
  contentHash: string
  /** Caracteres escritos por Claude. */
  claudeContribution: number
  /** Momento de modificacion del archivo. */
  mtime: number
}

/**
 * Mensaje de snapshot de atribucion persistido en el transcript de sesion.
 * Es un volcado de estado COMPLETO, no un delta — ver el docstring de
 * `restoreAttributionStateFromSnapshots` en `commitAttribution.ts`.
 */
export type AttributionSnapshotMessage = {
  type: 'attribution-snapshot'
  messageId: string
  /** Superficie del cliente (cli, ide, web, api). */
  surface: string
  fileStates: Record<string, FileAttributionState>
  /** Total de prompts en la sesion. */
  promptCount?: number
  /** Prompts al ultimo commit. */
  promptCountAtLastCommit?: number
  /** Total de prompts de permiso mostrados. */
  permissionPromptCount?: number
  /** Prompts de permiso al ultimo commit. */
  permissionPromptCountAtLastCommit?: number
  /** Total de pulsaciones de ESC (permiso cancelado). */
  escapeCount?: number
  /** Pulsaciones de ESC al ultimo commit. */
  escapeCountAtLastCommit?: number
}
