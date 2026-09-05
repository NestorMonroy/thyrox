/**
 * El bucle (T-006) — la pieza que define a un harness.
 *
 * Fuente: diseño nativo con el contrato del cliente para hooks y permisos —
 * petición → bloques → herramientas → repetición hasta `end_turn`/`maxTurns`/
 * abort. El control que discrimina es que cada herramienta pase por la puerta
 * de permisos ANTES de tocar disco.
 */

import { describe, expect, test } from 'bun:test'
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runLoop, streamLoop } from '../src/loop.ts'
import { CLEARED_MARKER } from '../src/context/microcompact.ts'
import { readJournal } from '../src/observability/journal.ts'
import { RecordedProvider } from '../src/provider/recorded.ts'
import { CORE_TOOLS } from '../src/tools/registry.ts'
import type { AssistantTurn } from '../src/types.ts'

const dir = () => mkdtempSync(join(tmpdir(), 'loop-'))
const uso = { input_tokens: 10, output_tokens: 5, cache_creation_input_tokens: 0, cache_read_input_tokens: 100 }
const texto = (t: string): AssistantTurn => ({ id: `m${Math.random()}`, model: 'claude-opus-5', stop_reason: 'end_turn', content: [{ type: 'text', text: t }], usage: uso })
const usaHerramienta = (name: string, input: Record<string, unknown>): AssistantTurn => ({
  id: `m${Math.random()}`, model: 'claude-opus-5', stop_reason: 'tool_use',
  content: [{ type: 'tool_use', id: 'tu_1', name, input }], usage: uso,
})

const base = (d: string) => ({ cwd: d, model: 'claude-opus-5', system: 'eres un harness', tools: CORE_TOOLS, transcriptDir: d })

