/**
 * Porte de `ccnmt: packages/command-runtime/src/__tests__/errors.test.ts`.
 *
 * Fija el espacio de nombres tipado de errores del command-runtime (V7 §6.5):
 * cada subclase declara un `code` estable y prefijado `COMMAND_RUNTIME_`, y
 * la base preserva `options.cause` y sigue siendo un `Error` real.
 */
import { describe, expect, test } from 'bun:test'
import {
  CommandExecutionError,
  CommandNotFoundError,
  CommandResolutionError,
  CommandRuntimeBaseError,
  HostBindingsError,
} from '../errors.js'

describe('CommandRuntimeBaseError', () => {
  test('guarda code y message', () => {
    const e = new CommandRuntimeBaseError('CR_TEST', 'whoops')
    expect(e.code).toBe('CR_TEST')
    expect(e.message).toBe('whoops')
    expect(e.name).toBe('CommandRuntimeBaseError')
  })
  test('es instanceof Error (así .stack funciona, los instanceof pasan)', () => {
    const e = new CommandRuntimeBaseError('CR_X', 'x')
    expect(e).toBeInstanceOf(Error)
  })
  test('preserva options.cause', () => {
    const cause = new Error('underlying')
    const e = new CommandRuntimeBaseError('CR_X', 'wrap', { cause })
    expect(e.cause).toBe(cause)
  })
})

describe('CommandNotFoundError', () => {
  test('tiene un código de error estable', () => {
    const e = new CommandNotFoundError('cmd missing')
    expect(e.code).toBe('COMMAND_RUNTIME_NOT_FOUND')
    expect(e.name).toBe('CommandRuntimeNotFoundError')
  })
  test('extiende CommandRuntimeBaseError', () => {
    const e = new CommandNotFoundError('x')
    expect(e).toBeInstanceOf(CommandRuntimeBaseError)
  })
})

describe('CommandResolutionError', () => {
  test('tiene un código de error estable', () => {
    const e = new CommandResolutionError('cant resolve')
    expect(e.code).toBe('COMMAND_RUNTIME_RESOLUTION_ERROR')
    expect(e.name).toBe('CommandRuntimeResolutionError')
  })
})

describe('CommandExecutionError', () => {
  test('tiene un código de error estable', () => {
    const e = new CommandExecutionError('exec failed')
    expect(e.code).toBe('COMMAND_RUNTIME_EXECUTION_ERROR')
    expect(e.name).toBe('CommandRuntimeExecutionError')
  })
})

describe('HostBindingsError', () => {
  test('tiene un código de error estable', () => {
    const e = new HostBindingsError('hosts not wired')
    expect(e.code).toBe('COMMAND_RUNTIME_HOST_BINDINGS_ERROR')
    expect(e.name).toBe('CommandRuntimeHostBindingsError')
  })
})

describe('espacio de nombres de código de error', () => {
  test('los códigos de todas las subclases son únicos y llevan el prefijo COMMAND_RUNTIME_', () => {
    const codes = [
      new CommandNotFoundError('x').code,
      new CommandResolutionError('x').code,
      new CommandExecutionError('x').code,
      new HostBindingsError('x').code,
    ]
    expect(new Set(codes).size).toBe(codes.length)
    for (const c of codes) {
      expect(c.startsWith('COMMAND_RUNTIME_')).toBe(true)
    }
  })
})
