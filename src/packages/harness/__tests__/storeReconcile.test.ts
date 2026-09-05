/**
 * Barrido de filas `running` de un proceso muerto (T-094) y el trigger de
 * contabilidad de `updated_at`.
 *
 * La muerte de un proceso es un no-evento; por eso esto es un barrido y no un
 * trigger. El trigger sólo estampa `updated_at`, no decide vida.
 */
import { describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { recordHarnessSession, reconcileStaleRunningRows, ensureUpdatedAtTrigger } from '../src/observability/store.ts'
import { readProcStart } from '../src/session/reconcile.ts'
import { USAGE_CERO } from '../src/types.ts'

const ESQUEMA = `CREATE TABLE agent_sessions (
  agent_id TEXT PRIMARY KEY, subagent_type TEXT NOT NULL, session_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('running','completed','failed')),
  started_at TEXT NOT NULL, updated_at TEXT NOT NULL, model TEXT, description TEXT,
  turns INTEGER, input_tokens INTEGER, cache_creation_tokens INTEGER,
  cache_read_tokens INTEGER, output_tokens INTEGER, equiv_cost INTEGER,
  source TEXT, metadata_json TEXT, retention_level INTEGER, usage_source TEXT,
  compactions INTEGER, dropped_tokens INTEGER)`

function db() {
  const p = join(mkdtempSync(join(tmpdir(), 'store-')), 's.sqlite3')
  new Database(p).run(ESQUEMA)
  return p
}
const fila = (over: Partial<Parameters<typeof recordHarnessSession>[1]> = {}) => ({
  sessionId: 's1', model: 'claude-opus-5', turns: 1, usage: { ...USAGE_CERO },
  status: 'running' as const, startedAt: '2026-09-02T00:00:00Z', ...over,
})

describe('recordHarnessSession captura pid/procStart en metadata (T-094)', () => {
  test('una fila running del proceso vivo guarda su pid', () => {
    const p = db()
    recordHarnessSession(p, fila())
    const r = new Database(p).query(`SELECT metadata_json FROM agent_sessions WHERE agent_id='s1'`).get() as any
    const m = JSON.parse(r.metadata_json ?? '{}')
    expect(m.pid).toBe(process.pid)
    expect(m.procStart).toBeGreaterThan(0)
  })
})

describe('reconcileStaleRunningRows (T-094)', () => {
  test('una fila running del proceso VIVO se deja en paz', () => {
    const p = db()
    recordHarnessSession(p, fila({ agentId: 'viva', pid: process.pid }))
    const cerradas = reconcileStaleRunningRows(p)
    expect(cerradas.length).toBe(0)
    const st = (new Database(p).query(`SELECT status FROM agent_sessions WHERE agent_id='viva'`).get() as any).status
    expect(st).toBe('running')
  })

  // CONTROL: la fila de un proceso MUERTO pasa a failed. Sin verifyAdoption
  // (sin este barrido) quedaría running para siempre.
  test('una fila running de un pid MUERTO pasa a failed', () => {
    const p = db()
    recordHarnessSession(p, fila({ agentId: 'muerta', pid: 4194303, procStart: 12345 }))
    const cerradas = reconcileStaleRunningRows(p)
    expect(cerradas).toEqual([{ agentId: 'muerta', verdict: 'dead' }])
    const st = (new Database(p).query(`SELECT status FROM agent_sessions WHERE agent_id='muerta'`).get() as any).status
    expect(st).toBe('failed')
  })

  test('un pid vivo con procStart que NO coincide es recycled → failed', () => {
    const p = db()
    const real = readProcStart(process.pid)
    recordHarnessSession(p, fila({ agentId: 'recic', pid: process.pid, procStart: real + 1 }))
    const cerradas = reconcileStaleRunningRows(p)
    expect(cerradas).toEqual([{ agentId: 'recic', verdict: 'recycled' }])
  })

  // CONTROL: una fila sin pid NO se puede decidir y se DEJA running. Adivinar
  // sería peor que no tocarla — es el sub-patrón D (un control que no puede
  // fallar no discrimina).
  test('una fila running SIN pid en metadata se deja running', () => {
    const p = db()
    const d = new Database(p)
    d.run(`INSERT INTO agent_sessions (agent_id,subagent_type,session_id,status,started_at,updated_at)
           VALUES ('sinpid','hook','sx','running','t','t')`)
    const cerradas = reconcileStaleRunningRows(p)
    expect(cerradas.length).toBe(0)
    expect((d.query(`SELECT status FROM agent_sessions WHERE agent_id='sinpid'`).get() as any).status).toBe('running')
  })

  // CONTROL del guardia typeof pid: metadata PRESENTE pero sin pid. Sin el
  // guardia, verifyAdoption recibiría undefined y decidiría 'dead' → la
  // marcaría failed por error. Con él, se deja running.
  test('una fila running con metadata SIN pid se deja running', () => {
    const p = db()
    const d = new Database(p)
    d.run(`INSERT INTO agent_sessions (agent_id,subagent_type,session_id,status,started_at,updated_at,metadata_json)
           VALUES ('metasinpid','hook','sx','running','t','t','{"nota":"x"}')`)
    expect(reconcileStaleRunningRows(p).length).toBe(0)
    expect((d.query(`SELECT status FROM agent_sessions WHERE agent_id='metasinpid'`).get() as any).status).toBe('running')
  })

  test('una fila completed no se toca aunque su proceso esté muerto', () => {
    const p = db()
    recordHarnessSession(p, fila({ agentId: 'lista', status: 'completed', pid: 4194303 }))
    expect(reconcileStaleRunningRows(p).length).toBe(0)
  })
})

describe('trigger de updated_at (contabilidad)', () => {
  test('un cambio de status estampa updated_at', () => {
    const p = db()
    const d = new Database(p)
    ensureUpdatedAtTrigger(d)
    d.run(`INSERT INTO agent_sessions (agent_id,subagent_type,session_id,status,started_at,updated_at)
           VALUES ('t1','harness','sx','running','t','viejo')`)
    d.run(`UPDATE agent_sessions SET status='failed' WHERE agent_id='t1'`)
    const up = (d.query(`SELECT updated_at FROM agent_sessions WHERE agent_id='t1'`).get() as any).updated_at
    expect(up).not.toBe('viejo')
    expect(up).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
  test('un UPDATE que NO cambia status no re-estampa (guardia NEW<>OLD)', () => {
    const p = db()
    const d = new Database(p)
    ensureUpdatedAtTrigger(d)
    d.run(`INSERT INTO agent_sessions (agent_id,subagent_type,session_id,status,started_at,updated_at)
           VALUES ('t2','harness','sx','running','t','fijo')`)
    // Reasigna el MISMO status: dispara AFTER UPDATE OF status, y sólo el
    // guardia NEW<>OLD evita que re-estampe. Sin el guardia, updated_at cambia.
    d.run(`UPDATE agent_sessions SET status='running' WHERE agent_id='t2'`)
    expect((d.query(`SELECT updated_at FROM agent_sessions WHERE agent_id='t2'`).get() as any).updated_at).toBe('fijo')
  })
})