describe('runLoop — el bucle (T-006)', () => {
  test('un turno sin herramientas termina con end_turn y devuelve el texto', async () => {
    const d = dir()
    const r = await runLoop({ ...base(d), prompt: 'hola', provider: new RecordedProvider([texto('listo')]) })
    expect(r.stop).toBe('end_turn')
    expect(r.turns).toBe(1)
    expect(r.lastText).toBe('listo')
  })

  test('ejecuta la herramienta que el modelo pide y le devuelve el resultado', async () => {
    const d = dir()
    const p = new RecordedProvider([usaHerramienta('Bash', { command: 'echo desde-la-herramienta' }), texto('visto')])
    const r = await runLoop({ ...base(d), prompt: 'corre algo', provider: p })
    expect(r.turns).toBe(2)
    // la segunda peticion lleva el tool_result con la salida real
    const segunda = p.requests[1]
    const ultimo = segunda.messages[segunda.messages.length - 1]
    expect(ultimo.role).toBe('user')
    expect(JSON.stringify(ultimo.content)).toContain('desde-la-herramienta')
    expect(r.stop).toBe('end_turn')
  })

  test('maxTurns corta el bucle y lo dice', async () => {
    const d = dir()
    const p = new RecordedProvider(Array.from({ length: 5 }, () => usaHerramienta('Bash', { command: 'true' })))
    const r = await runLoop({ ...base(d), prompt: 'x', provider: p, maxTurns: 3 })
    expect(r.stop).toBe('max_turns')
    expect(r.turns).toBe(3)
  })

  test('una herramienta desconocida no rompe: vuelve como tool_result de error', async () => {
    const d = dir()
    const p = new RecordedProvider([usaHerramienta('NoExiste', {}), texto('ya')])
    const r = await runLoop({ ...base(d), prompt: 'x', provider: p })
    expect(r.stop).toBe('end_turn')
    expect(JSON.stringify(p.requests[1].messages)).toContain('NoExiste')
  })

  test('el usage se acumula por turno', async () => {
    const d = dir()
    const p = new RecordedProvider([usaHerramienta('Bash', { command: 'true' }), texto('fin')])
    const r = await runLoop({ ...base(d), prompt: 'x', provider: p })
    expect(r.usage.cache_read_input_tokens).toBe(200)
    expect(r.usage.output_tokens).toBe(10)
  })

  test('el transcript queda escrito y es reanudable', async () => {
    const d = dir()
    const r = await runLoop({ ...base(d), prompt: 'primera', provider: new RecordedProvider([texto('respuesta')]) })
    const lineas = readFileSync(r.transcriptPath, 'utf8').trim().split('\n').map((l) => JSON.parse(l))
    expect(lineas[0].message.content[0].text).toBe('primera')
    // la ultima linea es la frontera del bucle, no el mensaje: el harness
    // cierra el transcript declarando POR QUE paro
    expect(lineas.at(-1)).toMatchObject({ type: 'system', subtype: 'loop_stop', content: 'end_turn' })
    expect(lineas.at(-2).type).toBe('assistant')
    // reanudar: el historial previo viaja en la peticion
    const p2 = new RecordedProvider([texto('segunda')])
    await runLoop({ ...base(d), prompt: 'sigue', provider: p2, resume: r.sessionId })
    expect(p2.requests[0].messages.map((m) => m.role)).toEqual(['user', 'assistant', 'user'])
  })

  test('PreToolUse con exit 2 impide la ejecucion y el modelo se entera', async () => {
    const d = dir()
    const h = join(d, 'veto.sh')
    writeFileSync(h, '#!/bin/bash\necho "prohibido por el gate" >&2\nexit 2\n')
    chmodSync(h, 0o755)
    const marca = join(d, 'no-debe-existir')
    const p = new RecordedProvider([usaHerramienta('Bash', { command: `touch ${marca}` }), texto('entendido')])
    const r = await runLoop({ ...base(d), prompt: 'x', provider: p, hooks: { PreToolUse: [{ hooks: [{ type: 'command', command: h }] }] } })
    expect(await Bun.file(marca).exists()).toBe(false)
    expect(JSON.stringify(p.requests[1].messages)).toContain('prohibido por el gate')
    expect(r.stop).toBe('end_turn')
  })

  test('la puerta de permisos deniega antes de tocar el disco', async () => {
    const d = dir()
    const marca = join(d, 'tampoco')
    const p = new RecordedProvider([usaHerramienta('Write', { file_path: marca, content: 'x' }), texto('ok')])
    await runLoop({ ...base(d), prompt: 'x', provider: p, permissions: { write: 'deny' } })
    expect(await Bun.file(marca).exists()).toBe(false)
    expect(JSON.stringify(p.requests[1].messages)).toContain('denegado')
  })

  test('abortar detiene el bucle y lo declara', async () => {
    const d = dir()
    const ac = new AbortController()
    const p = new RecordedProvider(Array.from({ length: 4 }, () => usaHerramienta('Bash', { command: 'true' })), () => ac.abort())
    const r = await runLoop({ ...base(d), prompt: 'x', provider: p, signal: ac.signal })
    expect(r.stop).toBe('aborted')
  })

  test('SessionStart y Stop se disparan una vez cada uno', async () => {
    const d = dir()
    const h = join(d, 'contar.sh')
    writeFileSync(h, `#!/bin/bash\n{ cat; echo; } >> ${join(d, 'eventos.jsonl')}\n`)
    chmodSync(h, 0o755)
    const cfg = { hooks: [{ type: 'command' as const, command: h }] }
    await runLoop({ ...base(d), prompt: 'x', provider: new RecordedProvider([texto('y')]),
      hooks: { SessionStart: [cfg], Stop: [cfg], UserPromptSubmit: [cfg] } })
    const eventos = readFileSync(join(d, 'eventos.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l).hook_event_name)
    expect(eventos).toEqual(['SessionStart', 'UserPromptSubmit', 'Stop'])
  })
})

describe('el bucle compacta cuando el contexto crece (T-023, T-024)', () => {
  const grande = 'x'.repeat(20000)

  test('microcompacta los resultados viejos antes de la siguiente peticion', async () => {
    const p = new RecordedProvider([
      usaHerramienta('Bash', { command: `echo ${grande}` }),
      usaHerramienta('Bash', { command: 'echo dos' }),
      texto('listo'),
    ])
    const d = dir()
    await runLoop({
      ...base(d), provider: p, prompt: 'corre',
      context: { microcompactAfter: 1, keepToolResults: 1, // El piso de 20 000 tokens se baja a 0 DECLARANDOLO: estos casos
      // miden el mecanismo, no la politica de cuando vale la pena.
      minFreedTokens: 0 },
    })
    // la tercera peticion ya no lleva el resultado gordo: fue sustituido.
    // Se mira el bloque `tool_result`, no el mensaje entero: el `tool_use` del
    // modelo repite el comando en su `input`, y eso NO lo toca la
    // microcompactacion — el modelo dijo lo que dijo.
    const resultados = p.requests[2].messages
      .flatMap((m) => m.content)
      .filter((b) => b.type === 'tool_result')
      .map((b) => (b as { content: string }).content)
    // El marcador lleva la PROCEDENCIA del registro detrás: qué llamada lo
    // produjo, el digest de lo que había y su tamaño. Sin eso, el modelo lee
    // «hubo algo» y nadie puede volver a pedirlo ni saber si cambió.
    expect(resultados[0]).toStartWith(CLEARED_MARKER)
    expect(resultados[0]).toContain('Bash(echo dos)')
    expect(resultados[0]).toMatch(/sha256:[0-9a-f]{12}/)
    expect(resultados.join()).not.toContain(grande)
  })

  test('sin la opcion de contexto NO compacta: es una decision, no un default', async () => {
    const p = new RecordedProvider([usaHerramienta('Bash', { command: `echo ${grande}` }), texto('listo')])
    await runLoop({ ...base(dir()), provider: p, prompt: 'corre' })
    expect(JSON.stringify(p.requests[1].messages)).toContain(grande)
  })

  test('emite un evento cuando compacta, para que la interfaz lo pueda decir', async () => {
    const p = new RecordedProvider([
      usaHerramienta('Bash', { command: 'echo uno' }),
      usaHerramienta('Bash', { command: 'echo dos' }),
      texto('ya'),
    ])
    const eventos: string[] = []
    const gen = streamLoop({
      ...base(dir()), provider: p, prompt: 'corre',
      context: { microcompactAfter: 1, keepToolResults: 1, // El piso de 20 000 tokens se baja a 0 DECLARANDOLO: estos casos
      // miden el mecanismo, no la politica de cuando vale la pena.
      minFreedTokens: 0 },
    })
    let n = await gen.next()
    while (!n.done) { eventos.push(n.value.type); n = await gen.next() }
    expect(eventos).toContain('compaction')
  })
})

describe('el bucle registra lo que hace (T-031, T-032)', () => {
  test('con diario, cada evento del bucle deja su linea', async () => {
    const d = dir()
    const p = new RecordedProvider([usaHerramienta('Bash', { command: 'echo hola' }), texto('ya')])
    const journalPath = join(d, 'diario.jsonl')
    await runLoop({ ...base(d), provider: p, prompt: 'x', journalPath })
    const clases = readJournal(journalPath).map((e) => e.kind)
    expect(clases).toContain('session_start')
    expect(clases).toContain('tool_end')
    expect(clases).toContain('done')
  })

  test('sin diario el bucle corre igual: la telemetria no es un requisito', async () => {
    const p = new RecordedProvider([texto('ya')])
    const r = await runLoop({ ...base(dir()), provider: p, prompt: 'x' })
    expect(r.stop).toBe('end_turn')
  })

  test('el resultado trae el coste del modelo que el turno declaro', async () => {
    const p = new RecordedProvider([texto('ya')])
    const r = await runLoop({ ...base(dir()), provider: p, prompt: 'x' })
    expect(r.usd).not.toBeNull()
    expect(r.usd as number).toBeGreaterThan(0)
  })
})
