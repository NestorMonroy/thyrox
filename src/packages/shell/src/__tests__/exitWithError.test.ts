/**
 * `writeExitCause` (`Om`) y `exitWithError` (`tlo`) de 2.1.275: la causa de
 * salida se anota en `<CLAUDE_JOB_DIR>/exit-cause` y el error sale con 1.
 */
import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { exitWithError, writeExitCause } from '../process.ts'

let dir: string
const previous = process.env.CLAUDE_JOB_DIR

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'exit-cause-'))
  delete process.env.CLAUDE_JOB_DIR
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
  if (previous === undefined) delete process.env.CLAUDE_JOB_DIR
  else process.env.CLAUDE_JOB_DIR = previous
})

describe('writeExitCause', () => {
  test('escribe la causa en exit-cause del directorio dado', () => {
    writeExitCause('session_in_use', dir)
    expect(readFileSync(join(dir, 'exit-cause'), 'utf8')).toBe('session_in_use')
  })

  test('sin directorio ni CLAUDE_JOB_DIR no escribe nada', () => {
    writeExitCause('session_in_use')
    expect(existsSync(join(dir, 'exit-cause'))).toBe(false)
  })

  test('toma CLAUDE_JOB_DIR cuando no recibe directorio', () => {
    process.env.CLAUDE_JOB_DIR = dir
    writeExitCause('otra')
    expect(readFileSync(join(dir, 'exit-cause'), 'utf8')).toBe('otra')
  })
})

describe('exitWithError', () => {
  test('imprime, anota exit_with_error y sale con 1', () => {
    process.env.CLAUDE_JOB_DIR = dir
    const printed = spyOn(console, 'error').mockImplementation(() => {})
    const exit = spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit:${code}`)
    }) as never)
    try {
      expect(() => exitWithError('falló')).toThrow('exit:1')
      expect(printed).toHaveBeenCalledWith('falló')
      expect(readFileSync(join(dir, 'exit-cause'), 'utf8')).toBe('exit_with_error')
    } finally {
      printed.mockRestore()
      exit.mockRestore()
    }
  })
})
