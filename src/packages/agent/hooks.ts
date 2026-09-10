/**
 * Mensajes de feedback de hooks — porte PARCIAL de
 * `ccnmt: packages/agent/hooks.ts` (5427 líneas en la fuente).
 *
 * Recorte declarado: la fuente completa es el motor de ejecución de hooks
 * entero — matching de matchers, ejecución de comandos/callbacks/prompt
 * hooks, agregación de resultados, SessionStart/Setup, etc. — e importa una
 * decena de paquetes `@claude-code-how-works/*` y módulos internos
 * (`./hooks/index.js`, `./internal/runtimeBridges.js`, `./host.js`, …)
 * ausentes en este árbol. NO se porta ese motor.
 *
 * Se portan sólo los SEIS formateadores de mensaje de
 * `ccnmt: packages/agent/hooks.ts:2149-2210`, porque son los únicos
 * símbolos que ejercita el test que este archivo porta
 * (`__tests__/hookMessages.behavior.test.ts`). Los seis son
 * AUTOCONTENIDOS: cada uno es un template string de una línea sobre su
 * parámetro `blockingError: HookBlockingError`, sin ningún import externo.
 * Se portan completos y con fidelidad byte a byte del formato — el prefijo
 * exacto (`"<hookName> hook error: "`, `"Stop hook feedback:\n"`, …) es el
 * contrato que el modelo usa para distinguir un bloqueo de hook de un
 * resultado de herramienta normal.
 *
 * `HookBlockingError` se re-declara aquí en forma reducida: la fuente
 * (`hooks.ts:373-375`) exige `{ blockingError: string; command: string }`.
 * Los seis formateadores portados sólo leen `.blockingError`, y el test que
 * los ejercita construye el objeto sin `command` — se declara `command`
 * opcional para no imponer un campo que ningún caso ejercita.
 */

export interface HookBlockingError {
  blockingError: string
  command?: string
}

/**
 * Formatea el mensaje de bloqueo de un hook PreToolUse.
 * @param hookName Nombre del hook (p.ej. 'PreToolUse:Write', 'PreToolUse:Bash')
 * @param blockingError El error de bloqueo del hook
 * @returns El mensaje de bloqueo formateado
 */
export function getPreToolHookBlockingMessage(
  hookName: string,
  blockingError: HookBlockingError,
): string {
  return `${hookName} hook error: ${blockingError.blockingError}`
}

/**
 * Formatea el mensaje de un hook Stop.
 * @param blockingError El error de bloqueo del hook
 * @returns El mensaje formateado como feedback para el modelo
 */
export function getStopHookMessage(blockingError: HookBlockingError): string {
  return `Stop hook feedback:\n${blockingError.blockingError}`
}

/**
 * Formatea el error de bloqueo de un hook TeammateIdle.
 * @param blockingError El error de bloqueo del hook
 * @returns El mensaje formateado como feedback para el modelo
 */
export function getTeammateIdleHookMessage(
  blockingError: HookBlockingError,
): string {
  return `TeammateIdle hook feedback:\n${blockingError.blockingError}`
}

/**
 * Formatea el error de bloqueo de un hook TaskCreated.
 * @param blockingError El error de bloqueo del hook
 * @returns El mensaje formateado como feedback para el modelo
 */
export function getTaskCreatedHookMessage(
  blockingError: HookBlockingError,
): string {
  return `TaskCreated hook feedback:\n${blockingError.blockingError}`
}

/**
 * Formatea el error de bloqueo de un hook TaskCompleted.
 * @param blockingError El error de bloqueo del hook
 * @returns El mensaje formateado como feedback para el modelo
 */
export function getTaskCompletedHookMessage(
  blockingError: HookBlockingError,
): string {
  return `TaskCompleted hook feedback:\n${blockingError.blockingError}`
}

/**
 * Formatea el mensaje de bloqueo de un hook UserPromptSubmit.
 * @param blockingError El error de bloqueo del hook
 * @returns El mensaje de bloqueo formateado
 */
export function getUserPromptSubmitHookBlockingMessage(
  blockingError: HookBlockingError,
): string {
  return `UserPromptSubmit operation blocked by hook:\n${blockingError.blockingError}`
}
