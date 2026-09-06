/**
 * Diario de eventos (T-032) — el equivalente del `diag log` del cliente.
 *
 * Fuente del porte: el `diag log` del cliente. Su obligación dura es no romper
 * el flujo: el test verifica que un fallo de escritura se trague y se cuente,
 * para que la ausencia de líneas se lea como falta y no como calma.
 */

import { afterEach, describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Journal, readJournal } from '../src/observability/journal.ts'
import {
  STORE_FILE, STORE_PATH, STORE_PATH_VAR, recordHarnessSession, storePath,
} from '../src/observability/store.ts'
import { CONSUMER_ROOT_VAR } from '../../../paths/reach.ts'
import { costReport, turnCost } from '../src/observability/cost.ts'
import type { Usage } from '../src/types.ts'

const dir = () => mkdtempSync(join(tmpdir(), 'obs-'))
const uso = (o: Partial<Usage> = {}): Usage => ({
  input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, ...o,
})

describe('coste por turno (T-031)', () => {
  test('traduce los nombres del API a los del catalogo antes de cobrar', () => {
    // opus-5: cache_read 0.5 $/Mtok. Un millon de tokens leidos de cache = 0.50 USD.
    // Si la traduccion fallara, el campo llegaria vacio y el coste seria 0.
    const c = turnCost('claude-opus-5', uso({ cache_read_input_tokens: 1_000_000 }))
    expect(c.usd).toBeCloseTo(0.5, 6)
  })

  test('el TTL decide el precio de la escritura de cache', () => {
    const u = uso({ cache_creation_input_tokens: 1_000_000 })
    const cinco = turnCost('claude-opus-5', u, '5m').usd
    const hora = turnCost('claude-opus-5', u, '1h').usd
    if (cinco === null || hora === null) {
      throw new Error('claude-opus-5 esta en el catalogo: un usd null aqui es fallo de traduccion, no de precio')
    }
    expect(hora).toBeGreaterThan(cinco)
    expect(hora / cinco).toBeCloseTo(10 / 6.25, 6)
  })

  test('un modelo fuera del catalogo devuelve null y su razon, NO un cero', () => {
    const c = turnCost('gpt-inexistente', uso({ input_tokens: 1000 }))
    expect(c.usd).toBeNull()
    expect(c.reason).toContain('gpt-inexistente')
  })

  test('el informe suma los turnos y reparte por componente', () => {
    const r = costReport('claude-opus-5', [
      uso({ input_tokens: 100, cache_read_input_tokens: 1_000_000 }),
      uso({ output_tokens: 1_000_000 }),
    ])
    expect(r.turns).toBe(2)
    expect(r.usage.cache_read_input_tokens).toBe(1_000_000)
    expect(r.usd).toBeCloseTo(0.5 + 25 + (100 * 5) / 1e6, 6)
    expect(r.share.cache_read).toBeGreaterThan(0)
    expect(r.share.cache_read + r.share.output + r.share.input + r.share.cache_creation).toBeCloseTo(1, 6)
  })

  test('sin turnos el informe es cero, con su reparto en cero — no NaN', () => {
    const r = costReport('claude-opus-5', [])
    expect(r.usd).toBe(0)
    expect(r.share.cache_read).toBe(0)
  })
})

