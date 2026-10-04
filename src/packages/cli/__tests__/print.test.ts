/**
 * `thyrox -p`: el contrato que `headless-pool` usa, portado del modo `--print`
 * del ejecutable 2.1.282 al despacho nativo. Las formas de las líneas `system/init` y `result`
 * salen del binario 2.1.282 (`S5` y el constructor de `init`), extraídas en
 * `.claude/workbench/print-mode-20260926T225709/`.
 */
import { describe, expect, test } from 'bun:test'
import { appendFileSync, existsSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createStreamJsonEmitter, parsePrintArgs, runPrint, streamJsonLines } from '../src/entry/print.ts'
import { detectMode } from '../src/entry/detect-mode.ts'

const usageOf = (n: number) => ({ input_tokens: n, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 10 * n })
const textTurn = (t: string, n = 1) => ({ id: `m${n}`, model: 'claude-sonnet-5', stop_reason: 'end_turn', content: [{ type: 'text', text: t }], usage: usageOf(n) })
const toolUseTurn = (name: string, input: Record<string, unknown>, n = 1) => ({ id: `m${n}`, model: 'claude-sonnet-5', stop_reason: 'tool_use', content: [{ type: 'tool_use', id: `tu${n}`, name, input }], usage: usageOf(n) })

function writeRecording(turns: unknown[]): string {
  const d = mkdtempSync(join(tmpdir(), 'print-rec-'))
  const f = join(d, 'turnos.json')
  writeFileSync(f, JSON.stringify(turns))
  return f
}

async function capture(fn: () => Promise<number>): Promise<{ code: number; out: string; err: string }> {
  let out = ''
  let err = ''
  const w = process.stdout.write.bind(process.stdout)
  const e = process.stderr.write.bind(process.stderr)
  process.stdout.write = ((s: string) => { out += s; return true }) as typeof process.stdout.write
  process.stderr.write = ((s: string) => { err += s; return true }) as typeof process.stderr.write
  try {
    const code = await fn()
    return { code, out, err }
  } finally {
    process.stdout.write = w
    process.stderr.write = e
  }
}

describe('detectMode — -p y --print eligen el modo print', () => {
  test('-p', () => expect(detectMode(['-p', 'hola']).kind).toBe('print'))
  test('--print sin prompt (llega por stdin)', () => expect(detectMode(['--print']).kind).toBe('print'))
  test('sin -p sigue siendo el bucle', () => expect(detectMode(['--prompt', 'x']).kind).toBe('loop'))
})

