/**
 * El bucle como flujo de eventos (T-006).
 *
 * Fuente: diseño nativo. `streamLoop` es el primario y `runLoop` su envoltura;
 * este archivo fija que ambos ven los mismos estados, para que la CLI, el
 * diario y cualquier consumidor no dependan de una segunda lógica.
 */

import { describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runLoop, streamLoop } from '../src/loop.ts'
import { RecordedProvider } from '../src/provider/recorded.ts'
import { CORE_TOOLS } from '../src/tools/registry.ts'
import type { AssistantTurn, Provider, ProviderRequest } from '../src/types.ts'

// El streaming del proveedor (T-011) sólo vale si algo lo consume: una
// capacidad que nadie invoca es deuda, no capacidad -- el defecto que
// `flow-selection-agile.md` describe. Aquí se mide que el bucle la use y que
// el turno resultante sea IDÉNTICO al de la vía JSON.

const dir = () => mkdtempSync(join(tmpdir(), 'loopstream-'))
const uso = { input_tokens: 10, output_tokens: 5, cache_creation_input_tokens: 0, cache_read_input_tokens: 100 }
const texto = (t: string): AssistantTurn => ({ id: 'm_s', model: 'claude-opus-5', stop_reason: 'end_turn', content: [{ type: 'text', text: t }], usage: uso })
const base = (d: string) => ({ cwd: d, model: 'claude-opus-5', system: 'eres un harness', tools: CORE_TOOLS, transcriptDir: d })

/** Un proveedor SIN `stream()`: el bucle tiene que seguir funcionando con él. */
class SoloSend implements Provider {
  readonly name = 'solo-send'
  constructor(private turnos: AssistantTurn[]) {}
  private i = 0
  async send(_r: ProviderRequest): Promise<AssistantTurn> {
    const t = this.turnos[this.i]; this.i += 1
    if (!t) throw new Error('sin turno')
    return t
  }
}

describe('el bucle consume el streaming del proveedor', () => {
  test('con stream, emite text_delta ANTES del text del mismo turno', async () => {
    const d = dir()
    const eventos: Array<{ type: string; text?: string }> = []
    for await (const e of streamLoop({ ...base(d), prompt: 'hola', stream: true,
      provider: new RecordedProvider([texto('uno dos tres')]) })) {
      if (e.type === 'text_delta' || e.type === 'text') eventos.push({ type: e.type, text: (e as any).text })
    }
    const tipos = eventos.map((e) => e.type)
    expect(tipos.filter((t) => t === 'text_delta').length).toBeGreaterThan(1)
    expect(tipos.indexOf('text_delta')).toBeLessThan(tipos.indexOf('text'))
  })

  test('los deltas concatenados son exactamente el texto final', async () => {
    const d = dir()
    let deltas = ''
    let final = ''
    for await (const e of streamLoop({ ...base(d), prompt: 'hola', stream: true,
      provider: new RecordedProvider([texto('uno dos tres')]) })) {
      if (e.type === 'text_delta') deltas += (e as any).text
      if (e.type === 'text') final = (e as any).text
    }
    expect(deltas).toBe('uno dos tres')
    expect(final).toBe('uno dos tres')
  })

  test('sin stream NO hay ningún text_delta', async () => {
    const d = dir()
    const tipos: string[] = []
    for await (const e of streamLoop({ ...base(d), prompt: 'hola',
      provider: new RecordedProvider([texto('uno dos tres')]) })) tipos.push(e.type)
    expect(tipos).not.toContain('text_delta')
    expect(tipos).toContain('text')
  })

  test('la bandera viaja al proveedor sólo cuando se pide', async () => {
    const d = dir()
    const p1 = new RecordedProvider([texto('a')])
    await runLoop({ ...base(d), prompt: 'x', provider: p1, stream: true })
    expect(p1.requests[0]?.stream).toBe(true)
    const p2 = new RecordedProvider([texto('a')])
    await runLoop({ ...base(dir()), prompt: 'x', provider: p2 })
    expect(p2.requests[0]?.stream).toBeUndefined()
  })

  // El control de degradación: un proveedor sin `stream()` es legítimo, y
  // pedirle streaming no puede romper el bucle -- cae a `send()`.
  test('un proveedor sin stream() no rompe: el bucle cae a send()', async () => {
    const d = dir()
    const r = await runLoop({ ...base(d), prompt: 'x', stream: true, provider: new SoloSend([texto('sin streaming')]) })
    expect(r.lastText).toBe('sin streaming')
    expect(r.stop).toBe('end_turn')
  })

  // El turno es el mismo objeto por las dos vías: si el streaming cambiara el
  // usage o el transcript, la telemetría diría cosas distintas según la vía.
  test('el transcript y el usage salen iguales con streaming que sin él', async () => {
    const conStream = await runLoop({ ...base(dir()), prompt: 'x', stream: true, provider: new RecordedProvider([texto('igual')]) })
    const sinStream = await runLoop({ ...base(dir()), prompt: 'x', provider: new RecordedProvider([texto('igual')]) })
    expect(conStream.usage).toEqual(sinStream.usage)
    expect(conStream.lastText).toBe(sinStream.lastText)
    const lineas = (p: string) => readFileSync(p, 'utf8').trim().split('\n').map((l) => JSON.parse(l).type)
    expect(lineas(conStream.transcriptPath)).toEqual(lineas(sinStream.transcriptPath))
  })
})

