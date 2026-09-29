/**
 * Decisiones de respawn de un worker de `bg`: guarda de revival, argumentos
 * de relanzamiento según el modo, marca de versión mínima y los mensajes
 * fijos que ese camino inyecta.
 *
 * Puerto de chunk-ygx717jg.js (ant 2.1.283): `$e` (guarda de revival),
 * `Ye` (argumentos por modo), `Je` (VERSION_STALENESS_STAMP) y `kt`/`We`
 * (RESPAWN_MESSAGES). Es la mitad de DECISIÓN — pura, sin acceso a disco ni
 * al proceso del worker —; la mitad de EJECUCIÓN (leer el estado real del
 * job, mutar el entorno de spawn, reaccionar a la salida del proceso) vive
 * en la clase `g7` de la referencia (workerVm.ts en ccb) y queda fuera del
 * alcance de este item: no se toca ese archivo aquí.
 *
 * Pendiente, declarado y no portado en este item:
 * - `h3` (chunk-wqncj16y.js): tras construir la lista de argumentos, la
 *   referencia la pasa por un canonicalizador general de flags del CLI
 *   (expande flags cortos, separa `--flag=valor`, normaliza rutas de
 *   dispositivo de Windows en valores de flags). Es una tabla de flags de
 *   todo el CLI (`fst`/`d`/`mst`/`TFn`), no algo específico de la decisión
 *   de respawn — pertenece a un item de canonicalización de argv, no a
 *   éste. Aquí `decideRespawnArgs` devuelve la lista ya en su forma final
 *   (larga, sin `=`), así que la falta de esta pasada es cosmética para el
 *   caso de uso de respawn.
 * - `sk` (chunk-yqm14hey.js), aplicado a `e.launch.args` en la rama
 *   `mode==="exec"`: normaliza rutas de dispositivo de Windows
 *   (`\\?\`, `\\.\`). El demonio no soporta Windows (mismo criterio que
 *   `socketPaths.ts` y `jobDirectoryCleanup.ts`), así que aquí es
 *   identidad.
 * - El uso de `RESPAWN_MESSAGES.autoRestartContinuation` desde
 *   `src/packages/repl/src/conversationRecovery.tsx` (que hoy tiene su
 *   propio `resumeText` genérico) no se conecta aquí: `src/packages/repl`
 *   está fuera del alcance de este item.
 * - La mutación real del entorno de spawn con `decideRevivalEnv` (ref:
 *   `V.CLAUDE_CODE_RESUME_INTERRUPTED_TURN=...`) y la comparación de
 *   `VERSION_STALENESS_STAMP` contra la versión del worker (ref: `vQn`,
 *   consumida sólo por `isParkedIdleFork` en `g7`) tampoco se conectan:
 *   ambas vivirían en workerVm.ts, fuera de alcance.
 */

/** Modo de lanzamiento de un job de `bg`. Ref `e.launch.mode` (chunk-ygx717jg.js). */
export type RespawnLaunchInfo =
  | { mode: 'exec'; args: readonly string[] }
  | { mode: 'prompt'; args: readonly string[] }
  | {
      mode: 'resume'
      sessionId: string
      fork?: boolean
      transcriptPath?: string
      flagArgs?: readonly string[]
    }

/** Subconjunto del dispatch de un job que `decideRespawnArgs` necesita. */
export interface RespawnDispatch {
  sessionId: string
  launch: RespawnLaunchInfo
}

/**
 * Filtra `--environment[=valor]` / `--pool[=valor]` (y su valor separado)
 * de una lista de argumentos — un respawn no debe re-propagar el
 * entorno/pool con el que se lanzó el job original. Ref `$1e`
 * (chunk-ktadede2.js).
 */
function stripEnvironmentPoolFlags(args: readonly string[]): string[] {
  const out: string[] = []
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!
    if (arg === '--') {
      out.push(...args.slice(i))
      break
    }
    if (arg.startsWith('--environment=') || arg.startsWith('--pool=')) continue
    if (arg === '--environment' || arg === '--pool') {
      const next = args[i + 1]
      if (next !== undefined && !next.startsWith('-')) i++
      continue
    }
    out.push(arg)
  }
  return out
}

/**
 * Decide los argumentos de relanzamiento de un worker de `bg` según su
 * modo de lanzamiento y el intento de respawn. Ref `Ye` (chunk-ygx717jg.js).
 *
 * @param dispatch metadata estable del job (sessionId original + modo de
 *   lanzamiento).
 * @param attempt número de intento de spawn (1 = primer lanzamiento).
 * @param hasMessages si la transcripción a la que se resumiría ya tiene
 *   mensajes (ref `s`/`g`: resultado de comprobar el transcript).
 * @param resumeSessionId sessionId al que este intento debería resumir
 *   (ref `h`/`S`: puede diferir de `dispatch.sessionId` tras un respawn
 *   con sesión limpia).
 * @param liveTranscriptPath ruta de la transcripción viva encontrada, si
 *   la hay (ref `n`/`k`).
 * @param respawnFlags flags adicionales guardados del spawn original
 *   (ref `p`/`_`).
 */
