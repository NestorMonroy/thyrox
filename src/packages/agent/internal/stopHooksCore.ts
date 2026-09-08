/**
 * Cap de bloqueos consecutivos del Stop hook — porte de
 * `ccnmt: packages/agent/internal/stopHooksCore.ts` (port de ant
 * v2.1.143, 3999.js).
 *
 * Un Stop hook `/goal` cuya condición nunca puede satisfacerse bloquea
 * el turno de terminar en cada ciclo, inyectando un `blockingError` al
 * transcript cada vez. Sin cota, el transcript crece hasta que la
 * llamada principal a la API da 413 ("Prompt is too long"). Este cap
 * es el respaldo estructural: acota la racha por `maxTurns` Y por
 * `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` (default 8). El veredicto
 * `impossible` del evaluador (`execPromptHook`) puede cortar en corto
 * ALGUNOS casos, pero depende de que el evaluador lo proponga
 * voluntariamente — el cap es la garantía.
 *
 * `evaluateStopHookBlockOutcome` es una función de decisión pura:
 * `query.ts` (aguas arriba, no portado aquí) es dueño del yield y de
 * construir el estado; esta función es dueña de la aritmética, para
 * poder fijarla con un test unitario sin el loop del generador.
 *
 * PORTE PARCIAL declarado, mismo criterio que `internal/cronTasksCore.ts`
 * / `internal/loopSentinelCore.ts` (ver sus docstrings): se porta lo
 * que el test ejercita. `internal/stopHooksCore.ts` de la fuente tiene
 * 778 líneas y CINCO exports; el test de origen (`stopHookBlockCap.test.ts`)
 * importa exactamente DOS —`resolveStopHookBlockCap` y
 * `evaluateStopHookBlockOutcome`— y ninguno ejecuta código fuera de
 * esas dos funciones puras.
 *
 * Símbolos de la fuente OMITIDOS, y por qué:
 *
 *   - `handleStopHooks` — el generador async de integración completo.
 *     SIGUE BLOQUEADO, pero por otra lista que la que este archivo declaraba.
 *
 *     Re-medido 2026-09-08: de los cinco bloqueos que decía —los paquetes
 *     `memory`, `local-observability`, `app-host` y `config/env`, más
 *     `../hooks/sessionHooks.js`— **cuatro ya no existen**: los tres últimos
 *     resuelven y `sessionHooks.ts` vive en este árbol con sus trece
 *     exportaciones. El de `memory` tampoco es de porte: el paquete existe
 *     como `@thyrox/memory` con `executeExtractMemories` y
 *     `isExtractModeActive`; lo que falta es DECLARARLO como dependencia de
 *     este paquete.
 *
 *     Lo que de verdad lo bloquea hoy, medido símbolo a símbolo:
 *
 *       · **Nueve de once métodos** que el generador llama sobre
 *         `getAgentHostBindings()` NO están declarados en `host.ts` —
 *         `executeStopHooks`, `createAttachmentMessage`, `classifyJobState`,
 *         `listTasks`, `getTaskListId`, `createCacheSafeParams`,
 *         `saveCacheSafeParams`, `executePromptSuggestion` y
 *         `cleanupComputerUseAfterTurn`. Sólo `getSessionId` y `logDebug`
 *         están. Sin ellos el generador compila y no hace nada: cada llamada
 *         es opcional y devuelve `undefined`, así que un puerto hoy pasaría
 *         sus tests midiendo el vacío — el defecto que la anulación existe
 *         para atrapar.
 *       · `getTotalOutputTokens` NO lo exporta
 *         `@thyrox/app-host/bootstrap/state` (el módulo resuelve; el símbolo
 *         no está). Es el insumo del conteo de tokens del objetivo.
 *       · `isBareMode` falta en `../internalUtils.js`, que sí tiene
 *         `errorMessage` e `isEnvDefinedFalsy`.
 *
 *     Sucesor registrado con esa lista. El porte se hace cuando la superficie
 *     del host exista, no antes: portarlo contra un host que no la declara
 *     produce un puerto verde y hueco.
 */

/**
 * Resuelve el cap de bloqueos consecutivos del Stop hook. Ant v2.1.143
 * 3999.js: `parseInt(env.CLAUDE_CODE_STOP_HOOK_BLOCK_CAP) ?? 8`, y
 * luego `cap > 0 && n > cap`.
 *
 * - ausente / no-numérico → 8 (el respaldo por defecto)
 * - 0 o negativo          → deshabilitado (el guard `cap > 0` de abajo
 *   corta en corto)
 * - N positivo            → N
 */
export function resolveStopHookBlockCap(envValue: string | undefined): number {
  const parsed = Number.parseInt(envValue ?? '', 10)
  return Number.isNaN(parsed) ? 8 : parsed
}

/**
 * Decide qué pasa después de que un Stop hook bloquea al turno de
 * terminar — el guard de bloqueo consecutivo de ant v2.1.143 3999.js.
 */
export type StopHookBlockDecision =
  | { kind: 'continue'; nextTurnCount: number; nextBlockingCount: number }
  | { kind: 'max_turns'; nextTurnCount: number; nextBlockingCount: number }
  | { kind: 'cap_exceeded'; nextBlockingCount: number }

export function evaluateStopHookBlockOutcome(params: {
  turnCount: number
  blockingCount: number
  maxTurns: number | undefined
  blockCapEnv: string | undefined
}): StopHookBlockDecision {
  const nextTurnCount = params.turnCount + 1
  const nextBlockingCount = params.blockingCount + 1

  // maxTurns también acota los loops de bloqueo — sin esto, un Stop
  // hook que bloquea re-consultaría para siempre en modo headless sin
  // importar --max-turns.
  if (params.maxTurns && nextTurnCount > params.maxTurns) {
    return { kind: 'max_turns', nextTurnCount, nextBlockingCount }
  }

  const blockCap = resolveStopHookBlockCap(params.blockCapEnv)
  if (blockCap > 0 && nextBlockingCount > blockCap) {
    return { kind: 'cap_exceeded', nextBlockingCount }
  }

  return { kind: 'continue', nextTurnCount, nextBlockingCount }
}

/**
 * El mensaje de override que el cap emite al dispararse.
 *
 * Es CONTRATO con quien escribe un hook, no prosa: le dice exactamente qué
 * mirar en su entrada (`stop_hook_active`) y qué variable subir para levantar
 * el límite. Por eso su suite pincha la cadena verbatim.
 *
 * Su único consumidor en la fuente es `handleStopHooks`, que aquí sigue sin
 * portar (ver arriba). Se porta igual porque no depende de nada, y porque
 * omitir un símbolo autocontenido «por no tener consumidor» es la forma de
 * porte parcial que se paga después.
 */
export function stopHookBlockCapMessage(blockingCount: number): string {
  return (
    `A hook blocked the turn from ending ${blockingCount} consecutive times — overriding and ending turn. ` +
    "For Stop/SubagentStop hooks, check stop_hook_active in the input and return success while it's true. Set CLAUDE_CODE_STOP_HOOK_BLOCK_CAP to raise this limit."
  )
}
