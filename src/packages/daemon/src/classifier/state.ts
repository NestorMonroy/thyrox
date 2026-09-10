/**
 * Estado del clasificador por-worker — `ant 3921.js` _LH escribe esta
 * forma al sidecar state.json de cada worker. El list del daemon / la UI
 * del hub lo leen.
 *
 * Puerto fiel de `ccnmt: packages/daemon/src/classifier/state.ts`.
 */

export type WorkerState = 'idle' | 'working' | 'blocked' | 'done' | 'failed' | 'crashed' | 'stopped'
export type WorkerTempo = 'active' | 'idle' | 'blocked'

export interface ClassifierResult {
  state: WorkerState
  detail: string
  tempo: WorkerTempo
  needs?: string
  output?: Record<string, string>
  /** 'preclassify' | 'heuristic' | 'llm' | 'apiError' — procedencia. */
  source: 'preclassify' | 'heuristic' | 'llm' | 'apiError'
  /** String de 'branch' del clasificador interno (qué regex / ruta LLM). */
  branch?: string
}

export interface WorkerStateFile {
  /** Estado actual. */
  state: WorkerState
  /** Detalle de una línea (texto de pantalla de bloqueo). */
  detail: string
  /** Tempo: active/idle/blocked. */
  tempo: WorkerTempo
  /** Se fija cuando está bloqueado: qué debe hacer el usuario. */
  needs?: string
  /** Salidas estructuradas opcionales (p. ej. {result: "..."}). */
  output?: Record<string, string>
  /** Última procedencia de clasificador ('preclassify' / 'heuristic' / 'llm'). */
  classifySource?: ClassifierResult['source']
  /** Primera vez que se vio un estado terminal (done/failed/crashed). */
  firstTerminalAt?: string
  /** Timestamp de creación (ISO). */
  createdAt: string
  /** Timestamp de última actualización (ISO). */
  updatedAt: string
  /** Id de sesión originante. */
  sessionId?: string
  /** Id de sesión de resume (post-reinicio). */
  resumeSessionId?: string
  /** Versión de ccb que clasificó. */
  cliVersion?: string
  /** Cwd del worker. */
  cwd: string
  /** Directiva original del usuario (intención). */
  intent?: string
  /** Primer prompt de usuario verbatim. */
  initialPrompt?: string
  /** Nombre simbólico del agente (slug). */
  name?: string
  /** De dónde vino el nombre ('user' | 'llm-summarize'). */
  nameSource?: string
  /** `ant 3921.js` — backend siempre 'daemon' para ccb. */
  backend?: string
  /** Presupuesto de tokens hasta ahora. */
  tokens?: {
    input: number
    output: number
    cacheRead: number
    cacheCreation: number
  }
}

/** Constantes de `ant 3918.js`. */
export const TERMINAL_STATES: ReadonlySet<WorkerState> = new Set([
  'done',
  'failed',
  'stopped',
  'crashed',
])

export function isTerminalState(s: string | undefined): boolean {
  return s !== undefined && TERMINAL_STATES.has(s as WorkerState)
}

/** Trunca texto a MAX_DETAIL_CHARS (ant PM = 800). */
export const MAX_DETAIL_CHARS = 800
/** Tamaño de cola alimentado al LLM (ant am7 = 2000). */
export const LLM_TAIL_CHARS = 2000

export function truncate(s: string, max: number = MAX_DETAIL_CHARS): string {
  if (s.length <= max) return s
  let q = max - 1
  // No partir un par de surrogates (ant up5).
  const code = s.charCodeAt(q - 1)
  if (code >= 55296 && code <= 56319) q--
  return s.slice(0, q) + '…'
}
