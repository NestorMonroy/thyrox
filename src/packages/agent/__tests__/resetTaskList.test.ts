/**
 * `e2r` de 2.1.275 (`chunk-zkqn5wez.js`): vaciar una lista de tareas sólo si
 * todas están completadas, sin que un id se reutilice después.
 */
import { afterAll, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'

const base = mkdtempSync(join(resolve(import.meta.dir, '../../../../.claude/cache'), 'tasks-'))
process.env.CLAUDE_CONFIG_DIR = base
const { createTask, getTasksDir, listTasks, resetTaskList, updateTask } = await import('../tasks.ts')
afterAll(() => rmSync(base, { recursive: true, force: true }))

let n = 0
let list = ''
beforeEach(() => {
  list = `lista-${++n}`
})
const task = (subject: string) => ({ subject, description: '', status: 'pending' as const, blocks: [], blockedBy: [] })

describe('resetTaskList', () => {
  test('con una tarea sin completar no toca nada', async () => {
    await createTask(list, task('a'))
    expect(await resetTaskList(list)).toBe(false)
    expect(await listTasks(list)).toHaveLength(1)
  })
  test('todas completadas: borra las tareas y guarda la marca de agua', async () => {
    const a = await createTask(list, task('a'))
    const b = await createTask(list, task('b'))
    await updateTask(list, a, { status: 'completed' })
    await updateTask(list, b, { status: 'completed' })
    expect(await resetTaskList(list)).toBe(true)
    expect(await listTasks(list)).toHaveLength(0)
    expect(readFileSync(join(getTasksDir(list), '.highwatermark'), 'utf8').trim()).toBe('2')
    expect(existsSync(join(getTasksDir(list), '.lock'))).toBe(true)
  })
  test('el id siguiente no reutiliza los borrados', async () => {
    const a = await createTask(list, task('a'))
    await updateTask(list, a, { status: 'completed' })
    await resetTaskList(list)
    expect(await createTask(list, task('b'))).toBe('2')
  })
  test('una lista vacía se resetea', async () => {
    expect(await resetTaskList(list)).toBe(true)
  })
})
