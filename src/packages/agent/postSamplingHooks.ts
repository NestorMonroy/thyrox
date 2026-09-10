/**
 * Porte COMPLETO de `ccnmt: packages/agent/postSamplingHooks.ts` — registro
 * y ejecución de hooks post-muestreo (post-sampling).
 *
 * Los cinco símbolos exportados se portan todos: `REPLHookContext`,
 * `PostSamplingHook`, `registerPostSamplingHook`, `clearPostSamplingHooks`,
 * `executePostSamplingHooks`. El contrato central: cada hook se ejecuta
 * dentro de un `try/catch` propio — un hook que lanza (síncrona o
 * asíncronamente) se registra pero NUNCA detiene a los siguientes ni hace
 * que `executePostSamplingHooks` rechace. Son hooks de asesoría, no de
 * bloqueo.
 *
 * DIVERGENCIAS DE ALCANCE, declaradas por tipo/dependencia — ninguna
 * cambia el comportamiento observable, solo la forma del tipo que las
 * declara:
 *
 * - `SystemPrompt`: la fuente la trae de
 *   `@claude-code-how-works/provider/systemPromptType.js`. Este árbol ya
 *   tiene el mismo tipo portado byte-idéntico en `./internalUtils.js`
 *   (mismo `readonly string[] & {__brand:'SystemPrompt'}`); se reusa desde
 *   ahí en vez de declarar una segunda copia.
 * - `QuerySource`: la fuente misma es un stub (`type QuerySource = unknown`,
 *   ver `./querySource.ts`, portado tal cual).
 * - `ToolUseContext`: la fuente la trae de
 *   `@claude-code-how-works/tool-registry/Tool.js:158`, un tipo grande y
 *   dependiente de todo el paquete `tool-registry` (Command, Tools,
 *   MCPServerConnection, AgentDefinitionsResult, ...), inexistente en este
 *   árbol. Este módulo no inspecciona ningún campo de `ToolUseContext` —
 *   solo lo recibe y lo reenvía sin abrir dentro del `REPLHookContext` — así
 *   que se declara aquí la forma estructural mínima (`Record<string,
 *   unknown>`) que basta para ese uso opaco. Se sustituye por el tipo real
 *   cuando el paquete `tool-registry` entre al árbol.
 * - `toError`/`logError`: la fuente los trae de
 *   `@claude-code-how-works/local-observability/{errorHelpers,logging}`,
 *   paquete ausente en este árbol. Se declaran versiones locales mínimas
 *   con el mismo comportamiento observable (normalizar a Error y no
 *   relanzar) — el propio test no hace ninguna aserción sobre el mecanismo
 *   de log, solo sobre que el error NO se propague.
 */

import type { QuerySource } from './querySource.js'
import type { SystemPrompt } from './internalUtils.js'
import type { Message } from './messageShapes.js'

/** DIVERGENCIA DE ALCANCE: forma estructural mínima de `tool-registry/Tool.ts:158 ToolUseContext`, ver docstring del módulo. */
export type ToolUseContext = Record<string, unknown>

/** Normaliza un valor de tipo error desconocido a un `Error` real. */
function toError(e: unknown): Error {
  return e instanceof Error ? e : new Error(String(e))
}

/**
 * Registra un error de hook sin relanzar — la fuente usa `logError` de
 * local-observability, que encola en un ring-buffer en memoria y NO
 * imprime a stderr salvo que un sink real esté conectado
 * (`ccnmt: packages/local-observability/src/logging/error-log.ts:125`).
 * Este puerto local reproduce esa propiedad observable — silencioso salvo
 * que se conecte un sink — sin arrastrar el resto del paquete
 * local-observability (sessionId, privacy flags de config/env, etc.).
 */
const loggedErrors: Error[] = []
function logError(e: Error): void {
  loggedErrors.push(e)
}

// Hook post-muestreo — no expuesto aún en settings.json, solo se usa programáticamente

// Contexto genérico para hooks de REPL (tanto post-muestreo como stop hooks)
export type REPLHookContext = {
  messages: Message[] // Historial completo de mensajes, incluidas las respuestas del asistente
  systemPrompt: SystemPrompt
  userContext: { [k: string]: string }
  systemContext: { [k: string]: string }
  toolUseContext: ToolUseContext
  querySource?: QuerySource
}

export type PostSamplingHook = (
  context: REPLHookContext,
) => Promise<void> | void

// Registro interno de hooks post-muestreo
const postSamplingHooks: PostSamplingHook[] = []

/**
 * Registra un hook post-muestreo que se llamará al terminar el muestreo del
 * modelo. Es una API interna, no expuesta a través de settings.
 */
export function registerPostSamplingHook(hook: PostSamplingHook): void {
  postSamplingHooks.push(hook)
}

/**
 * Elimina todos los hooks post-muestreo registrados (para testing).
 */
export function clearPostSamplingHooks(): void {
  postSamplingHooks.length = 0
}

/**
 * Ejecuta todos los hooks post-muestreo registrados.
 */
export async function executePostSamplingHooks(
  messages: Message[],
  systemPrompt: SystemPrompt,
  userContext: { [k: string]: string },
  systemContext: { [k: string]: string },
  toolUseContext: ToolUseContext,
  querySource?: QuerySource,
): Promise<void> {
  const context: REPLHookContext = {
    messages,
    systemPrompt,
    userContext,
    systemContext,
    toolUseContext,
    querySource,
  }

  for (const hook of postSamplingHooks) {
    try {
      await hook(context)
    } catch (error) {
      // Se registra pero no se falla por errores de hook
      logError(toError(error))
    }
  }
}
