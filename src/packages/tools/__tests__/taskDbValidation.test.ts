/**
 * `conBase` (DEC-TASK 2026-09-29, opción 1): Bun ya no ejecuta DDL sobre la
 * base de tareas — sólo valida que Python (el dueño del schema) ya la migró.
 * Sin ledger, el error es explícito y nombrable; con la base migrada por
 * `agent_store.py`, la herramienta opera con normalidad.
 */
import { describe, expect, test } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createMigratedTaskDb } from '@thyrox/task/schema.ts'
import { taskTools } from '../src/tasks.ts'

const dir = () => mkdtempSync(join(tmpdir(), 'task-db-validation-'))
const ctx = () => ({ cwd: dir(), sessionId: 's', abort: new AbortController().signal, messages: [] })

describe('conBase — Bun valida el ledger, no lo crea', () => {
  test('una base nunca migrada rehúsa con el mensaje explícito de inicialización', async () => {
    const p = join(dir(), 'sin-migrar.sqlite3')
    const create = taskTools({ dbPath: p, sessionId: 's' }).find((t) => t.name === 'TaskCreate')!
    await expect(create.run({ subject: 'x' }, ctx())).rejects.toThrow(/store requires initialization or migration/)
  })

  test('una base migrada por agent_store.py opera con normalidad', async () => {
    const p = join(dir(), 'migrada.sqlite3')
    createMigratedTaskDb(p)
    const create = taskTools({ dbPath: p, sessionId: 's' }).find((t) => t.name === 'TaskCreate')!
    const r = await create.run({ subject: 'x' }, ctx())
    expect(r.isError).toBe(false)
  })
})
