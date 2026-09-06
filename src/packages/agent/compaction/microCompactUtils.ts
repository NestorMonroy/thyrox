/**
 * Porte de `ccnmt: packages/agent/compaction/microCompactUtils.ts`.
 *
 * Recolecta, en orden, los ids de los bloques `tool_use` de mensajes de
 * assistant cuyo `name` esta en el allowlist dado. Es el insumo del
 * microcompact: solo esos ids son candidatos a que su tool_result se
 * recorte/edite en la ventana de contexto.
 */

/**
 * Devuelve los ids de bloque `tool_use` (dentro de mensajes `assistant`)
 * cuyo `name` pertenece a `toolNames`. Ignora mensajes de otro `type` y
 * bloques que no sean `tool_use` con `name` de tipo `string`.
 */
export function collectCompactableToolIds(
  messages: Array<{ type: string; message?: { content?: unknown } }>,
  toolNames: Set<string>,
): string[] {
  const ids: string[] = []
  for (const message of messages) {
    if (message.type === 'assistant' && Array.isArray(message.message?.content)) {
      for (const block of message.message.content as Array<Record<string, unknown>>) {
        if (
          block.type === 'tool_use' &&
          typeof block.name === 'string' &&
          toolNames.has(block.name)
        ) {
          ids.push(block.id as string)
        }
      }
    }
  }
  return ids
}
