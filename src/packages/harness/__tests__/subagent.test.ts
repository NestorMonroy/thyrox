/**
 * Herramienta `Agent` — el subagente (T-018).
 *
 * Fuente: diseño nativo, con el razonamiento de clave de caché de
 * `model-selection-subagents.md` — el subagente no comparte el prefijo del
 * padre, así que su primer turno paga su contexto entero. El test fija que el
 * subagente corra con transcript y prompt de sistema propios.
 */

import { describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { agentTool } from '../src/tools/agent.ts'
import { taskTools } from '../src/tools/tasks.ts'
import { readJournal } from '../src/observability/journal.ts'
import { RecordedProvider } from '../src/provider/recorded.ts'
import { CORE_TOOLS } from '../src/tools/registry.ts'
import type { AssistantTurn } from '../src/types.ts'

const dir = () => mkdtempSync(join(tmpdir(), 'sub-'))
const uso = { input_tokens: 10, output_tokens: 5, cache_creation_input_tokens: 0, cache_read_input_tokens: 100 }
const texto = (t: string, model = 'claude-sonnet-5'): AssistantTurn =>
  ({ id: `m${Math.random()}`, model, stop_reason: 'end_turn', content: [{ type: 'text', text: t }], usage: uso })
const ctx = (cwd: string) => ({ cwd, sessionId: 'padre', abort: new AbortController().signal, messages: [] })

describe('herramienta Agent — el subagente (T-018)', () => {
  test('declara su esquema y su permiso: ejecuta, no lee', () => {
    const t = agentTool({ provider: new RecordedProvider([]), transcriptDir: dir(), definitions: {} })
    expect(t.name).toBe('Agent')
    expect(t.permission).toBe('execute')
    expect(Object.keys(t.input_schema.properties).sort()).toEqual(['description', 'model', 'prompt', 'subagent_type'])
    expect(t.input_schema.required).toContain('prompt')
  })

  test('corre su propio bucle y devuelve el ultimo texto del hijo', async () => {
    const d = dir()
    const p = new RecordedProvider([texto('lo que el hijo concluyo')])
    const t = agentTool({ provider: p, transcriptDir: d, definitions: {} })
    const r = await t.run({ prompt: 'analiza esto', subagent_type: 'general-purpose' }, ctx(d))
    expect(r.isError).toBe(false)
    expect(r.content).toContain('lo que el hijo concluyo')
  })

  test('el hijo tiene contexto PROPIO: su peticion no lleva el historial del padre', async () => {
    const d = dir()
    const p = new RecordedProvider([texto('ok')])
    const t = agentTool({ provider: p, transcriptDir: d, definitions: {} })
    await t.run({ prompt: 'solo lo mio' }, ctx(d))
    const enviado = JSON.stringify(p.requests[0].messages)
    expect(enviado).toContain('solo lo mio')
    expect(enviado).not.toContain('padre')
  })

  test('el hijo escribe su propio transcript, distinto del padre', async () => {
    const d = dir()
    const t = agentTool({ provider: new RecordedProvider([texto('ok')]), transcriptDir: d, definitions: {} })
    const r = await t.run({ prompt: 'x' }, ctx(d))
    expect(r.content).toContain('.jsonl')
  })

  test('una definicion registrada fija el modelo y el prompt de sistema del hijo', async () => {
    const d = dir()
    const p = new RecordedProvider([texto('ok', 'claude-opus-5')])
    const t = agentTool({
      provider: p, transcriptDir: d,
      definitions: { revisor: { model: 'claude-opus-5', systemPrompt: 'eres el revisor' } },
    })
    await t.run({ prompt: 'revisa', subagent_type: 'revisor' }, ctx(d))
    expect(p.requests[0].model).toBe('claude-opus-5')
    expect(p.requests[0].system).toContain('eres el revisor')
  })

  test('un subagent_type desconocido es un error nombrado, no un default silencioso', async () => {
    const d = dir()
    const t = agentTool({ provider: new RecordedProvider([texto('ok')]), transcriptDir: d, definitions: { revisor: {} } })
    const r = await t.run({ prompt: 'x', subagent_type: 'no-existe' }, ctx(d))
    expect(r.isError).toBe(true)
    expect(r.content).toContain('no-existe')
    expect(r.content).toContain('revisor')
  })

  test('el hijo NO puede lanzar hijos: la profundidad se acota', async () => {
    const d = dir()
    const p = new RecordedProvider([texto('ok')])
    const t = agentTool({ provider: p, transcriptDir: d, definitions: {}, depth: 1, maxDepth: 1 })
    const r = await t.run({ prompt: 'x' }, ctx(d))
    expect(r.isError).toBe(true)
    expect(r.content).toContain('profundidad')
  })

  test('la anchura se acota: mas alla del tope el lanzamiento se RECHAZA, no se encola', async () => {
    const d = dir()
    const p = new RecordedProvider([texto('a'), texto('b'), texto('c')])
    const t = agentTool({ provider: p, transcriptDir: d, definitions: {}, maxConcurrent: 1 })
    const [uno, dos] = await Promise.all([t.run({ prompt: 'a' }, ctx(d)), t.run({ prompt: 'b' }, ctx(d))])
    const rechazos = [uno, dos].filter((r) => r.isError && r.content.includes('anchura'))
    expect(rechazos.length).toBe(1)
  })

  test('emite SubagentStart y SubagentStop al diario (T-016)', async () => {
    const d = dir()
    const journalPath = join(d, 'diario.jsonl')
    const t = agentTool({ provider: new RecordedProvider([texto('ok')]), transcriptDir: d, definitions: {}, journalPath })
    await t.run({ prompt: 'x' }, ctx(d))
    const clases = readJournal(journalPath).map((e) => e.kind)
    expect(clases).toContain('SubagentStart')
    expect(clases).toContain('SubagentStop')
  })
})

describe('la captura nativa en el store (rama B, H-DOCS-1024)', () => {
  // Un store con el mismo esquema de `agent_sessions` que el real. El harness
  // escribe SU propia fila: no depende del hook `SubagentStop` del cliente, que
  // en el entorno remoto no dispara (cwd/directorio-adicional + momento de
  // creacion del settings). Ese hueco es el que esta rama cierra.
  function storeConAgentSessions(): string {
    const ruta = join(dir(), 'store.sqlite3')
    const db = new Database(ruta)
    db.run(`CREATE TABLE agent_sessions (
      agent_id TEXT PRIMARY KEY, subagent_type TEXT NOT NULL, session_id TEXT NOT NULL,
      status TEXT NOT NULL, started_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      model TEXT, description TEXT, turns INTEGER, input_tokens INTEGER,
      cache_creation_tokens INTEGER, cache_read_tokens INTEGER, output_tokens INTEGER,
      equiv_cost INTEGER, retention_level INTEGER, usage_source TEXT, source TEXT,
      metadata_json TEXT, compactions INTEGER, dropped_tokens INTEGER)`)
    db.close()
    return ruta
  }
  const filas = (ruta: string): Record<string, unknown>[] => {
    const db = new Database(ruta, { readonly: true })
    const r = db.query('select * from agent_sessions').all() as Record<string, unknown>[]
    db.close()
    return r
  }

  test('un subagente que completa escribe SU tipo real y source=harness — lo que la reconciliacion pierde', async () => {
    const d = dir()
    const store = storeConAgentSessions()
    const t = agentTool({
      provider: new RecordedProvider([texto('conclusion del hijo', 'claude-opus-5')]),
      transcriptDir: d, storePath: store,
      definitions: { 'migration-porter': { model: 'claude-opus-5' } },
    })
    const r = await t.run({ prompt: 'porta ir.cron', subagent_type: 'migration-porter', description: 'porte de ir.cron' }, ctx(d))
    expect(r.isError).toBe(false)

    const rs = filas(store)
    expect(rs.length).toBe(1)
    const f = rs[0]
    // El CONTROL que discrimina: el tipo es el REAL, no 'desconocido' ni 'harness'.
    // Ese es exactamente el campo que la reconciliacion desde disco no reconstruye.
    expect(f.subagent_type).toBe('migration-porter')
    expect(f.source).toBe('harness')
    expect(f.usage_source).toBe('transcript')
    expect(f.status).toBe('completed')
    expect(f.model).toBe('claude-opus-5')
    expect(f.description).toBe('porte de ir.cron')
    expect(f.turns).toBe(1)
    // uso grabado: cache_read=100, output=5 — tokens reales, no NULL.
    expect(f.cache_read_tokens).toBe(100)
    expect(f.output_tokens).toBe(5)
    expect(f.retention_level).toBe(3)
  })

  test('running -> completed es UNA fila; el session_id del bucle llega en el cierre', async () => {
    const d = dir()
    const store = storeConAgentSessions()
    const t = agentTool({
      provider: new RecordedProvider([texto('ok')]), transcriptDir: d, storePath: store, definitions: {},
    })
    const r = await t.run({ prompt: 'x' }, ctx(d))
    const rs = filas(store)
    expect(rs.length).toBe(1)          // no duplica: mismo agent_id
    const f = rs[0]
    expect(f.status).toBe('completed')
    // El session_id ya NO es el placeholder del despacho (= agent_id): es el id
    // real del bucle, el basename del transcript. Sin el update en ON CONFLICT
    // la fase 'running' habria dejado el placeholder para siempre.
    expect(f.session_id).not.toBe(f.agent_id)
    expect(r.content).toContain(String(f.session_id))
  })

  test('un subagente que falla deja status=failed, con su tipo real', async () => {
    const d = dir()
    const store = storeConAgentSessions()
    // Un proveedor sin turnos hace que runLoop lance en el primer send.
    const t = agentTool({
      provider: new RecordedProvider([]), transcriptDir: d, storePath: store,
      definitions: { revisor: {} },
    })
    const r = await t.run({ prompt: 'x', subagent_type: 'revisor' }, ctx(d))
    expect(r.isError).toBe(true)
    const rs = filas(store)
    expect(rs.length).toBe(1)
    expect(rs[0].status).toBe('failed')
    expect(rs[0].subagent_type).toBe('revisor')
    expect(rs[0].source).toBe('harness')
  })

  test('sin storePath no se escribe nada — el tool sigue usable sin store', async () => {
    const d = dir()
    const store = storeConAgentSessions()
    const t = agentTool({ provider: new RecordedProvider([texto('ok')]), transcriptDir: d, definitions: {} })
    const r = await t.run({ prompt: 'x' }, ctx(d))
    expect(r.isError).toBe(false)
    expect(filas(store).length).toBe(0)   // el store existe pero nadie escribio
  })
})

describe('herramientas de tablero Task* (T-019)', () => {
  function tableroTemporal(): string {
    const destino = join(dir(), 'store.sqlite3')
    const real = new Database(join(import.meta.dir, '..', '..', '..', 'agent-results', 'agent_store.sqlite3'), { readonly: true })
    const ddl = real.query("select sql from sqlite_master where type='table' and name='tasks'").get() as { sql: string }
    real.close()
    const db = new Database(destino)
    db.run(ddl.sql)
    db.close()
    return destino
  }

  test('declaran su permiso: leer y escribir no son lo mismo', () => {
    const ts = taskTools({ dbPath: ':memory:' })
    expect(ts.find((t) => t.name === 'TaskGet')?.permission).toBe('read')
    expect(ts.find((t) => t.name === 'TaskList')?.permission).toBe('read')
    expect(ts.find((t) => t.name === 'TaskCreate')?.permission).toBe('write')
  })

  test('crear, listar y actualizar sobre el tablero real', async () => {
    const p = tableroTemporal()
    const [crear, listar, actualizar] = ['TaskCreate', 'TaskList', 'TaskUpdate']
      .map((n) => taskTools({ dbPath: p }).find((t) => t.name === n)!)
    const d = dir()
    const c = await crear.run({ subject: 'portar ir.cron', description: 'con su suite' }, ctx(d))
    expect(c.isError).toBe(false)
    const id = JSON.parse(c.content).task_id as string
    expect(id).toBeTruthy()

    const l = JSON.parse((await listar.run({}, ctx(d))).content) as { task_id: string; status: string }[]
    expect(l.map((t) => t.task_id)).toContain(id)
    expect(l[0].status).toBe('pending')

    await actualizar.run({ task_id: id, status: 'completed' }, ctx(d))
    const l2 = JSON.parse((await listar.run({ status: 'completed' }, ctx(d))).content) as { task_id: string }[]
    expect(l2.map((t) => t.task_id)).toEqual([id])
  })

  test('actualizar una tarea inexistente es error, no un no-op silencioso', async () => {
    const p = tableroTemporal()
    const actualizar = taskTools({ dbPath: p }).find((t) => t.name === 'TaskUpdate')!
    const r = await actualizar.run({ task_id: 'no-existe', status: 'completed' }, ctx(dir()))
    expect(r.isError).toBe(true)
    expect(r.content).toContain('no-existe')
  })

  test('un estado fuera del vocabulario se rechaza con la lista de los validos', async () => {
    const p = tableroTemporal()
    const [crear, actualizar] = ['TaskCreate', 'TaskUpdate'].map((n) => taskTools({ dbPath: p }).find((t) => t.name === n)!)
    const id = JSON.parse((await crear.run({ subject: 'x' }, ctx(dir()))).content).task_id
    const r = await actualizar.run({ task_id: id, status: 'inventado' }, ctx(dir()))
    expect(r.isError).toBe(true)
    expect(r.content).toContain('pending')
  })
})

describe('tablero Task* — la asociación y el alcance por sesión (T-061)', () => {
  /** El DDL del tablero real, leído de su propio esquema. */
  function ddlReal(): string {
    const real = new Database(join(import.meta.dir, '..', '..', '..', 'agent-results', 'agent_store.sqlite3'), { readonly: true })
    const fila = real.query("select sql from sqlite_master where type='table' and name='tasks'").get() as { sql: string }
    real.close()
    return fila.sql
  }

  /** Una base vacía creada por el propio harness, sin copiar nada del store. */
  function tableroPropio(): string {
    return join(dir(), 'propio.sqlite3')
  }

  function util(dbPath: string, nombre: string, sessionId?: string) {
    return taskTools({ dbPath, sessionId }).find((t) => t.name === nombre)!
  }

  test('los cuatro primitivos del tablero, más la lista efímera aparte', () => {
    const nombres = taskTools({ dbPath: ':memory:' }).map((t) => t.name)
    expect(nombres.filter((n) => n.startsWith('Task')).sort())
      .toEqual(['TaskCreate', 'TaskGet', 'TaskList', 'TaskUpdate'])
    expect(nombres.filter((n) => n.startsWith('Todo')).sort()).toEqual(['TodoRead', 'TodoWrite'])
  })

  test('el esquema que crea el harness es el del tablero real, columna por columna', async () => {
    const p = tableroPropio()
    await util(p, 'TaskCreate').run({ subject: 'siembra' }, ctx(dir()))
    const db = new Database(p, { readonly: true })
    const columnas = (db.query('PRAGMA table_info(tasks)').all() as { name: string }[]).map((c) => c.name)
    db.close()
    const reales = [...ddlReal().matchAll(/^\s{2,}([a-z_]+)\s+TEXT/gm)].map((m) => m[1])
    for (const c of reales) expect(columnas).toContain(c)
  })

  test('el id es el ordinal siguiente del tablero, no un UUID', async () => {
    const p = tableroPropio()
    const crear = util(p, 'TaskCreate')
    const uno = JSON.parse((await crear.run({ subject: 'una' }, ctx(dir()))).content).task_id
    const dos = JSON.parse((await crear.run({ subject: 'otra' }, ctx(dir()))).content).task_id
    expect(uno).toMatch(/^\d+$/)
    expect(Number(dos)).toBe(Number(uno) + 1)
  })

  test('TaskCreate declara la asociación y TaskGet la resuelve con el asunto del bloqueante', async () => {
    const p = tableroPropio()
    const crear = util(p, 'TaskCreate')
    const base = JSON.parse((await crear.run({ subject: 'puentear los - [ ] al tablero' }, ctx(dir()))).content).task_id
    const dep = JSON.parse((await crear.run({ subject: 'implementar TodoWrite', blocked_by: [base] }, ctx(dir()))).content).task_id

    const g = JSON.parse((await util(p, 'TaskGet').run({ task_id: dep }, ctx(dir()))).content)
    expect(g.blocked_by).toEqual([{ task_id: base, subject: 'puentear los - [ ] al tablero', status: 'pending' }])
    expect(g.blocked).toBe(true)

    // La arista es bidireccional: el bloqueante sabe a quién bloquea.
    const gb = JSON.parse((await util(p, 'TaskGet').run({ task_id: base }, ctx(dir()))).content)
    expect(gb.blocks.map((t: { task_id: string }) => t.task_id)).toEqual([dep])
  })

  test('TaskList sabe filtrar lo desbloqueado — la pregunta que la continuación automática hace', async () => {
    const p = tableroPropio()
    const crear = util(p, 'TaskCreate')
    const base = JSON.parse((await crear.run({ subject: 'la que va antes' }, ctx(dir()))).content).task_id
    const dep = JSON.parse((await crear.run({ subject: 'la que espera', blocked_by: [base] }, ctx(dir()))).content).task_id

    const libres = JSON.parse((await util(p, 'TaskList').run({ status: 'pending', unblocked: true }, ctx(dir()))).content)
    expect(libres.map((t: { task_id: string }) => t.task_id)).toEqual([base])

    await util(p, 'TaskUpdate').run({ task_id: base, status: 'completed' }, ctx(dir()))
    const libres2 = JSON.parse((await util(p, 'TaskList').run({ status: 'pending', unblocked: true }, ctx(dir()))).content)
    expect(libres2.map((t: { task_id: string }) => t.task_id)).toEqual([dep])
  })

  test('dos sesiones con el mismo ordinal no se pisan — el control es el tablero real', async () => {
    const p = tableroPropio()
    const a = util(p, 'TaskCreate', 'sesion-a')
    const b = util(p, 'TaskCreate', 'sesion-b')
    const idA = JSON.parse((await a.run({ subject: 'Portar authz_totp_mail' }, ctx(dir()))).content).task_id
    // La segunda sesión reusa el mismo ordinal: es lo que el store real tiene en seis ids.
    const db = new Database(p)
    const ahora = new Date().toISOString()
    db.run(`INSERT INTO tasks (task_id, subject, status, session_id, created_at, updated_at)
            VALUES (?, 'Fijar como se cita una tarea', 'pending', 'sesion-b', ?, ?)`, [idA, ahora, ahora])
    db.close()

    await util(p, 'TaskUpdate', 'sesion-a').run({ task_id: idA, status: 'completed' }, ctx(dir()))

    const enB = JSON.parse((await util(p, 'TaskGet', 'sesion-b').run({ task_id: idA }, ctx(dir()))).content)
    expect(enB.status).toBe('pending')
    expect(enB.subject).toBe('Fijar como se cita una tarea')
    void b
  })

  test('TaskGet de una tarea ausente es error, no un objeto vacío', async () => {
    const r = await util(tableroPropio(), 'TaskGet').run({ task_id: '404' }, ctx(dir()))
    expect(r.isError).toBe(true)
    expect(r.content).toContain('404')
  })
})