describe('parsePrintArgs — el contrato de thyrox -p', () => {
  test('el prompt posicional gana a stdin', () => {
    expect(parsePrintArgs(['-p', 'hola'], 'de stdin').prompt).toBe('hola')
  })

  test('sin posicional el prompt es stdin', () => {
    expect(parsePrintArgs(['-p', '--model', 'claude-sonnet-5'], 'de stdin\n').prompt).toBe('de stdin\n')
  })

  test('las banderas del pool se traducen', () => {
    const a = parsePrintArgs(['-p', '--model', 'claude-sonnet-5', '--setting-sources', 'project',
      '--tools', 'Read', '--allowedTools', 'Read', '--max-turns', '3', '--no-session-persistence',
      '--output-format', 'stream-json', '--verbose'], 'x')
    expect(a.model).toBe('claude-sonnet-5')
    expect(a.maxTurns).toBe(3)
    expect(a.tools).toEqual(['Read'])
    expect(a.persist).toBe(false)
    expect(a.outputFormat).toBe('stream-json')
    expect(a.loopArgv).toContain('--settings-source')
    expect(a.loopArgv[a.loopArgv.indexOf('--settings-source') + 1]).toBe('project')
  })

  test('--tools acepta la lista por comas o espacios', () => {
    expect(parsePrintArgs(['-p', 'x', '--tools', 'Read,Grep Bash'], null).tools).toEqual(['Read', 'Grep', 'Bash'])
  })

  test('--tools y --allowedTools se intersecan', () => {
    expect(parsePrintArgs(['-p', 'x', '--tools', 'Read,Bash', '--allowedTools', 'Read'], null).tools).toEqual(['Read'])
  })

  test('el proveedor por defecto es http; --provider lo cambia', () => {
    expect(parsePrintArgs(['-p', 'x'], null).loopArgv).toEqual(expect.arrayContaining(['--provider', 'http']))
    const r = parsePrintArgs(['-p', 'x', '--provider', 'recorded', '--grabacion', 'g.json'], null)
    expect(r.loopArgv).toEqual(expect.arrayContaining(['--provider', 'recorded', '--grabacion', 'g.json']))
  })

  // A6 r8: 20 000 de los 25 468 tokens del prompt eran reglas siempre cargadas;
  // con un modelo local en CPU cada mil tokens cuestan ~1 min de prefill. El
  // presupuesto del prompt de sistema ya lo aplica `assembleSystemPrompt`.
  test('--system-budget-tokens llega al bucle, que acota con él el prompt de sistema', () => {
    const r = parsePrintArgs(['-p', 'x', '--system-budget-tokens', '8000'], null)
    expect(r.loopArgv.slice(r.loopArgv.indexOf('--system-budget-tokens'), r.loopArgv.indexOf('--system-budget-tokens') + 2))
      .toEqual(['--system-budget-tokens', '8000'])
  })

  test('una bandera desconocida se rehúsa nombrándola', () => {
    expect(() => parsePrintArgs(['-p', 'x', '--permission-mode', 'plan'], null)).toThrow(/--permission-mode/)
  })

  test('sin prompt ni stdin se rehúsa', () => {
    expect(() => parsePrintArgs(['-p'], null)).toThrow(/prompt/)
  })

  test('un formato de salida desconocido se rehúsa', () => {
    expect(() => parsePrintArgs(['-p', 'x', '--output-format', 'xml'], null)).toThrow(/output-format/)
  })
})

describe('streamJsonLines — las formas del binario', () => {
  const transcript = [
    { type: 'user', message: { role: 'user', content: [{ type: 'text', text: 'hola' }] } },
    { type: 'assistant', message: { id: 'm1', model: 'claude-sonnet-5', role: 'assistant', content: [{ type: 'text', text: 'ok' }], usage: usageOf(1) } },
  ]
  const result = { stop: 'end_turn' as const, turns: 1, lastText: 'ok', usage: usageOf(1), sessionId: 's1', transcriptPath: '/t', usd: 0.5 }
  const lines = streamJsonLines({ transcript, result, model: 'claude-sonnet-5', tools: ['Read'], cwd: '/w', startedAt: 0, now: 12 })

  test('abre con system/init', () => {
    expect(lines[0]).toMatchObject({ type: 'system', subtype: 'init', cwd: '/w', session_id: 's1', tools: ['Read'], model: 'claude-sonnet-5' })
  })

  test('cada petición es una línea assistant con su usage', () => {
    const a = lines.filter((l) => l.type === 'assistant')
    expect(a).toHaveLength(1)
    expect(a[0]).toMatchObject({ type: 'assistant', session_id: 's1', parent_tool_use_id: null })
    expect((a[0] as { message: { usage: unknown } }).message.usage).toEqual(usageOf(1))
  })

  test('cierra con result de éxito, con los campos de S5', () => {
    expect(lines.at(-1)).toMatchObject({ type: 'result', subtype: 'success', is_error: false, num_turns: 1,
      result: 'ok', session_id: 's1', total_cost_usd: 0.5, usage: usageOf(1), duration_ms: 12, stop_reason: 'end_turn' })
  })

  test('max_turns da error_max_turns y is_error', () => {
    const r = streamJsonLines({ transcript, result: { ...result, stop: 'max_turns' }, model: 'm', tools: [], cwd: '/w', startedAt: 0, now: 1 })
    expect(r.at(-1)).toMatchObject({ type: 'result', subtype: 'error_max_turns', is_error: true })
  })

  test('otra parada da error_during_execution', () => {
    const r = streamJsonLines({ transcript, result: { ...result, stop: 'refusal' }, model: 'm', tools: [], cwd: '/w', startedAt: 0, now: 1 })
    expect(r.at(-1)).toMatchObject({ subtype: 'error_during_execution', is_error: true })
  })
})