describe('la CLI con --stream (T-038 + T-011)', () => {
  const BIN = join(import.meta.dir, '..', 'bin', 'harness.ts')
  const grabacion = (d: string, texto: string) => {
    const f = join(d, 'turnos.json')
    require('node:fs').writeFileSync(f, JSON.stringify([{ id: 'm1', model: 'claude-opus-5',
      stop_reason: 'end_turn', usage: uso, content: [{ type: 'text', text: texto }] }]))
    return f
  }

  test('el estilo text imprime el texto UNA vez, no dos', () => {
    const d = dir()
    const p = Bun.spawnSync(['bun', 'run', BIN, '--prompt', 'x', '--provider', 'recorded',
      '--grabacion', grabacion(d, 'uno dos tres'), '--cwd', d, '--transcript-dir', join(d, 'tr'), '--stream'])
    expect(p.exitCode).toBe(0)
    const salida = p.stdout.toString()
    // El texto tiene que aparecer entero y una sola vez: si los deltas se
    // imprimen ADEMAS del `text` final, el usuario lo lee dos veces.
    expect(salida).toContain('uno dos tres')
    expect(salida.split('uno dos tres').length - 1).toBe(1)
  })

  test('con --json cada delta sale como su propio evento', () => {
    const d = dir()
    const p = Bun.spawnSync(['bun', 'run', BIN, '--prompt', 'x', '--provider', 'recorded',
      '--grabacion', grabacion(d, 'uno dos tres'), '--cwd', d, '--transcript-dir', join(d, 'tr'),
      '--stream', '--output-style', 'json'])
    expect(p.exitCode).toBe(0)
    const tipos = p.stdout.toString().trim().split('\n')
      .map((l) => { try { return JSON.parse(l).type } catch { return null } })
    expect(tipos.filter((t) => t === 'text_delta').length).toBeGreaterThan(1)
  })

  test('sin --stream la salida no lleva ningun text_delta', () => {
    const d = dir()
    const p = Bun.spawnSync(['bun', 'run', BIN, '--prompt', 'x', '--provider', 'recorded',
      '--grabacion', grabacion(d, 'uno dos tres'), '--cwd', d, '--transcript-dir', join(d, 'tr'),
      '--output-style', 'json'])
    expect(p.stdout.toString()).not.toContain('text_delta')
  })
})

// El cierre de "escrito, sin ejercitar": el binario COMPLETO —config, bucle,
// proveedor HTTP, SSE, herramienta real, transcript— contra un servidor local
// que habla el protocolo. Lo único que la credencial bloquea es el servicio
// real; el protocolo no necesita permiso de nadie.
describe('punta a punta: el binario contra un servidor local que habla SSE', () => {
  const BIN = join(import.meta.dir, '..', 'bin', 'harness.ts')
  const sse = (eventos: Array<Record<string, unknown>>) =>
    eventos.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join('')

  const arranque = (id: string) => ({ type: 'message_start', message: { id, model: 'claude-opus-5',
    content: [], stop_reason: null, usage: { input_tokens: 4, output_tokens: 0,
      cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } } })

  test('escribe un archivo por herramienta y devuelve el texto del segundo turno', async () => {
    const d = dir()
    const marca = join(d, 'lo-hizo-por-sse.txt')
    let peticiones = 0
    const cuerpos: any[] = []
    const srv = Bun.serve({ port: 0, async fetch(req) {
      cuerpos.push(await req.json())
      peticiones += 1
      if (peticiones === 1) {
        return new Response(sse([
          arranque('m_sse_1'),
          { type: 'content_block_start', index: 0, content_block: { type: 'tool_use', id: 'tu_1', name: 'Write', input: {} } },
          { type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta',
              partial_json: JSON.stringify({ file_path: marca, content: 'llego por el stream' }) } },
          { type: 'content_block_stop', index: 0 },
          { type: 'message_delta', delta: { stop_reason: 'tool_use', stop_sequence: null }, usage: { output_tokens: 6 } },
          { type: 'message_stop' },
        ]), { headers: { 'content-type': 'text/event-stream' } })
      }
      return new Response(sse([
        arranque('m_sse_2'),
        { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
        { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'archivo ' } },
        { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'escrito' } },
        { type: 'content_block_stop', index: 0 },
        { type: 'message_delta', delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 3 } },
        { type: 'message_stop' },
      ]), { headers: { 'content-type': 'text/event-stream' } })
    } })
    try {
      // `spawnSync` NO sirve aquí: bloquea el event loop de este proceso, y el
      // servidor local vive en él — el binario pediría a un socket que nadie
      // atiende y las dos partes se esperarían para siempre. Medido: timeout.
      const p = Bun.spawn(['bun', 'run', BIN, '--prompt', 'escribe el archivo', '--provider', 'http',
        '--stream', '--cwd', d, '--transcript-dir', join(d, 'tr'), '--json'], {
        env: { ...process.env, ANTHROPIC_API_KEY: 'clave-local',
          ANTHROPIC_BASE_URL: `http://127.0.0.1:${srv.port}` },
        stdout: 'pipe', stderr: 'pipe',
      })
      const [salida, errores, codigo] = await Promise.all([
        new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited,
      ])
      expect(errores).toBe('')
      expect(codigo).toBe(0)
      const r = JSON.parse(salida)
      expect(r.stop).toBe('end_turn')
      expect(r.turns).toBe(2)
      expect(r.lastText).toBe('archivo escrito')
      // El usage se compuso de los dos eventos que lo traen, en los dos turnos
      expect(r.usage.input_tokens).toBe(8)
      expect(r.usage.output_tokens).toBe(9)
      expect(readFileSync(marca, 'utf8')).toBe('llego por el stream')
      // Y el segundo turno vio el resultado de la herramienta del primero
      expect(peticiones).toBe(2)
      expect(JSON.stringify(cuerpos[1].messages)).toContain('llego por el stream')
      expect(cuerpos[0].stream).toBe(true)
    } finally { srv.stop(true) }
  })
})