describe('diario de eventos (T-032)', () => {
  test('escribe una linea JSON por evento, con sello y sesion', () => {
    const d = dir()
    const j = new Journal(join(d, 'diario.jsonl'), 'ses-1')
    j.log('turn_start', { turn: 1 })
    j.log('compaction', { kind: 'micro', cleared: 3 })
    const filas = readJournal(join(d, 'diario.jsonl'))
    expect(filas.length).toBe(2)
    expect(filas[0].kind).toBe('turn_start')
    expect(filas[0].sessionId).toBe('ses-1')
    expect(typeof filas[0].timestamp).toBe('string')
    expect(filas[1].data.cleared).toBe(3)
  })

  test('NUNCA rompe el flujo: un destino imposible no lanza', () => {
    const j = new Journal('/proc/no/se/puede/escribir.jsonl', 's')
    expect(() => j.log('x', {})).not.toThrow()
    expect(j.failures).toBeGreaterThan(0)
  })

  test('leer un diario inexistente da una lista vacia', () => {
    expect(readJournal(join(dir(), 'no-hay.jsonl'))).toEqual([])
  })

  test('una linea corrupta se salta sin perder las demas', () => {
    const d = dir()
    const p = join(d, 'diario.jsonl')
    const j = new Journal(p, 's')
    j.log('uno', {})
    require('node:fs').appendFileSync(p, '{esto no es json\n')
    j.log('dos', {})
    expect(readJournal(p).map((f) => f.kind)).toEqual(['uno', 'dos'])
  })
})

describe('integracion con agent_store (T-033)', () => {
  /** Copia el esquema REAL del store: si deriva, este test lo dice. */
  function storeTemporal(): string {
    const destino = join(dir(), 'store.sqlite3')
    const real = new Database(STORE_PATH, { readonly: true })
    const ddl = real
      .query("select sql from sqlite_master where type='table' and name='agent_sessions'")
      .get() as { sql: string }
    real.close()
    const db = new Database(destino)
    db.run(ddl.sql)
    db.close()
    return destino
  }

  test('el store real existe y declara agent_sessions', () => {
    const db = new Database(STORE_PATH, { readonly: true })
    const t = db.query("select name from sqlite_master where name='agent_sessions'").get()
    db.close()
    expect(t).toBeTruthy()
  })

  test('escribe una fila con el modelo del transcript y usage_source propio', () => {
    const p = storeTemporal()
    recordHarnessSession(p, {
      sessionId: 'ses-abc', model: 'claude-opus-5', turns: 3,
      usage: uso({ input_tokens: 10, cache_read_input_tokens: 500 }),
      status: 'completed', startedAt: '2026-09-02T00:00:00Z',
    })
    const db = new Database(p, { readonly: true })
    const fila = db.query('select * from agent_sessions').get() as Record<string, unknown>
    db.close()
    expect(fila.session_id).toBe('ses-abc')
    expect(fila.model).toBe('claude-opus-5')
    expect(fila.subagent_type).toBe('harness')
    expect(fila.usage_source).toBe('transcript')
    expect(fila.cache_read_tokens).toBe(500)
    expect(fila.turns).toBe(3)
  })

  test('la fila del orquestador declara su nivel de retencion 3, no 2', () => {
    // El 2 lo escribe quien verifica de forma independiente, nunca el propio
    // productor: `niveles-de-retencion.md`.
    const p = storeTemporal()
    recordHarnessSession(p, {
      sessionId: 's', model: 'claude-opus-5', turns: 1, usage: uso(),
      status: 'completed', startedAt: '2026-09-02T00:00:00Z',
    })
    const db = new Database(p, { readonly: true })
    const fila = db.query('select retention_level from agent_sessions').get() as { retention_level: number }
    db.close()
    expect(fila.retention_level).toBe(3)
  })

  test('reescribir la misma sesion actualiza la fila en vez de duplicarla', () => {
    const p = storeTemporal()
    const base = { sessionId: 's', model: 'claude-opus-5', usage: uso(), status: 'running' as const, startedAt: '2026-09-02T00:00:00Z' }
    recordHarnessSession(p, { ...base, turns: 1 })
    recordHarnessSession(p, { ...base, turns: 9, status: 'completed' })
    const db = new Database(p, { readonly: true })
    const filas = db.query('select turns, status from agent_sessions').all() as { turns: number; status: string }[]
    db.close()
    expect(filas.length).toBe(1)
    expect(filas[0].turns).toBe(9)
    expect(filas[0].status).toBe('completed')
  })
})

