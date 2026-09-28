/**
 * Empareja cada `functionResponse` de Gemini con el `functionCall` al que
 * responde. Gemini sólo lleva `id` en cualquiera de las dos partes si el
 * cliente lo puso, así que un historial de herramientas llega casi siempre
 * sin ids: una llamada sin id recibe uno generado, y una respuesta sin id
 * toma la llamada abierta más antigua de la misma función —una función puede
 * llamarse varias veces—.
 *
 * El emparejamiento vale dentro de una ronda de llamadas: en cuanto entra un
 * contenido que no es del modelo (la respuesta del usuario, los resultados),
 * el siguiente que hace llamadas abre ronda nueva, para que una llamada sin
 * responder no se lleve el resultado de otra posterior. Los contenidos de
 * pensamiento o texto del propio modelo entre dos llamadas no cierran la ronda.
 *
 * Porte de `omniroute: open-sse/translator/helpers/geminiToolCallIds.ts` (MIT).
 */
interface OpenCall {
  id: string
  generated: boolean
}

export interface GeminiToolCallIdPairing {
  /** Se llama una vez por `content`, antes de sus partes. */
  beginContent(content: { role?: unknown; parts?: unknown }): void
  /** El id de una parte `functionCall`: el suyo, o uno generado. */
  callId(call: { id?: unknown; name?: unknown }): string
  /** El `tool_call_id` de una parte `functionResponse`. */
  responseId(response: { id?: unknown; name?: unknown }): string
}

export function createGeminiToolCallIdPairing(newId: () => string): GeminiToolCallIdPairing {
  const openCalls = new Map<string, OpenCall[]>()
  let roundEnded = false
  const nameOf = (value: { name?: unknown }) => (typeof value.name === 'string' ? value.name : '')

  return {
    beginContent(content) {
      const madeCalls =
        Array.isArray(content?.parts) && content.parts.some(part => Boolean((part as { functionCall?: unknown })?.functionCall))
      if (madeCalls && roundEnded) openCalls.clear()
      if (madeCalls) roundEnded = false
      else if (content?.role !== 'model') roundEnded = true
    },

    callId(call) {
      const generated = !(typeof call.id === 'string' && call.id)
      const id = generated ? newId() : (call.id as string)
      const open = openCalls.get(nameOf(call)) ?? []
      open.push({ id, generated })
      openCalls.set(nameOf(call), open)
      return id
    },

    responseId(response) {
      const name = nameOf(response)
      const open = openCalls.get(name) ?? []
      if (typeof response.id === 'string' && response.id) {
        const index = open.findIndex(call => call.id === response.id)
        if (index !== -1) open.splice(index, 1)
        return response.id
      }
      // Un id que eligió el cliente lo responde una respuesta con ese id, así
      // que una sin id toma la llamada más antigua cuyo id se generó aquí.
      const index = open.findIndex(call => call.generated)
      if (index === -1) return open.shift()?.id ?? name
      return open.splice(index, 1)[0]!.id
    },
  }
}
