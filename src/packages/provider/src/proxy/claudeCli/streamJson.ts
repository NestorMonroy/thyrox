/**
 * Las líneas de `claude -p --output-format stream-json`, leídas una a una.
 *
 * Las formas salen del ejecutable de referencia: `system/init` y `result`
 * (ya portadas en `@thyrox/cli: entry/print.ts`), `assistant` y `user` (el
 * mensaje del API tal cual, con `parent_tool_use_id` y `session_id`) y
 * `stream_event` (cada evento crudo del API cuando se pide
 * `--include-partial-messages`, `chunk-csayct82.js`).
 *
 * Una línea que no es JSON o no declara `type` no se descarta en silencio:
 * vuelve como `malformed` para que quien lee decida qué hacer con ella.
 */

export type AssistantMessage = {
  id?: string
  role?: string
  model?: string
  content?: unknown
  stop_reason?: string | null
  usage?: Record<string, unknown>
}

export type StreamJsonEvent =
  | { type: 'system'; subtype?: string; session_id?: string }
  | { type: 'assistant'; message?: AssistantMessage; session_id?: string }
  | { type: 'user'; message?: unknown; session_id?: string }
  | { type: 'result'; subtype?: string; is_error?: boolean; result?: string; errors?: unknown[]; usage?: Record<string, unknown>; session_id?: string }
  | { type: 'stream_event'; event?: Record<string, unknown> }
  | { type: string }

export type ParsedStreamJsonLine =
  | { kind: 'event'; event: StreamJsonEvent }
  | { kind: 'blank' }
  | { kind: 'malformed'; line: string }

function declaresType(value: unknown): value is StreamJsonEvent {
  return typeof value === 'object' && value !== null && typeof (value as { type?: unknown }).type === 'string'
}

/** Una línea de la salida como evento, blanco o línea malformada. */
export function parseStreamJsonLine(line: string): ParsedStreamJsonLine {
  if (line.trim() === '') return { kind: 'blank' }
  let parsed: unknown
  try {
    parsed = JSON.parse(line)
  } catch {
    return { kind: 'malformed', line }
  }
  if (!declaresType(parsed)) return { kind: 'malformed', line }
  return { kind: 'event', event: parsed }
}
