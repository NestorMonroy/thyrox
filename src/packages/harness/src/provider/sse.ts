/**
 * Lectura de un stream SSE del API de mensajes (T-011).
 *
 * Vive aparte de `anthropicHttp.ts` porque son dos responsabilidades con
 * pruebas distintas: aqui esta el **formato del cable** -- que no depende de
 * la credencial ni del transporte-- y alli el adaptador que lo consume.
 *
 * La forma de los events se midio en el corpus de referencia, no de memoria:
 * `ccb: packages/provider/src/codex/fetchAdapter.ts:343-455` los emite y
 * `ccb: packages/provider/src/gemini/indexImpl.ts:126-200` los acumula. De
 * ahi salen las tres decisiones que no son obvias:
 *
 * - **El buffer guarda la cola incompleta.** Un event parte entre dos trozos
 *   del socket con total normalidad; descartar el residuo pierde el event
 *   entero y el JSON de la mitad siguiente no parsea.
 * - **La line `event:` se ignora.** El tipo real viaja dentro del `data:`,
 *   asi que leer la cabecera seria una segunda fuente de verdad.
 * - **El `usage` llega partido en dos events.** `message_start` trae entrada
 *   y cache; `message_delta` trae la salida. Tomar solo uno deja la otra
 *   mitad en cero, y un cero se lee como "no costo nada".
 */
import type { AssistantTurn, ContentBlock, StopReason, Usage } from '../types.ts'

/** Un event del stream, tal como el servicio lo declara en su `data:`. */
export type SseEvent = { type: string } & Record<string, unknown>

/**
 * Los events de una respuesta SSE, en orden.
 *
 * Rehusa con un error nombrado si la respuesta no trae cuerpo: un generador
 * vacio se leeria como "el modelo no dijo nada", que es lo contrario de
 * "no pude leer".
 */
export async function* parseSseEvents(res: Response): AsyncGenerator<SseEvent> {
  if (!res.body) throw new Error('El stream llego sin cuerpo: no hay events que leer')
  const decoder = new TextDecoder()
  let buffer = ''
  for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
    buffer += decoder.decode(chunk, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''   // la cola incompleta espera al siguiente chunk
    for (const event of readLines(lines)) yield event
  }
  buffer += decoder.decode()
  for (const event of readLines(buffer.split('\n'))) yield event
}

function* readLines(lines: string[]): Generator<SseEvent> {
  for (const line of lines) {
    const clean = line.trim()
    if (!clean || clean.startsWith('event: ') || clean.startsWith(':')) continue
    if (!clean.startsWith('data: ')) continue
    const data = clean.slice(6)
    if (data === '[DONE]') continue
    yield JSON.parse(data) as SseEvent
  }
}

/** Lo que `stream()` entrega mientras el turno se arma. */
export type TextDelta =
  | { type: 'text_delta'; index: number; text: string }
  | { type: 'thinking_delta'; index: number; text: string }

type PartialBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; json: string }
  /**
   * El pensamiento se acumula igual que el texto, pero su firma llega por un
   * delta aparte (`signature_delta`) y NO se sintetiza: un bloque con firma
   * inventada es un bloque modificado, y el servicio responde 400.
   */
  | { type: 'thinking'; thinking: string; signature?: string }
  | { type: 'redacted_thinking'; data: string }

/**
 * Acumula los events hasta el turno completo, emitiendo el texto conforme
 * llega. El `return` del generador es el `AssistantTurn` -- el mismo objeto
 * que devuelve la ruta JSON, para que el bucle no distinga una de otra.
 */
