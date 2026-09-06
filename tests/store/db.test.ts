/**
 * Apertura del store: busy_timeout (#28) y sonda temprana (#26).
 */
import { describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openStore, probeStore, BUSY_TIMEOUT_MS } from '../../src/store/db.ts'

const tmp = () => join(mkdtempSync(join(tmpdir(), 'db-')), 's.sqlite3')

describe('openStore fija busy_timeout (#28)', () => {
  test('un store abierto con openStore tiene busy_timeout > 0', () => {
    const p = tmp(); new Database(p).run('CREATE TABLE t(x)')
    const db = openStore(p)
    const bt = (db.query('PRAGMA busy_timeout').get() as any).timeout
    db.close()
    expect(bt).toBe(BUSY_TIMEOUT_MS)
  })
  // CONTROL: sin el pragma (una Database a pelo) el busy_timeout es 0 — un
  // INSERT contra un lock fallaría al instante en vez de esperar.
  test('una Database a pelo tiene busy_timeout 0 (el defecto que #28 corrige)', () => {
    const p = tmp(); const db = new Database(p)
    const bt = (db.query('PRAGMA busy_timeout').get() as any).timeout
    db.close()
    expect(bt).toBe(0)
  })
})

describe('probeStore detecta el store muerto al arranque (#26)', () => {
  test('un store válido devuelve ok', () => {
    const p = tmp(); new Database(p).run('CREATE TABLE t(x)')
    expect(probeStore(p)).toEqual({ ok: true })
  })
  // CONTROL: un path que no se puede abrir como DB devuelve ok:false con el
  // motivo, en vez de lanzar. Un directorio no es una base.
  test('un path inabrible devuelve ok:false con detalle', () => {
    const dir = mkdtempSync(join(tmpdir(), 'db-'))
    const r = probeStore(dir)  // un directorio, no un archivo de base
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.detail.length).toBeGreaterThan(0)
  })
})
