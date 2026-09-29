/**
 * `ensureClearedTable`/`makeClearedPersister` (T-094, TASK-THYROX-0534): el
 * DDL de `cleared_tool_results` ya no vive en Bun — `agent_store.py` es el
 * dueño del schema (DEC-TASK 2026-09-29), y estas funciones sólo VALIDAN el
 * ledger que su migración escribe.
 */
import { describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createMigratedTaskDb } from '@thyrox/task/schema.ts'
import { ensureClearedTable, makeClearedPersister, CLEARED_TABLE } from '../src/clearedResults.ts'

const dir = () => mkdtempSync(join(tmpdir(), 'cleared-'))
const calls = new Map([['tu1', { tool: 'Read', input: { file_path: '/x' } }]])

describe('ensureClearedTable — valida el ledger, no lo crea', () => {
  test('una base migrada por agent_store.py no rehúsa', () => {
    const p = join(dir(), 'migrada.sqlite3')
    createMigratedTaskDb(p)
    const db = new Database(p)
    expect(() => ensureClearedTable(db)).not.toThrow()
    db.close()
  })

  // CONTROL: sin ledger de migraciones, rehúsa nombrando lo que falta —
  // antes de este cambio, esta misma llamada CREABA la tabla en silencio.
  test('una base sin ledger rehúsa nombrando schema_migrations', () => {
    const p = join(dir(), 'sin-ledger.sqlite3')
    const db = new Database(p)
    db.run('CREATE TABLE agent_sessions (agent_id TEXT PRIMARY KEY)')
    expect(() => ensureClearedTable(db)).toThrow(/schema_migrations/)
    db.close()
  })
})

describe('makeClearedPersister — con y sin store migrado', () => {
  test('con una base migrada, persiste la llamada y devuelve el marcador con procedencia', () => {
    const p = join(dir(), 'migrada.sqlite3')
    createMigratedTaskDb(p)
    const persister = makeClearedPersister({ dbPath: p, sessionId: 's1', calls })
    const marker = persister.persist('contenido de prueba', 'tu1')
    expect(marker).not.toBeNull()
    expect(marker).toContain('Read')
    expect(persister.failures.size).toBe(0)
    const row = new Database(p, { readonly: true })
      .query(`SELECT tool, content_chars FROM ${CLEARED_TABLE} WHERE tool_use_id = 'tu1'`)
      .get() as { tool: string; content_chars: number }
    expect(row.tool).toBe('Read')
    expect(row.content_chars).toBe('contenido de prueba'.length)
  })

  // CONTROL: el mismo caso que arriba, pero sin ledger — el motivo declarado
  // es 'sin-store', con el detalle del rechazo (no se traga el porqué).
  test('sin ledger, el motivo declarado es sin-store con su detalle', () => {
    const p = join(dir(), 'sin-ledger.sqlite3')
    new Database(p).run('CREATE TABLE agent_sessions (agent_id TEXT PRIMARY KEY)')
    const persister = makeClearedPersister({ dbPath: p, sessionId: 's1', calls })
    const marker = persister.persist('contenido de prueba', 'tu1')
    expect(marker).toBeNull()
    const failure = persister.failures.get('tu1')
    expect(failure?.reason).toBe('sin-store')
    expect(failure?.detail).toMatch(/schema_migrations/)
  })
})