// Medido (2026-10-04, repo-code-change@1): `thyrox -p --output-format
// stream-json` escribía todas sus líneas al terminar el bucle. El vigilante del
// pool leyó 0 bytes durante 1800 s de un trabajador que sí editaba archivos, y
// lo detuvo como «sin progreso». Las líneas salen cuando ocurren.
describe('createStreamJsonEmitter — cada línea sale cuando ocurre', () => {
  const assistant = (id: string) => ({ type: 'assistant', message: { id, role: 'assistant', content: [{ type: 'text', text: id }], usage: usageOf(1) } })
  const toolResult = { type: 'user', message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'tu1', content: 'String to replace not found in file.', is_error: true }] } }

  function setup() {
    const transcriptPath = join(mkdtempSync(join(tmpdir(), 'emit-')), 't.jsonl')
    writeFileSync(transcriptPath, '')
    const written: Record<string, unknown>[] = []
    const emitter = createStreamJsonEmitter({ write: (line) => written.push(JSON.parse(line)), model: 'm', tools: ['Edit'], cwd: '/w', startedAt: 0 })
    const append = (entry: unknown) => appendFileSync(transcriptPath, `${JSON.stringify(entry)}\n`)
    return { transcriptPath, written, emitter, append }
  }

  test('system/init sale al empezar la sesión, antes de cualquier turno', () => {
    const { transcriptPath, written, emitter } = setup()
    emitter.onEvent({ type: 'session_start', sessionId: 's1', transcriptPath })
    expect(written).toHaveLength(1)
    expect(written[0]).toMatchObject({ type: 'system', subtype: 'init', session_id: 's1', tools: ['Edit'] })
  })

  test('cada assistant sale en cuanto el transcript la tiene, sin esperar al final', () => {
    const { transcriptPath, written, emitter, append } = setup()
    emitter.onEvent({ type: 'session_start', sessionId: 's1', transcriptPath })
    append(assistant('m1'))
    emitter.onEvent({ type: 'tool_start', turn: 1, tool: 'Edit', input: {} })
    expect(written.map((l) => l.type)).toEqual(['system', 'assistant'])
    append(assistant('m2'))
    emitter.onEvent({ type: 'turn_start', turn: 2 })
    expect(written.filter((l) => l.type === 'assistant')).toHaveLength(2)
  })

  test('el resultado de una herramienta sale como línea user: el rechazo es observable', () => {
    const { transcriptPath, written, emitter, append } = setup()
    emitter.onEvent({ type: 'session_start', sessionId: 's1', transcriptPath })
    append(toolResult)
    emitter.onEvent({ type: 'tool_end', turn: 1, tool: 'Edit', output: '', isError: true })
    expect(written.at(-1)).toMatchObject({ type: 'user', session_id: 's1', parent_tool_use_id: null, message: toolResult.message })
  })

  test('una línea del transcript a medio escribir espera a estar completa', () => {
    const { transcriptPath, written, emitter } = setup()
    emitter.onEvent({ type: 'session_start', sessionId: 's1', transcriptPath })
    appendFileSync(transcriptPath, '{"type":"assistant","mess')
    emitter.onEvent({ type: 'turn_start', turn: 1 })
    expect(written).toHaveLength(1)
    appendFileSync(transcriptPath, 'age":{"id":"m1"}}\n')
    emitter.onEvent({ type: 'turn_start', turn: 2 })
    expect(written.map((l) => l.type)).toEqual(['system', 'assistant'])
  })

  test('el cierre vacía lo pendiente y termina con result, una sola vez cada línea', () => {
    const { transcriptPath, written, emitter, append } = setup()
    emitter.onEvent({ type: 'session_start', sessionId: 's1', transcriptPath })
    append(assistant('m1'))
    emitter.onEvent({ type: 'turn_start', turn: 1 })
    append(assistant('m2'))
    emitter.finish({ stop: 'end_turn', turns: 2, lastText: 'm2', usage: usageOf(2), sessionId: 's1', transcriptPath, usd: 0 }, 5)
    expect(written.map((l) => l.type)).toEqual(['system', 'assistant', 'assistant', 'result'])
  })
})