describe('las tres unidades, y ninguna sustituye a otra', () => {
  const uso: Usage = {
    input_tokens: 1000, output_tokens: 500,
    cache_creation_input_tokens: 2000, cache_read_input_tokens: 400_000,
  }

  test('turnCost publica USD Y tokens equivalentes: precio y consumo son distintos', () => {
    const c = turnCost('claude-opus-5', uso, '5m')
    expect(c.usd).not.toBeNull()
    expect(c.equivalentTokens).not.toBeNull()
    // No son la misma cifra ni proporcionales entre modelos: es el punto.
    expect(c.equivalentTokens as number).toBeGreaterThan(c.usd as number)
  })

  test('el equivalente cambia entre modelos aunque el consumo CRUDO sea el mismo', () => {
    const crudo = uso.input_tokens + uso.output_tokens
      + uso.cache_creation_input_tokens + uso.cache_read_input_tokens
    const a = turnCost('claude-sonnet-5', uso, '5m').equivalentTokens as number
    const b = turnCost('claude-fable-5-1', uso, '5m').equivalentTokens as number
    expect(crudo).toBe(403_500)          // la capacidad no depende del modelo
    expect(a).not.toBeCloseTo(b, 0)      // el coste comparable sí
  })

  test('un modelo fuera del catalogo deja las DOS en null, no una en cero', () => {
    const c = turnCost('claude-inventado-9', uso)
    expect(c.usd).toBeNull()
    expect(c.equivalentTokens).toBeNull()
    expect(c.reason).toContain('claude-inventado-9')
  })

  test('costReport lleva las tres: usage crudo, equivalente y USD', () => {
    const r = costReport('claude-opus-5', [uso, uso], '5m')
    expect(r.usage.cache_read_input_tokens).toBe(800_000)   // crudo
    expect(r.equivalentTokens).not.toBeNull()               // comparable
    expect(r.usd).not.toBeNull()                            // factura
  })
})

describe('storePath — el consumidor es parámetro, no el clon de docs', () => {
  const guardado = { ...process.env }
  const temporales: string[] = []

  afterEach(() => {
    for (const k of Object.keys(process.env)) if (!(k in guardado)) delete process.env[k]
    Object.assign(process.env, guardado)
    for (const d of temporales.splice(0)) rmSync(d, { recursive: true, force: true })
  })

  function raizTemporal(): string {
    const d = mkdtempSync(join(tmpdir(), 'store-path-'))
    temporales.push(d)
    return d
  }

  test('el valor directo gana sobre todo', () => {
    process.env[STORE_PATH_VAR] = '/de/la/variable.sqlite3'
    expect(storePath('/pasado/a/mano.sqlite3')).toBe('/pasado/a/mano.sqlite3')
  })

  test('la variable del store gana sobre la del consumidor', () => {
    process.env[STORE_PATH_VAR] = '/declarado/agent_store.sqlite3'
    process.env[CONSUMER_ROOT_VAR] = '/otro/consumidor'
    expect(storePath()).toBe('/declarado/agent_store.sqlite3')
  })

  test('sin la del store, el consumidor declarado compone la ruta', () => {
    delete process.env[STORE_PATH_VAR]
    const consumidor = raizTemporal()
    process.env[CONSUMER_ROOT_VAR] = consumidor
    expect(storePath()).toBe(join(consumidor, '.claude', 'agent-results', STORE_FILE))
  })

  test('sin ninguna de las dos, cae al clon de docs — la conducta de hoy', () => {
    delete process.env[STORE_PATH_VAR]
    delete process.env[CONSUMER_ROOT_VAR]
    expect(storePath()).toBe(STORE_PATH)
  })

  test('el ascenso NO gobierna: tres árboles del sistema llevan el marcador', () => {
    delete process.env[STORE_PATH_VAR]
    delete process.env[CONSUMER_ROOT_VAR]
    const consumidor = raizTemporal()
    mkdirSync(join(consumidor, '.claude'), { recursive: true })
    // Un ascenso desde aquí devolvería `consumidor`; la resolución del store
    // exige el valor declarado, así que no lo hace.
    expect(storePath()).not.toBe(join(consumidor, '.claude', 'agent-results', STORE_FILE))
  })
})
