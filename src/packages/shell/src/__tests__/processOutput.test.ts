/**
 * Escritura a stdout/stderr y manejo de errores de salida — `v`, `dr`, `OX`,
 * `pkt`/`pur` de 2.1.275 (`chunk-q4s29khb.js`).
 */
import { describe, expect, test } from 'bun:test'
import { EventEmitter } from 'node:events'
import {
  getStdoutOutstandingBytes,
  handleDeadStreamErrors,
  isDeadStreamError,
  writeToStream,
} from '../process.ts'

function fakeStream(over: Partial<{ destroyed: boolean; writableEnded: boolean }> = {}) {
  const writes: unknown[] = []
  const s = Object.assign(new EventEmitter(), {
    destroyed: false,
    writableEnded: false,
    ...over,
    write(chunk: unknown, cb?: () => void) { writes.push(chunk); cb?.(); return true },
    destroy() { (s as { destroyed: boolean }).destroyed = true },
  })
  return { s, writes }
}

describe('writeToStream (v)', () => {
  test('escribe si el stream vive', () => {
    const { s, writes } = fakeStream()
    expect(writeToStream(s as never, 'x')).toBe(true)
    expect(writes).toEqual(['x'])
  })
  test('no escribe en un stream destruido ni terminado', () => {
    const a = fakeStream({ destroyed: true })
    const b = fakeStream({ writableEnded: true })
    expect(writeToStream(a.s as never, 'x')).toBe(false)
    expect(writeToStream(b.s as never, 'x')).toBe(false)
    expect(a.writes).toEqual([])
    expect(b.writes).toEqual([])
  })
})

describe('handleDeadStreamErrors (pkt)', () => {
  test('un código de stream muerto destruye el stream y avisa', () => {
    const { s } = fakeStream()
    const seen: string[] = []
    handleDeadStreamErrors(s as never, code => seen.push(code))
    s.emit('error', Object.assign(new Error('pipe'), { code: 'EPIPE' }))
    expect(seen).toEqual(['EPIPE'])
    expect(s.destroyed).toBe(true)
  })
  test('otro código no destruye', () => {
    const { s } = fakeStream()
    const seen: string[] = []
    handleDeadStreamErrors(s as never, code => seen.push(code))
    s.emit('error', Object.assign(new Error('x'), { code: 'EACCES' }))
    expect(seen).toEqual([])
    expect(s.destroyed).toBe(false)
  })
})

describe('isDeadStreamError (HQe)', () => {
  test('los códigos de stream muerto y de conexión rota', () => {
    for (const code of ['EPIPE', 'EIO', 'ENXIO', 'EBADF', 'EISDIR', 'ENOTCONN', 'ECONNRESET'])
      expect(isDeadStreamError({ code })).toBe(true)
    expect(isDeadStreamError({ code: 'ENOENT' })).toBe(false)
    expect(isDeadStreamError(null)).toBe(false)
  })
})

describe('getStdoutOutstandingBytes', () => {
  test('es un número no negativo', () => {
    expect(getStdoutOutstandingBytes()).toBeGreaterThanOrEqual(0)
  })
})