export function decideRespawnArgs(
  dispatch: RespawnDispatch,
  attempt: number,
  hasMessages: boolean,
  resumeSessionId: string,
  liveTranscriptPath: string | undefined,
  respawnFlags: readonly string[],
): string[] {
  if (dispatch.launch.mode === 'exec') return [...dispatch.launch.args]
  if (attempt > 1 && hasMessages) {
    return ['--resume', liveTranscriptPath ?? resumeSessionId, ...stripEnvironmentPoolFlags(respawnFlags)]
  }
  if (attempt > 1 && resumeSessionId !== dispatch.sessionId) {
    return ['--session-id', resumeSessionId, ...stripEnvironmentPoolFlags(respawnFlags)]
  }
  if (dispatch.launch.mode === 'resume') {
    return [
      ...(dispatch.launch.fork ? ['--session-id', dispatch.sessionId, '--fork-session'] : []),
      '--resume',
      dispatch.launch.transcriptPath ?? dispatch.launch.sessionId,
      ...stripEnvironmentPoolFlags(dispatch.launch.flagArgs ?? []),
    ]
  }
  return stripEnvironmentPoolFlags(dispatch.launch.args)
}

/**
 * Marca de versión/build mínima que la referencia usa para decidir si un
 * worker vivo quedó desactualizado frente al binario actual. Ref `Je`
 * (VERSION_STALENESS_STAMP, chunk-ygx717jg.js). Su único consumidor en la
 * referencia es `g7.isParkedIdleFork` (vía `vQn`, chunk-kc04kkkd.js), que
 * vive en workerVm.ts y queda fuera del alcance de este item — ver
 * "Pendiente" arriba.
 */
export const VERSION_STALENESS_STAMP = {
  release: '2.1.213',
  commitMs: Date.UTC(2026, 6, 16, 18, 0, 5),
} as const

/**
 * Mensajes fijos que el camino de respawn inyecta. Ref `kt`
 * (autoRestartContinuation) y `We` (sessionIdCollision), ambos
 * chunk-ygx717jg.js.
 */
export const RESPAWN_MESSAGES = {
  /**
   * Prompt de continuación inyectado como `CLAUDE_CODE_RESUME_PROMPT`
   * tras un respawn automático no solicitado por el usuario. Ref `kt`.
   */
  autoRestartContinuation:
    'Continue from where you left off. Note: this session was automatically restarted after its process exited unexpectedly; the user has not sent a new message since the restart. Re-verify anything time-sensitive (branch state, running processes, prior partial work) before continuing.',
  /**
   * Detalle de estado `crashed` cuando el session id del respawn ya
   * pertenece a otra conversación viva. Ref `We`.
   */
  sessionIdCollision:
    'session ID already belongs to another conversation — open again to start with a new ID',
} as const

/**
 * Ventana máxima (ms) para considerar interrumpido un turno interactivo
 * al revivir un worker. Ref `vt` (chunk-ygx717jg.js), leída junto a `kt`.
 */
export const INTERACTIVE_LINEAGE_MAX_AGE_MS = 3600000

/**
 * Guarda de característica: gatea si un respawn automático inyecta el
 * prompt de continuación. Ref `$e` (chunk-ygx717jg.js):
 * `function $e(){return x("tengu_bg_revival_guard",!0)}` — lee el flag
 * `tengu_bg_revival_guard` de un backend de gates (statsig) con valor por
 * defecto `true`. ccb no tiene ese backend (no hay `getFeatureValueWithSource`
 * portado), así que aquí es el valor por defecto fijo, sin variable de
 * entorno nueva: el propio default de la referencia ya es `true` y nadie
 * lo cambia sin ese backend.
 */
export function isRevivalGuardEnabled(): boolean {
  return true
}

/** Señales que deciden si un respawn cuenta como "revival" de un turno interrumpido. */
export interface RevivalContext {
  /** Número de intento de spawn (1 = primer lanzamiento, nunca es revival). */
  attempt: number
  /** Si la transcripción a la que se resume ya tiene mensajes. */
  hasMessages: boolean
  /** Si este respawn lo disparó un upgrade del binario, no un crash. */
  isUpgradeRespawn: boolean
  /** Si el worker desciende de un turno interactivo (no automatizado). */
  interactiveLineage: boolean
}

/** Variables de entorno que `decideRevivalEnv` decide inyectar en el spawn. */
export interface RevivalEnv {
  CLAUDE_CODE_RESUME_INTERRUPTED_TURN: '1'
  CLAUDE_CODE_RESUME_PROMPT?: string
  CLAUDE_CODE_RESUME_INTERRUPTED_TURN_MAX_AGE_MS?: string
}

/**
 * Decide las variables de entorno de "revival" para un respawn. Ref (dentro
 * de `doSpawn`, chunk-ygx717jg.js):
 *
 *   if (attempt>1 && hasMessages && !afterUpgrade) {
 *     V.CLAUDE_CODE_RESUME_INTERRUPTED_TURN = "1";
 *     if ($e()) {
 *       V.CLAUDE_CODE_RESUME_PROMPT ??= kt;
 *       if (interactiveLineage) V.CLAUDE_CODE_RESUME_INTERRUPTED_TURN_MAX_AGE_MS ??= String(vt);
 *     }
 *   }
 *
 * `CLAUDE_CODE_RESUME_INTERRUPTED_TURN` se fija SIEMPRE que el respawn sea
 * un revival genuino (sin gatear por `$e()`); el prompt y la ventana de
 * edad sí están gateados por la guarda de revival.
 */
export function decideRevivalEnv(context: RevivalContext): RevivalEnv | null {
  if (!(context.attempt > 1 && context.hasMessages && !context.isUpgradeRespawn)) return null
  const env: RevivalEnv = { CLAUDE_CODE_RESUME_INTERRUPTED_TURN: '1' }
  if (isRevivalGuardEnabled()) {
    env.CLAUDE_CODE_RESUME_PROMPT = RESPAWN_MESSAGES.autoRestartContinuation
    if (context.interactiveLineage) {
      env.CLAUDE_CODE_RESUME_INTERRUPTED_TURN_MAX_AGE_MS = String(INTERACTIVE_LINEAGE_MAX_AGE_MS)
    }
  }
  return env
}
