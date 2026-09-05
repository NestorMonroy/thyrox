/**
 * La conducta del harness ante `thinking_delta` en el stream SSE (T-064).
 *
 * Fuente del porte: el formato del cable medido en el corpus de referencia, no
 * de memoria (ver `sse.ts`). El test fija que los bloques de pensamiento cruzan
 * el stream verbatim, que es lo que la tarea T-064 resolvió.
 */

import { describe, expect, test } from 'bun:test'
import { accumulate } from '../src/provider/sse.ts'
import type { SseEvent } from '../src/provider/sse.ts'

/** Un stream a partir de los events, sin red de por medio. */
async function* stream(...eventos: SseEvent[]): AsyncGenerator<SseEvent> {
  for (const e of eventos) yield e
}

const inicio = { type: 'message_start', message: { id: 'm1', model: 'claude-opus-5', usage: {} } } as SseEvent
const fin = { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 7 } } as SseEvent

async function turno(...eventos: SseEvent[]) {
  const it = accumulate(stream(inicio, ...eventos, fin))
  const deltas: unknown[] = []
  let r = await it.next()
  while (!r.done) { deltas.push(r.value); r = await it.next() }
  return { turno: r.value, deltas }
}

describe('bloques de pensamiento en el stream (T-064)', () => {
  test('el bloque llega entero al turno: el API rechaza el que se modifica', async () => {
    const { turno: t } = await turno(
      { type: 'content_block_start', index: 0, content_block: { type: 'thinking' } } as SseEvent,
      { type: 'content_block_delta', index: 0, delta: { type: 'thinking_delta', thinking: 'mido primero' } } as SseEvent,
      { type: 'content_block_delta', index: 0, delta: { type: 'thinking_delta', thinking: ', luego concluyo' } } as SseEvent,
      { type: 'content_block_delta', index: 0, delta: { type: 'signature_delta', signature: 'firma-abc' } } as SseEvent,
      { type: 'content_block_stop', index: 0 } as SseEvent,
    )
    expect(t.content).toEqual([{ type: 'thinking', thinking: 'mido primero, luego concluyo', signature: 'firma-abc' }])
  })

  test('la firma NO se inventa cuando el servicio no la manda', async () => {
    const { turno: t } = await turno(
      { type: 'content_block_start', index: 0, content_block: { type: 'thinking' } } as SseEvent,
      { type: 'content_block_delta', index: 0, delta: { type: 'thinking_delta', thinking: 'algo' } } as SseEvent,
    )
    expect(t.content[0]).toEqual({ type: 'thinking', thinking: 'algo' })
  })

  test('el pensamiento se emite como su propio delta, no como texto', async () => {
    const { deltas } = await turno(
      { type: 'content_block_start', index: 0, content_block: { type: 'thinking' } } as SseEvent,
      { type: 'content_block_delta', index: 0, delta: { type: 'thinking_delta', thinking: 'x' } } as SseEvent,
    )
    expect(deltas).toEqual([{ type: 'thinking_delta', index: 0, text: 'x' }])
  })

  test('redacted_thinking viaja opaco: su `data` es lo único que hay', async () => {
    const { turno: t } = await turno(
      { type: 'content_block_start', index: 0, content_block: { type: 'redacted_thinking', data: 'op4c0' } } as SseEvent,
      { type: 'content_block_stop', index: 0 } as SseEvent,
    )
    expect(t.content).toEqual([{ type: 'redacted_thinking', data: 'op4c0' }])
  })

  test('pensamiento y texto conviven, en el orden en que el servicio los mandó', async () => {
    const { turno: t } = await turno(
      { type: 'content_block_start', index: 0, content_block: { type: 'thinking' } } as SseEvent,
      { type: 'content_block_delta', index: 0, delta: { type: 'thinking_delta', thinking: 'pienso' } } as SseEvent,
      { type: 'content_block_start', index: 1, content_block: { type: 'text' } } as SseEvent,
      { type: 'content_block_delta', index: 1, delta: { type: 'text_delta', text: 'digo' } } as SseEvent,
    )
    expect(t.content.map((b) => b.type)).toEqual(['thinking', 'text'])
  })

  test('un bloque que sigue sin conocerse ABORTA — el silencio perdería contenido', async () => {
    await expect(turno(
      { type: 'content_block_start', index: 0, content_block: { type: 'inventado_2027' } } as SseEvent,
    )).rejects.toThrow('inventado_2027')
  })

  test('un delta que sigue sin conocerse ABORTA', async () => {
    await expect(turno(
      { type: 'content_block_start', index: 0, content_block: { type: 'thinking' } } as SseEvent,
      { type: 'content_block_delta', index: 0, delta: { type: 'delta_inventado' } } as SseEvent,
    )).rejects.toThrow('delta_inventado')
  })
})

describe('el pensamiento cruza el bucle y llega al renderizador (T-064)', () => {
  test('el bucle reemite el delta con su tipo, no lo aplana a texto', async () => {
    const { streamLoop } = await import('../src/loop.ts')
    const { RecordedProvider } = await import('../src/provider/recorded.ts')
    const uso = { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }
    const proveedor = new RecordedProvider([
      { id: 'm1', model: 'claude-opus-5', stop_reason: 'end_turn', usage: uso,
        content: [{ type: 'thinking', thinking: 'lo pienso' }, { type: 'text', text: 'lo digo' }] },
    ])
    const { mkdtempSync } = await import('node:fs')
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const d = mkdtempSync(join(tmpdir(), 'think-'))
    const tipos: string[] = []
    for await (const e of streamLoop({
      cwd: d, transcriptDir: d, model: 'claude-opus-5', system: 'eres un harness', tools: [],
      prompt: 'hola', stream: true, provider: proveedor,
    })) tipos.push(e.type)
    expect(tipos).toContain('thinking_delta')
  })

  test('el renderizador no lo mezcla con la respuesta', async () => {
    const { renderEvent } = await import('../src/cli/render.ts')
    const linea = renderEvent({ type: 'thinking_delta', turn: 1, text: 'pensando' } as never, 'text')
    expect(linea).toBeNull()
  })
})
