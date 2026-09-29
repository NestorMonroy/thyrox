/**
 * Apertura del store: busy_timeout (#28) y sonda temprana (#26).
 */
import { describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openLocal, probeStore, BUSY_TIMEOUT_MS } from '../db.ts'

const tmp = () => join(mkdtempSync(join(tmpdir(), 'db-')), 's.sqlite3')

describe('openLocal fija busy_timeout (#28)', () => {
  test('un store abierto con openLocal tiene busy_timeout > 0', () => {
    const p = tmp(); new Database(p).run('CREATE TABLE t(x)')
    const db = openLocal(p)
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
  test('con { readonly: true } también fija busy_timeout, y la conexión rehúsa escribir', () => {
    const p = tmp(); new Database(p).run('CREATE TABLE t(x)')
    const db = openLocal(p, { readonly: true })
    const bt = (db.query('PRAGMA busy_timeout').get() as any).timeout
    expect(bt).toBe(BUSY_TIMEOUT_MS)
    expect(() => db.run('INSERT INTO t VALUES (1)')).toThrow()
    db.close()
  })
  // CONTROL: sin pasar `readonly`, la misma conexión sí escribe — la
  // guarda de arriba mide la opción, no un defecto de bun:sqlite.
  test('sin { readonly: true } la conexión escribe', () => {
    const p = tmp(); new Database(p).run('CREATE TABLE t(x)')
    const db = openLocal(p)
    expect(() => db.run('INSERT INTO t VALUES (1)')).not.toThrow()
    db.close()
  })
  test('con { create: true } crea el archivo si falta, con busy_timeout fijado', () => {
    const p = tmp() // mkdtempSync crea el directorio; el archivo no existe todavía
    const db = openLocal(p, { create: true })
    const bt = (db.query('PRAGMA busy_timeout').get() as any).timeout
    db.close()
    expect(bt).toBe(BUSY_TIMEOUT_MS)
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
