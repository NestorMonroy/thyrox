/**
 * Cancelación de un turno interrumpido — porte de
 * `ccnmt: packages/agent/internal/abort.ts`.
 *
 * Una interrupción a media respuesta puede dejar un mensaje de assistant con
 * bloques `tool_use` que nunca reciben su `tool_result` — la API rechaza un
 * transcript en esa forma. `createSyntheticToolResults` fabrica ese
 * `tool_result` sintético, marcado como error, para los `tool_use`
 * pendientes del ÚLTIMO mensaje de assistant (el recorrido va hacia atrás y
 * se detiene en el primer assistant que encuentra: sólo el turno más
 * reciente puede tener herramientas sin resolver).
 */
import type { CoreContentBlock, CoreMessage } from '../coreMessages.ts'

export function createSyntheticToolResults(
  messages: CoreMessage[],
  abortReason: string = 'interrupted',
): CoreContentBlock[] {
  const results: CoreContentBlock[] = []

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg.type === 'assistant' && Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (
          typeof block === 'object' &&
          block !== null &&
          'type' in block &&
          block.type === 'tool_use' &&
          'id' in block
        ) {
          results.push({
            type: 'tool_result',
            tool_use_id: block.id as string,
            content: `[${abortReason}] Tool execution was interrupted`,
            is_error: true,
          })
        }
      }
      break
    }
  }

  return results
}

/** Wrapper trivial sobre `AbortSignal.aborted` — sin signal, nunca aborta. */
export function shouldAbort(signal?: AbortSignal): boolean {
  return signal?.aborted ?? false
}
