/**
 * Tests del puerto de `execFileNoThrow`/`execFileNoThrowWithCwd`
 * (`../execFileNoThrow.js`), sobre `node:child_process.execFile`.
 *
 * Cubre el contrato "nunca lanza": éxito, ENOENT, código de salida distinto
 * de cero con stderr, y el envío de `input` por stdin.
 */
import { describe, expect, test } from 'bun:test'
import { execFileNoThrow, execFileNoThrowWithCwd } from '../execFileNoThrow.js'

describe('execFileNoThrow — éxito', () => {
  test('echo captura stdout, code 0, sin error', async () => {
    const result = await execFileNoThrow('echo', ['hello'])
    expect(result.code).toBe(0)
    expect(result.stdout.trim()).toBe('hello')
    expect(result.error).toBeUndefined()
  })
})

describe('execFileNoThrow — ENOENT', () => {
  test('binario inexistente resuelve (no lanza) con code !== 0', async () => {
    const result = await execFileNoThrow('definitely-not-a-real-binary-xyz', [])
    expect(result.code).not.toBe(0)
    expect(typeof result.error).toBe('string')
  })
})

describe('execFileNoThrow — código de salida distinto de cero', () => {
  test('sh -c "exit 3" preserva el code y captura stderr', async () => {
    const result = await execFileNoThrow('sh', [
      '-c',
      'echo oops 1>&2; exit 3',
    ])
    expect(result.code).toBe(3)
    expect(result.stderr.trim()).toBe('oops')
  })
})

describe('execFileNoThrowWithCwd — stdin', () => {
  test('input se escribe a stdin del hijo y cat lo devuelve', async () => {
    const result = await execFileNoThrowWithCwd('cat', [], {
      input: 'piped-data',
    })
    expect(result.code).toBe(0)
    expect(result.stdout).toBe('piped-data')
  })

  test('respeta el cwd pasado en options', async () => {
    const result = await execFileNoThrowWithCwd('pwd', [], { cwd: '/tmp' })
    expect(result.code).toBe(0)
    expect(result.stdout.trim()).toBe('/tmp')
  })
})