describe('runPrint — de punta a punta con proveedor grabado', () => {
  test('stream-json: init, una assistant por petición y result; herramientas filtradas', async () => {
    const g = writeRecording([toolUseTurn('Read', { file_path: '/etc/hostname' }, 1), textTurn('listo', 2)])
    const td = mkdtempSync(join(tmpdir(), 'print-td-'))
    const { code, out } = await capture(() => runPrint(['-p', 'lee algo', '--provider', 'recorded', '--grabacion', g,
      '--tools', 'Read', '--output-format', 'stream-json', '--max-turns', '5'], process.cwd(), td, null))
    const lines = out.trim().split('\n').map((l) => JSON.parse(l))
    expect(code).toBe(0)
    expect(lines[0]).toMatchObject({ type: 'system', subtype: 'init', tools: ['Read'] })
    expect(lines.filter((l) => l.type === 'assistant')).toHaveLength(2)
    expect(lines.at(-1)).toMatchObject({ type: 'result', subtype: 'success', result: 'listo', num_turns: 2 })
  })

  test('--no-session-persistence no deja transcript', async () => {
    const g = writeRecording([textTurn('hecho')])
    const td = mkdtempSync(join(tmpdir(), 'print-td-'))
    const { code } = await capture(() => runPrint(['-p', 'x', '--provider', 'recorded', '--grabacion', g,
      '--no-session-persistence', '--output-format', 'json'], process.cwd(), td, null))
    expect(code).toBe(0)
    expect(readdirSync(td)).toEqual([])
  })

  test('sin --no-session-persistence el transcript queda', async () => {
    const g = writeRecording([textTurn('hecho')])
    const td = mkdtempSync(join(tmpdir(), 'print-td-'))
    await capture(() => runPrint(['-p', 'x', '--provider', 'recorded', '--grabacion', g], process.cwd(), td, null))
    expect(readdirSync(td).length).toBeGreaterThan(0)
  })

  test('text: imprime sólo el resultado', async () => {
    const g = writeRecording([textTurn('la respuesta')])
    const td = mkdtempSync(join(tmpdir(), 'print-td-'))
    const { out } = await capture(() => runPrint(['-p', 'x', '--provider', 'recorded', '--grabacion', g], process.cwd(), td, null))
    expect(out).toBe('la respuesta\n')
  })

  test('el prompt por stdin llega al modelo', async () => {
    const g = writeRecording([textTurn('ok')])
    const td = mkdtempSync(join(tmpdir(), 'print-td-'))
    const { code } = await capture(() => runPrint(['-p', '--provider', 'recorded', '--grabacion', g], process.cwd(), td, 'desde stdin'))
    expect(code).toBe(0)
    const sessions = readdirSync(td)
    expect(sessions.length).toBe(1)
    const [session] = sessions
    expect(session).toBeDefined()
    expect(existsSync(join(td, session as string))).toBe(true)
  })

  test('una bandera desconocida sale 2 y lo dice por stderr', async () => {
    const td = mkdtempSync(join(tmpdir(), 'print-td-'))
    const { code, err } = await capture(() => runPrint(['-p', 'x', '--bogus'], process.cwd(), td, null))
    expect(code).toBe(2)
    expect(err).toContain('--bogus')
  })
})