export async function* accumulate(
  events: AsyncIterable<SseEvent>,
): AsyncGenerator<TextDelta, AssistantTurn> {
  const blocks = new Map<number, PartialBlock>()
  let id = ''
  let model = ''
  let stopReason: StopReason | undefined
  const usage: Usage = {
    input_tokens: 0, output_tokens: 0,
    cache_creation_input_tokens: 0, cache_read_input_tokens: 0,
  }

  for await (const event of events) {
    switch (event.type) {
      case 'message_start': {
        const m = (event.message ?? {}) as { id?: string; model?: string; usage?: Partial<Usage> }
        id = m.id ?? ''
        model = m.model ?? ''
        // entrada y cache; la salida todavia no existe
        usage.input_tokens = m.usage?.input_tokens ?? 0
        usage.cache_creation_input_tokens = m.usage?.cache_creation_input_tokens ?? 0
        usage.cache_read_input_tokens = m.usage?.cache_read_input_tokens ?? 0
        break
      }
      case 'content_block_start': {
        const i = event.index as number
        const b = event.content_block as { type: string; id?: string; name?: string }
        if (b.type === 'text') blocks.set(i, { type: 'text', text: '' })
        else if (b.type === 'tool_use') blocks.set(i, { type: 'tool_use', id: b.id ?? '', name: b.name ?? '', json: '' })
        else if (b.type === 'thinking') blocks.set(i, { type: 'thinking', thinking: '' })
        else if (b.type === 'redacted_thinking') blocks.set(i, { type: 'redacted_thinking', data: (b as { data?: string }).data ?? '' })
        else throw new Error(`Bloque de contenido no soportado en el stream: ${b.type}`)
        break
      }
      case 'content_block_delta': {
        const i = event.index as number
        const block = blocks.get(i)
        if (!block) break
        const delta = event.delta as { type: string; text?: string; partial_json?: string; thinking?: string; signature?: string }
        if (delta.type === 'text_delta' && block.type === 'text') {
          block.text += delta.text ?? ''
          yield { type: 'text_delta', index: i, text: delta.text ?? '' }
        } else if (delta.type === 'thinking_delta' && block.type === 'thinking') {
          block.thinking += delta.thinking ?? ''
          // Se emite como su propio evento, no como texto: quien lo renderiza
          // decide si lo muestra, y confundirlo con la respuesta la ensucia.
          yield { type: 'thinking_delta', index: i, text: delta.thinking ?? '' }
        } else if (delta.type === 'signature_delta' && block.type === 'thinking') {
          block.signature = (block.signature ?? '') + (delta.signature ?? '')
        } else if (delta.type === 'input_json_delta' && block.type === 'tool_use') {
          block.json += delta.partial_json ?? ''
        } else {
          // Un delta que no se sabe acumular se pierde en silencio si se
          // ignora, y el turno saldria completo con contenido faltante.
          throw new Error(`Delta no soportado en el stream: ${delta.type}`)
        }
        break
      }
      case 'message_delta': {
        const d = (event.delta ?? {}) as { stop_reason?: StopReason }
        if (d.stop_reason) stopReason = d.stop_reason
        usage.output_tokens = ((event.usage ?? {}) as Partial<Usage>).output_tokens ?? usage.output_tokens
        break
      }
      case 'error': {
        const e = (event.error ?? {}) as { type?: string; message?: string }
        throw new Error(`El servicio corto el stream: ${e.type ?? 'error'} — ${e.message ?? ''}`)
      }
      default:
        break   // ping, content_block_stop, message_stop: sin estado que guardar
    }
  }

  if (!stopReason) {
    throw new Error('Stream incompleto: termino sin message_delta, no hay stop_reason que declarar')
  }
  return { id, model, content: closeBlocks(blocks), stop_reason: stopReason, usage }
}

/** Los blocks en el orden de su indice, con el JSON de herramienta ya parseado. */
function closeBlocks(blocks: Map<number, PartialBlock>): ContentBlock[] {
  return [...blocks.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, block]) => {
      if (block.type === 'text') return { type: 'text', text: block.text } as ContentBlock
      // La firma sólo va si el servicio la mandó: una clave `signature`
      // presente con valor vacío ya es una modificación del bloque.
      if (block.type === 'thinking') {
        return (block.signature === undefined
          ? { type: 'thinking', thinking: block.thinking }
          : { type: 'thinking', thinking: block.thinking, signature: block.signature }) as ContentBlock
      }
      if (block.type === 'redacted_thinking') return { type: 'redacted_thinking', data: block.data } as ContentBlock
      let input: Record<string, unknown> = {}
      if (block.json.trim()) {
        try {
          input = JSON.parse(block.json) as Record<string, unknown>
        } catch (e) {
          throw new Error(
            `El input de la herramienta ${block.id} no es JSON valido tras juntar sus deltas: ` +
              `${(e as Error).message} — recibido ${JSON.stringify(block.json)}`,
          )
        }
      }
      return { type: 'tool_use', id: block.id, name: block.name, input } as ContentBlock
    })
}
