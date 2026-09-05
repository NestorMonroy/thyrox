/**
 * Herramientas de tablero `Task*` (T-019, corregidas en T-061).
 *
 * Fuente del porte: el esquema de `.claude/agent-results/`, declarado una sola
 * vez para que el harness sea autónomo. El control que discrimina es que las
 * herramientas NO mueran con `no such table: tasks` en una base que no sea la
 * del proyecto — el defecto que T-061 cerró.
 */

import { describe, expect, test } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { taskTools } from '../src/tools/tasks.ts'

const dir = () => mkdtempSync(join(tmpdir(), 'todo-'))
const ctx = () => ({ cwd: dir(), sessionId: 'x', abort: new AbortController().signal, messages: [] })
const tablero = () => join(dir(), 'tablero.sqlite3')
const util = (dbPath: string, nombre: string, sessionId = 'sesion') =>
  taskTools({ dbPath, sessionId }).find((t) => t.name === nombre)!

describe('TodoWrite — la lista efímera del turno (T-063)', () => {
  test('la declara una de las 31 definiciones de agente, y por eso existe', () => {
    expect(taskTools({ dbPath: ':memory:' }).map((t) => t.name)).toContain('TodoWrite')
    expect(util(':memory:', 'TodoWrite').permission).toBe('write')
  })

  test('escribe la lista entera de una vez: es su diferencia con TaskCreate', async () => {
    const db = tablero()
    const r = await util(db, 'TodoWrite').run(
      { todos: [
        { content: 'medir el corpus', status: 'completed', activeForm: 'midiendo el corpus' },
        { content: 'escribir el puente', status: 'in_progress', activeForm: 'escribiendo el puente' },
      ] },
      ctx(),
    )
    expect(r.isError).toBe(false)
    const listadas = JSON.parse((await util(db, 'TodoRead').run({}, ctx())).content)
    expect(listadas.map((t: { content: string }) => t.content)).toEqual(['medir el corpus', 'escribir el puente'])
    expect(listadas[1].activeForm).toBe('escribiendo el puente')
  })

  test('reemplaza, no acumula — la segunda llamada deja sólo lo que trae', async () => {
    const db = tablero()
    const w = util(db, 'TodoWrite')
    await w.run({ todos: [{ content: 'vieja', status: 'pending', activeForm: 'haciendo la vieja' }] }, ctx())
    await w.run({ todos: [{ content: 'nueva', status: 'pending', activeForm: 'haciendo la nueva' }] }, ctx())
    const listadas = JSON.parse((await util(db, 'TodoRead').run({}, ctx())).content)
    expect(listadas.map((t: { content: string }) => t.content)).toEqual(['nueva'])
  })

  test('NO toca el tablero durable: 995 filas reales no pueden depender de la buena fe', async () => {
    const db = tablero()
    const crear = util(db, 'TaskCreate')
    await crear.run({ subject: 'tarea durable del proyecto' }, ctx())
    await crear.run({ subject: 'otra durable' }, ctx())

    await util(db, 'TodoWrite').run({ todos: [{ content: 'efímera', status: 'pending', activeForm: 'en ello' }] }, ctx())

    const durables = JSON.parse((await util(db, 'TaskList').run({}, ctx())).content)
    expect(durables.map((t: { subject: string }) => t.subject))
      .toEqual(['tarea durable del proyecto', 'otra durable'])
  })

  test('una lista vacía la limpia, y eso es distinto de no haber escrito nunca', async () => {
    const db = tablero()
    await util(db, 'TodoWrite').run({ todos: [{ content: 'algo', status: 'pending', activeForm: 'en ello' }] }, ctx())
    const r = await util(db, 'TodoWrite').run({ todos: [] }, ctx())
    expect(r.isError).toBe(false)
    expect(JSON.parse((await util(db, 'TodoRead').run({}, ctx())).content)).toEqual([])
  })

  test('un estado fuera del vocabulario se rechaza nombrando los válidos', async () => {
    const r = await util(tablero(), 'TodoWrite').run(
      { todos: [{ content: 'x', status: 'casi', activeForm: 'y' }] }, ctx(),
    )
    expect(r.isError).toBe(true)
    expect(r.content).toContain('in_progress')
  })

  test('un todo sin activeForm se rechaza: el gerundio es lo que la lista muestra', async () => {
    const r = await util(tablero(), 'TodoWrite').run({ todos: [{ content: 'x', status: 'pending' }] }, ctx())
    expect(r.isError).toBe(true)
    expect(r.content).toContain('activeForm')
  })

  test('cada sesión tiene la suya', async () => {
    const db = tablero()
    await util(db, 'TodoWrite', 'a').run({ todos: [{ content: 'de a', status: 'pending', activeForm: 'en a' }] }, ctx())
    await util(db, 'TodoWrite', 'b').run({ todos: [{ content: 'de b', status: 'pending', activeForm: 'en b' }] }, ctx())
    const enA = JSON.parse((await util(db, 'TodoRead', 'a').run({}, ctx())).content)
    expect(enA.map((t: { content: string }) => t.content)).toEqual(['de a'])
  })
})
