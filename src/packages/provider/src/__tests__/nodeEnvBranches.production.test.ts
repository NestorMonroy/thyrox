/**
 * TASK-THYROX-0324 parte C: `prependUserContext` y `getGitStatus` no
 * ramifican por NODE_ENV. Ninguna de las dos funciones equivalentes del
 * ejecutable 2.1.283 (`Jze` y `bMn`, chunk-csayct82.js) consulta el entorno:
 * la primera antepone el contexto si hay valores; la segunda va directa a
 * comprobar si el directorio es un repositorio git.
 */
import { describe, expect, test } from 'bun:test'
import { mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { prependUserContext } from '../legacy/api.js'
import { getGitStatus } from '../context.js'

describe('prependUserContext bajo NODE_ENV=test', () => {
  test('antepone el contexto como mensaje meta', () => {
    expect(process.env.NODE_ENV).toBe('test')
    const original = [{ type: 'user', message: { content: 'hola' } }] as never[]
    const out = prependUserContext(original, { currentDate: 'hoy' })
    expect(out.length).toBe(2)
    expect(JSON.stringify(out[0])).toContain('# currentDate\\nhoy')
    expect(out[1]).toBe(original[0])
  })

  test('sin valores de contexto devuelve los mensajes intactos', () => {
    const original = [{ type: 'user', message: { content: 'hola' } }] as never[]
    expect(prependUserContext(original, {})).toBe(original)
  })
})

describe('getGitStatus bajo NODE_ENV=test', () => {
  test('en un repositorio git devuelve el resumen, no null', async () => {
    expect(process.env.NODE_ENV).toBe('test')
    const status = await getGitStatus()
    expect(status).not.toBeNull()
    expect(status).toContain('Current branch:')
  })
})
