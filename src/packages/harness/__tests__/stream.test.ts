/**
 * El bucle emitiendo su stream de eventos hacia el consumidor (T-006).
 *
 * Fuente: diseño nativo. `streamLoop` es el primario; este archivo fija la
 * secuencia de eventos que emite —bloques, herramientas, cierre— para que la
 * CLI y el diario la consuman sin una segunda lógica.
 */

import { describe, expect, test } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { streamLoop } from '../src/loop.ts'
import { RecordedProvider } from '../src/provider/recorded.ts'
import { CORE_TOOLS } from '../src/tools/registry.ts'
import type { AssistantTurn, HarnessEvent } from '../src/types.ts'

// La referencia expone el bucle como generador de eventos
// (`for await (const event of loop.run(...))`, ccb: AgentLoop.test.ts). Sin
// eso una CLI no puede pintar nada hasta el final, que es exactamente el
// problema que tiene un bucle que solo devuelve al terminar.
const dir = () => mkdtempSync(join(tmpdir(), 'stream-'))
const uso = { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }
const texto = (t: string): AssistantTurn => ({ id: `m${Math.random()}`, model: 'claude-opus-5', stop_reason: 'end_turn', content: [{ type: 'text', text: t }], usage: uso })
const usa = (name: string, input: Record<string, unknown>): AssistantTurn => ({ id: `m${Math.random()}`, model: 'claude-opus-5', stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 'tu1', name, input }], usage: uso })
const base = (d: string) => ({ cwd: d, model: 'claude-opus-5', system: 's', tools: CORE_TOOLS, transcriptDir: d })

async function recoger(gen: AsyncGenerator<HarnessEvent>): Promise<HarnessEvent[]> {
  const out: HarnessEvent[] = []
  for await (const e of gen) out.push(e)
  return out
}

describe('streamLoop — el bucle como eventos (T-037)', () => {
  test('un turno sin herramientas emite turn_start, text y done', async () => {
    const eventos = await recoger(streamLoop({ ...base(dir()), prompt: 'hola', provider: new RecordedProvider([texto('listo')]) }))
    // `context_level` va en la secuencia porque se mide UNA vez por turno,
    // antes de decidir nada: es el insumo de la parada dura y de las dos
    // compactaciones. Un consumidor que no lo vea no puede pintar la presión.
    expect(eventos.map((e) => e.type)).toEqual(['session_start', 'turn_start', 'context_level', 'text', 'done'])
    const fin = eventos.at(-1)!
    expect(fin.type === 'done' && fin.result.stop).toBe('end_turn')
  })

  test('una llamada a herramienta emite su inicio y su fin, en ese orden', async () => {
    const p = new RecordedProvider([usa('Bash', { command: 'echo x' }), texto('ya')])
    const eventos = await recoger(streamLoop({ ...base(dir()), prompt: 'x', provider: p }))
    const tipos = eventos.map((e) => e.type)
    expect(tipos).toEqual(['session_start', 'turn_start', 'context_level', 'tool_start', 'tool_end',
      'turn_start', 'context_level', 'text', 'done'])
    const inicio = eventos.find((e) => e.type === 'tool_start')!
    const fin = eventos.find((e) => e.type === 'tool_end')!
    expect(inicio.type === 'tool_start' && inicio.tool).toBe('Bash')
    expect(fin.type === 'tool_end' && fin.isError).toBe(false)
    expect(fin.type === 'tool_end' && fin.output.trim()).toBe('x')
  })

  test('el consumidor ve el evento ANTES de que termine el bucle', async () => {
    const p = new RecordedProvider([usa('Bash', { command: 'sleep 0.2; echo tarde' }), texto('fin')])
    const gen = streamLoop({ ...base(dir()), prompt: 'x', provider: p })
    const primero = await gen.next()
    // el bucle sigue vivo: aun no hay resultado. `done` es el discriminante de
    // IteratorResult, asi que comprobarlo primero es lo que deja leer `.value`.
    if (primero.done) throw new Error('el generador termino en el primer next(): no emitio ningun evento')
    expect(primero.value.type).toBe('session_start')
    await recoger(gen as AsyncGenerator<HarnessEvent>)
  })

  test('una herramienta que falla emite tool_end con isError, no una excepcion', async () => {
    const p = new RecordedProvider([usa('Bash', { command: 'exit 7' }), texto('visto')])
    const eventos = await recoger(streamLoop({ ...base(dir()), prompt: 'x', provider: p }))
    const fin = eventos.find((e) => e.type === 'tool_end')!
    expect(fin.type === 'tool_end' && fin.isError).toBe(true)
  })

  test('cada evento lleva el numero de turno para poder ordenarlo', async () => {
    const p = new RecordedProvider([usa('Bash', { command: 'true' }), texto('fin')])
    const eventos = await recoger(streamLoop({ ...base(dir()), prompt: 'x', provider: p }))
    expect(eventos.filter((e) => e.type === 'turn_start').map((e) => e.turn)).toEqual([1, 2])
  })

  test('runLoop sigue existiendo y da el mismo resultado que el ultimo evento', async () => {
    const { runLoop } = await import('../src/loop.ts')
    const d = dir()
    const r = await runLoop({ ...base(d), prompt: 'x', provider: new RecordedProvider([texto('igual')]) })
    expect(r.lastText).toBe('igual')
    expect(r.stop).toBe('end_turn')
  })
})
