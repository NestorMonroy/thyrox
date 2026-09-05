/**
 * Los eventos que el ejecutor de hooks emite al flujo (T-007).
 *
 * Fuente del porte: el mismo contrato del cliente que `hooks.ts` — este archivo
 * fija que cada disparo de hook aparezca en el flujo de eventos con su
 * `hook_event_name` y su desenlace (bloqueo por exit 2 incluido).
 */

import { describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, writeFileSync, chmodSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { HARNESS_HOOK_EVENTS } from '../src/hooks.ts'
import { agentTool } from '../src/tools/agent.ts'
import { switchModel } from '../src/sessions/modelSwitch.ts'
import { runLoop } from '../src/loop.ts'
import { RecordedProvider } from '../src/provider/recorded.ts'
import { CORE_TOOLS } from '../src/tools/registry.ts'
import { taskTools } from '../src/tools/tasks.ts'
import type { AssistantTurn } from '../src/types.ts'

const dir = () => mkdtempSync(join(tmpdir(), 'hev-'))
const uso = { input_tokens: 10, output_tokens: 5, cache_creation_input_tokens: 0, cache_read_input_tokens: 100 }
const texto = (t: string): AssistantTurn =>
  ({ id: `m${Math.random()}`, model: 'claude-opus-5', stop_reason: 'end_turn', content: [{ type: 'text', text: t }], usage: uso })
const usaHerramienta = (name: string, input: Record<string, unknown>): AssistantTurn => ({
  id: `m${Math.random()}`, model: 'claude-opus-5', stop_reason: 'tool_use',
  content: [{ type: 'tool_use', id: `tu_${Math.random()}`, name, input }], usage: uso,
})

/**
 * Un hook que apunta su payload en un archivo: así se ve qué recibió.
 *
 * **El `printf` no es adorno.** El payload que el harness pasa por stdin no
 * trae salto de línea final, así que dos invocaciones del mismo evento
 * quedaban concatenadas en una línea (`{...}{...}`) y `JSON.parse` reventaba.
 * Con el `catch` de antes eso devolvía `[]` — «no pude parsear» leído como
 * «no hubo eventos», que es el sub-patrón D dentro del propio instrumento.
 * Ningún caso lo destapó hasta que uno esperó DOS eventos del mismo tipo.
 *
 * Y el `catch` ahora sólo cubre el archivo ausente, que sí es cero eventos.
 * Una línea malformada **lanza**: un instrumento que no puede medir lo dice.
 */
function espia(d: string, nombre: string): { command: string; leer: () => Record<string, unknown>[] } {
  const destino = join(d, `${nombre}.jsonl`)
  const j = JSON.stringify(destino)
  return {
    command: `cat >> ${j}; printf '\\n' >> ${j}; echo '{}'`,
    leer: () => {
      let crudo: string
      try {
        crudo = readFileSync(destino, 'utf8')
      } catch { return [] }   // el archivo no existe: cero eventos, medido
      return crudo.trim().split('\n').filter(Boolean).map((l) => JSON.parse(l))
    },
  }
}

describe('los eventos de hook que el harness emite (T-016)', () => {
  test('la lista declarada es la que el bucle sabe emitir — ni una mas', () => {
    expect([...HARNESS_HOOK_EVENTS].sort()).toEqual([
      'FileChanged', 'InstructionsLoaded', 'PermissionDenied', 'PermissionRequest',
      'PostCompact', 'PostModelSwitch', 'PostToolBatch', 'PostToolUse', 'PostToolUseFailure',
      'PreCompact', 'PreModelSwitch', 'PreToolUse',
      'SessionEnd', 'SessionStart', 'Stop', 'SubagentStart', 'SubagentStop',
      'TaskCompleted', 'TaskCreated', 'UserPromptSubmit',
    ])
  })

  test('PreCompact y PostCompact disparan alrededor de la microcompactacion', async () => {
    const d = dir()
    const pre = espia(d, 'pre')
    const post = espia(d, 'post')
    const p = new RecordedProvider([
      usaHerramienta('Bash', { command: 'echo uno' }),
      usaHerramienta('Bash', { command: 'echo dos' }),
      texto('ya'),
    ])
    await runLoop({
      cwd: d, model: 'claude-opus-5', system: 's', tools: CORE_TOOLS, transcriptDir: d,
      provider: p, prompt: 'x',
      context: { microcompactAfter: 1, keepToolResults: 1, // El piso de 20 000 tokens se baja a 0 DECLARANDOLO: estos casos
      // miden el mecanismo, no la politica de cuando vale la pena.
      minFreedTokens: 0 },
      hooks: {
        PreCompact: [{ hooks: [{ type: 'command', command: pre.command }] }],
        PostCompact: [{ hooks: [{ type: 'command', command: post.command }] }],
      },
    })
    expect(pre.leer().length).toBeGreaterThan(0)
    const cargas = post.leer()
    expect(cargas.length).toBeGreaterThan(0)
    expect(cargas[0].trigger).toBe('micro')
    expect(cargas[0].cleared).toBe(1)
  })

  test('sin compactacion NO disparan: un hook que salta siempre no informa de nada', async () => {
    const d = dir()
    const pre = espia(d, 'pre')
    await runLoop({
      cwd: d, model: 'claude-opus-5', system: 's', tools: CORE_TOOLS, transcriptDir: d,
      provider: new RecordedProvider([texto('ya')]), prompt: 'x',
      hooks: { PreCompact: [{ hooks: [{ type: 'command', command: pre.command }] }] },
    })
    expect(pre.leer()).toEqual([])
  })

  test('SubagentStart y SubagentStop disparan como hooks, no solo en el diario', async () => {
    const d = dir()
    const inicio = espia(d, 'ini')
    const fin = espia(d, 'fin')
    const t = agentTool({
      provider: new RecordedProvider([texto('conclusion del hijo')]),
      transcriptDir: d, definitions: {},
      hooks: {
        SubagentStart: [{ hooks: [{ type: 'command', command: inicio.command }] }],
        SubagentStop: [{ hooks: [{ type: 'command', command: fin.command }] }],
      },
    })
    await t.run({ prompt: 'x' }, { cwd: d, sessionId: 'padre', abort: new AbortController().signal, messages: [] })
    expect(inicio.leer().length).toBe(1)
    const cierre = fin.leer()
    expect(cierre.length).toBe(1)
    expect(typeof cierre[0].transcript_path).toBe('string')
    expect(cierre[0].parent_session_id).toBe('padre')
  })

  test('un PreCompact que bloquea CANCELA la compactacion', async () => {
    const d = dir()
    const bloqueo = join(d, 'bloquea.sh')
    writeFileSync(bloqueo, '#!/bin/bash\ncat >/dev/null\necho "no compactes ahora" >&2\nexit 2\n')
    chmodSync(bloqueo, 0o755)
    const p = new RecordedProvider([
      usaHerramienta('Bash', { command: 'echo uno' }),
      usaHerramienta('Bash', { command: 'echo dos' }),
      texto('ya'),
    ])
    await runLoop({
      cwd: d, model: 'claude-opus-5', system: 's', tools: CORE_TOOLS, transcriptDir: d,
      provider: p, prompt: 'x',
      context: { microcompactAfter: 1, keepToolResults: 1, // El piso de 20 000 tokens se baja a 0 DECLARANDOLO: estos casos
      // miden el mecanismo, no la politica de cuando vale la pena.
      minFreedTokens: 0 },
      hooks: { PreCompact: [{ hooks: [{ type: 'command', command: `bash ${bloqueo}` }] }] },
    })
    // el resultado del primer Bash sigue entero en la tercera peticion
    const resultados = p.requests[2].messages.flatMap((m) => m.content)
      .filter((b) => b.type === 'tool_result').map((b) => (b as { content: string }).content)
    expect(resultados.some((c) => c.includes('uno'))).toBe(true)
  })
})

describe('PreModelSwitch y PostModelSwitch (T-016)', () => {
  test('el cambio de modelo pasa por su hook, con el coste de reescritura', async () => {
    const d = dir()
    const pre = espia(d, 'presw')
    const post = espia(d, 'postsw')
    const s = new (await import('../src/transcript.ts')).Transcript(join(d, 'ses.jsonl'), 'ses')
    s.appendUser('hola')
    s.appendAssistant({ id: 'm', model: 'claude-opus-5', content: [{ type: 'text', text: 'x'.repeat(2000) }] }, uso)
    const r = await switchModel({
      transcriptPath: join(d, 'ses.jsonl'), sessionId: 'ses', cwd: d, toModel: 'claude-fable-5-1',
      hooks: {
        PreModelSwitch: [{ hooks: [{ type: 'command', command: pre.command }] }],
        PostModelSwitch: [{ hooks: [{ type: 'command', command: post.command }] }],
      },
    })
    expect(r.applied).toBe(true)
    const carga = pre.leer()[0]
    expect(carga.from_model).toBe('claude-opus-5')
    expect(carga.to_model).toBe('claude-fable-5-1')
    expect(carga.prompt_cache_warm).toBe(true)
    expect(carga.context_tokens as number).toBeGreaterThan(0)
    expect(post.leer().length).toBe(1)
  })

  test('un PreModelSwitch que bloquea CANCELA el cambio, y PostModelSwitch no dispara', async () => {
    const d = dir()
    const post = espia(d, 'postsw')
    const bloqueo = join(d, 'no.sh')
    writeFileSync(bloqueo, '#!/bin/bash\ncat >/dev/null\necho "la cache esta caliente" >&2\nexit 2\n')
    chmodSync(bloqueo, 0o755)
    const s = new (await import('../src/transcript.ts')).Transcript(join(d, 'ses.jsonl'), 'ses')
    s.appendAssistant({ id: 'm', model: 'claude-opus-5', content: [{ type: 'text', text: 'x' }] }, uso)
    const r = await switchModel({
      transcriptPath: join(d, 'ses.jsonl'), sessionId: 'ses', cwd: d, toModel: 'claude-sonnet-5',
      hooks: {
        PreModelSwitch: [{ hooks: [{ type: 'command', command: `bash ${bloqueo}` }] }],
        PostModelSwitch: [{ hooks: [{ type: 'command', command: post.command }] }],
      },
    })
    expect(r.applied).toBe(false)
    expect(r.reason).toContain('caliente')
    expect(post.leer()).toEqual([])
  })

  test('cambiar al mismo modelo no es un cambio: no dispara nada', async () => {
    const d = dir()
    const pre = espia(d, 'presw')
    const s = new (await import('../src/transcript.ts')).Transcript(join(d, 'ses.jsonl'), 'ses')
    s.appendAssistant({ id: 'm', model: 'claude-opus-5', content: [{ type: 'text', text: 'x' }] }, uso)
    const r = await switchModel({
      transcriptPath: join(d, 'ses.jsonl'), sessionId: 'ses', cwd: d, toModel: 'claude-opus-5',
      hooks: { PreModelSwitch: [{ hooks: [{ type: 'command', command: pre.command }] }] },
    })
    expect(r.applied).toBe(false)
    expect(pre.leer()).toEqual([])
  })
})

// T-015 declaraba SEIS eventos de núcleo y la constante tenía CINCO:
// `SessionEnd` estaba en el enunciado y no en el código. Un porte parcial
// silencioso -- la tarea marcada cerrada con un símbolo ausente.
describe('SessionEnd — el sexto del núcleo (T-015)', () => {
  test('está declarado entre los eventos del harness', () => {
    expect(HARNESS_HOOK_EVENTS).toContain('SessionEnd')
  })

  test('se emite al terminar el bucle, después de Stop', () => {
    const d = dir()
    const eStop = espia(d, 'stop')
    const eEnd = espia(d, 'end')
    return runLoop({
      cwd: d, model: 'claude-opus-5', system: 's', tools: CORE_TOOLS, transcriptDir: d,
      prompt: 'x', provider: new RecordedProvider([texto('listo')]),
      hooks: { Stop: [{ hooks: [{ type: 'command', command: eStop.command }] }],
               SessionEnd: [{ hooks: [{ type: 'command', command: eEnd.command }] }] },
    }).then(() => {
      expect(eStop.leer()).toHaveLength(1)
      expect(eEnd.leer()).toHaveLength(1)
    })
  })

  // El payload dice POR QUÉ terminó: sin `reason`, un cierre por límite de
  // turnos y uno por respuesta completa se leen igual desde el hook.
  test('el payload trae session_id, transcript_path y la razón del cierre', async () => {
    const d = dir()
    const e = espia(d, 'end')
    const r = await runLoop({
      cwd: d, model: 'claude-opus-5', system: 's', tools: CORE_TOOLS, transcriptDir: d,
      prompt: 'x', provider: new RecordedProvider([texto('listo')]),
      hooks: { SessionEnd: [{ hooks: [{ type: 'command', command: e.command }] }] },
    })
    const p = e.leer()[0] as Record<string, unknown>
    expect(p.hook_event_name).toBe('SessionEnd')
    expect(p.session_id).toBe(r.sessionId)
    expect(p.transcript_path).toBe(r.transcriptPath)
    expect(p.reason).toBe('end_turn')
  })

  test('un cierre por límite de turnos lo declara en la razón', async () => {
    const d = dir()
    const e = espia(d, 'end')
    await runLoop({
      cwd: d, model: 'claude-opus-5', system: 's', tools: CORE_TOOLS, transcriptDir: d,
      prompt: 'x', maxTurns: 2,
      provider: new RecordedProvider(Array.from({ length: 5 }, () => usaHerramienta('Bash', { command: 'true' }))),
      hooks: { SessionEnd: [{ hooks: [{ type: 'command', command: e.command }] }] },
    })
    expect((e.leer()[0] as Record<string, unknown>).reason).toBe('max_turns')
  })

  // NO puede vetar: la sesión ya terminó. Un hook que bloquea aquí no tiene
  // nada que impedir, y tratarlo como veto daría un bloqueo sin efecto que
  // el operador leería como si hubiera parado algo.
  test('un SessionEnd que devuelve block NO altera el resultado', async () => {
    const d = dir()
    const r = await runLoop({
      cwd: d, model: 'claude-opus-5', system: 's', tools: CORE_TOOLS, transcriptDir: d,
      prompt: 'x', provider: new RecordedProvider([texto('listo')]),
      hooks: { SessionEnd: [{ hooks: [{ type: 'command',
        command: `echo '{"decision":"block","reason":"no dejo cerrar"}'` }] }] },
    })
    expect(r.stop).toBe('end_turn')
    expect(r.lastText).toBe('listo')
  })
})

const base = (d: string) => ({
  cwd: d, model: 'claude-opus-5', system: 'eres un harness', tools: CORE_TOOLS, transcriptDir: d,
})

describe('T-017 — los eventos cuyo subsistema emisor YA existe', () => {
  /**
   * La tarea decía «no hay emisor para ellos en nuestro harness todavía». Medido
   * contra el árbol, es falso para ocho: la puerta de permisos, la ruta de error
   * de herramienta, el lote de llamadas de un turno, el tablero de tareas, el
   * ensamblado del prompt y las herramientas de escritura ya existen y ya son
   * el punto donde cada uno se emite. Leer la condición no la mide.
   */

  test('PermissionDenied dispara cuando la puerta deniega, con la regla que decidio', async () => {
    const d = dir()
    const s = espia(d, 'ev')
    const cfg = { hooks: [{ type: 'command' as const, command: s.command }] }
    const p = new RecordedProvider([usaHerramienta('Write', { file_path: join(d, 'x'), content: 'y' }), texto('ok')])
    await runLoop({ ...base(d), prompt: 'x', provider: p,
      permissions: { write: 'deny' }, hooks: { PermissionDenied: [cfg] } })
    const e = s.leer()
    expect(e.map((x) => x.hook_event_name)).toContain('PermissionDenied')
    const denegado = e.find((x) => x.hook_event_name === 'PermissionDenied')
    expect(denegado?.tool_name).toBe('Write')
    expect(String(denegado?.reason ?? '')).not.toBe('')
  })

  test('PermissionRequest dispara ANTES del veredicto, tambien cuando permite', async () => {
    const d = dir()
    const s = espia(d, 'ev')
    const cfg = { hooks: [{ type: 'command' as const, command: s.command }] }
    const p = new RecordedProvider([usaHerramienta('Bash', { command: 'true' }), texto('ok')])
    await runLoop({ ...base(d), prompt: 'x', provider: p, hooks: { PermissionRequest: [cfg] } })
    const e = s.leer().filter((x) => x.hook_event_name === 'PermissionRequest')
    expect(e).toHaveLength(1)
    expect(e[0]?.tool_name).toBe('Bash')
  })

  test('PostToolUseFailure dispara SOLO cuando la herramienta falla', async () => {
    const d = dir()
    const s = espia(d, 'ev')
    const cfg = { hooks: [{ type: 'command' as const, command: s.command }] }
    const p = new RecordedProvider([
      usaHerramienta('Bash', { command: 'exit 3' }),
      usaHerramienta('Bash', { command: 'true' }),
      texto('ok'),
    ])
    await runLoop({ ...base(d), prompt: 'x', provider: p, hooks: { PostToolUseFailure: [cfg] } })
    const e = s.leer().filter((x) => x.hook_event_name === 'PostToolUseFailure')
    // dos llamadas, una falla: el evento distingue, no cuenta llamadas
    expect(e).toHaveLength(1)
  })

  test('PostToolBatch cierra el grupo de llamadas de UN turno, no cada llamada', async () => {
    const d = dir()
    const s = espia(d, 'ev')
    const cfg = { hooks: [{ type: 'command' as const, command: s.command }] }
    const dos: AssistantTurn = {
      id: 'm1', model: 'claude-opus-5', stop_reason: 'tool_use', usage: uso,
      content: [
        { type: 'tool_use', id: 'a', name: 'Bash', input: { command: 'true' } },
        { type: 'tool_use', id: 'b', name: 'Bash', input: { command: 'true' } },
      ],
    }
    await runLoop({ ...base(d), prompt: 'x', provider: new RecordedProvider([dos, texto('ok')]),
      hooks: { PostToolBatch: [cfg] } })
    const e = s.leer().filter((x) => x.hook_event_name === 'PostToolBatch')
    expect(e).toHaveLength(1)
    expect(e[0]?.tool_count).toBe(2)
  })

  test('FileChanged dispara con Write y con Edit, y nombra la ruta', async () => {
    const d = dir()
    const s = espia(d, 'ev')
    const cfg = { hooks: [{ type: 'command' as const, command: s.command }] }
    const objetivo = join(d, 'creado.txt')
    const p = new RecordedProvider([
      usaHerramienta('Write', { file_path: objetivo, content: 'uno' }),
      usaHerramienta('Edit', { file_path: objetivo, old_string: 'uno', new_string: 'dos' }),
      texto('ok'),
    ])
    await runLoop({ ...base(d), prompt: 'x', provider: p, hooks: { FileChanged: [cfg] } })
    const e = s.leer().filter((x) => x.hook_event_name === 'FileChanged')
    expect(e).toHaveLength(2)
    expect(e[0]?.file_path).toBe(objetivo)
    expect(e.map((x) => x.change)).toEqual(['write', 'edit'])
  })

  test('FileChanged NO dispara con una herramienta que no escribe archivos', async () => {
    // Sin este caso, un evento que disparara en TODA herramienta pasaria igual.
    const d = dir()
    const s = espia(d, 'ev')
    const cfg = { hooks: [{ type: 'command' as const, command: s.command }] }
    await runLoop({ ...base(d), prompt: 'x',
      provider: new RecordedProvider([usaHerramienta('Bash', { command: 'true' }), texto('ok')]),
      hooks: { FileChanged: [cfg] } })
    expect(s.leer().filter((x) => x.hook_event_name === 'FileChanged')).toHaveLength(0)
  })

  test('InstructionsLoaded dispara una vez al arrancar, con lo que se ensamblo', async () => {
    const d = dir()
    const s = espia(d, 'ev')
    const cfg = { hooks: [{ type: 'command' as const, command: s.command }] }
    await runLoop({ ...base(d), prompt: 'x', provider: new RecordedProvider([texto('ok')]),
      hooks: { InstructionsLoaded: [cfg] } })
    const e = s.leer().filter((x) => x.hook_event_name === 'InstructionsLoaded')
    expect(e).toHaveLength(1)
    expect(typeof e[0]?.characters).toBe('number')
  })
})

describe('T-017 — el tablero como emisor (TaskCreated · TaskCompleted)', () => {
  /**
   * El emisor existe desde T-019: `TaskCreate` y `TaskUpdate`. El evento vive
   * en el BUCLE y no dentro de la herramienta, por la misma razón que
   * `FileChanged`: la herramienta no conoce la configuración de hooks, y
   * acoplarla a ella la ataría a un harness concreto. El bucle ya sabe el
   * nombre de la herramienta y su resultado, que es todo lo que hace falta.
   */
  const conTablero = (d: string) => ({
    ...base(d), tools: [...CORE_TOOLS, ...taskTools({ dbPath: join(d, 'tablero.sqlite3') })],
  })

  test('TaskCreated dispara al crear, y lleva el id que el tablero asigno', async () => {
    const d = dir()
    const s = espia(d, 'ev')
    const cfg = { hooks: [{ type: 'command' as const, command: s.command }] }
    const p = new RecordedProvider([
      usaHerramienta('TaskCreate', { subject: 'medir algo', description: 'su condición de cierre' }),
      texto('ok'),
    ])
    await runLoop({ ...conTablero(d), prompt: 'x', provider: p, hooks: { TaskCreated: [cfg] } })
    const e = s.leer().filter((x) => x.hook_event_name === 'TaskCreated')
    expect(e).toHaveLength(1)
    expect(e[0]?.subject).toBe('medir algo')
    expect(typeof e[0]?.task_id).toBe('string')
  })

  test('TaskCompleted dispara SOLO cuando el estado pasa a completed', async () => {
    const d = dir()
    const s = espia(d, 'ev')
    const cfg = { hooks: [{ type: 'command' as const, command: s.command }] }
    const dbPath = join(d, 'tablero.sqlite3')
    const herramientas = [...CORE_TOOLS, ...taskTools({ dbPath })]
    // crear → in_progress → completed: tres llamadas, UN evento
    const p = new RecordedProvider([
      usaHerramienta('TaskCreate', { subject: 'una tarea' }),
      texto('creada'),
    ])
    const r1 = await runLoop({ ...base(d), tools: herramientas, prompt: 'x', provider: p })
    expect(r1.stop).toBe('end_turn')
    const id = JSON.parse(
      (p.requests[1].messages.at(-1)?.content as { content: string }[])[0].content,
    ).task_id as string

    const p2 = new RecordedProvider([
      usaHerramienta('TaskUpdate', { task_id: id, status: 'in_progress' }),
      usaHerramienta('TaskUpdate', { task_id: id, status: 'completed' }),
      texto('ok'),
    ])
    await runLoop({ ...base(d), tools: herramientas, prompt: 'y', provider: p2, hooks: { TaskCompleted: [cfg] } })
    const e = s.leer().filter((x) => x.hook_event_name === 'TaskCompleted')
    expect(e).toHaveLength(1)
    expect(e[0]?.task_id).toBe(id)
  })

  test('una TaskUpdate que FALLA no emite TaskCompleted', async () => {
    // Sin este caso, un emisor que disparara por el nombre de la herramienta
    // en vez de por su resultado pasaría igual.
    const d = dir()
    const s = espia(d, 'ev')
    const cfg = { hooks: [{ type: 'command' as const, command: s.command }] }
    const p = new RecordedProvider([
      usaHerramienta('TaskUpdate', { task_id: 'no-existe', status: 'completed' }),
      texto('ok'),
    ])
    await runLoop({ ...conTablero(d), prompt: 'x', provider: p, hooks: { TaskCompleted: [cfg] } })
    expect(s.leer().filter((x) => x.hook_event_name === 'TaskCompleted')).toHaveLength(0)
  })
})
