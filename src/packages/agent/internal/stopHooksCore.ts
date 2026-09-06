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
 *   - `handleStopHooks` — el generador async de integración completo:
 *     ejecuta los Stop hooks de verdad contra `getAgentHostBindings()`,
 *     `@claude-code-how-works/memory` (`executeExtractMemories`,
 *     `isExtractModeActive`), `../hooks/sessionHooks.js`
 *     (`addSessionHook`/`getSessionHooks`/`removeSessionHook`, no
 *     portado en este árbol), `@claude-code-how-works/app-host
 *     /bootstrap/state.js` (`getTotalOutputTokens`),
 *     `@claude-code-how-works/local-observability` (`obsLogEvent`,
 *     `logForDebugging`) y `@claude-code-how-works/config/env`
 *     (`readEnv`) — ninguno de esos paquetes vive en este árbol
 *     (monorepo de 32 paquetes, fuera de alcance), y el test de origen
 *     no lo ejercita: sólo importa las dos funciones puras de
 *     aritmética/parseo de arriba.
 *   - `stopHookBlockCapMessage` — el mensaje de override verbatim que
 *     `handleStopHooks` emite al disparar el cap. Es autocontenido
 *     (sin dependencias) pero ningún test lo ejercita, así que se
 *     omite junto con su único consumidor.
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
