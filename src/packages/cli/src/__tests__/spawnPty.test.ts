import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test'
import { closeSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  classifyBreadcrumbOpenErrno,
  describeCwdGone,
  resolveSpawnStdio,
  spawnPtyHost,
} from '../bg/spawnPty.js'

describe('describeCwdGone', () => {
  test('formatea el mensaje exacto de R9n [11493,11579)', () => {
    expect(describeCwdGone('/no/existe')).toBe(
      'working directory no longer exists or is not accessible: /no/existe',
    )
  })
})

describe('classifyBreadcrumbOpenErrno', () => {
  test.each(['ENOENT', 'ENOSPC', 'EACCES', 'EROFS'])('clasifica %s', (code) => {
    const err = Object.assign(new Error('boom'), { code })
    expect(classifyBreadcrumbOpenErrno(err)).toBe(code)
  })

  test('un errno fuera de la clasificación de x9n no se clasifica', () => {
    const err = Object.assign(new Error('boom'), { code: 'EISDIR' })
    expect(classifyBreadcrumbOpenErrno(err)).toBeUndefined()
  })

  test('un valor sin .code no se clasifica', () => {
    expect(classifyBreadcrumbOpenErrno(new Error('boom'))).toBeUndefined()
    expect(classifyBreadcrumbOpenErrno('boom')).toBeUndefined()
  })
})

describe('resolveSpawnStdio', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'spawn-pty-stdio-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  test('abre el breadcrumb y devuelve su fd sin aviso cuando el directorio existe', () => {
    const result = resolveSpawnStdio(join(dir, 'pty.sock.err'))
    expect(result.warning).toBeUndefined()
    expect(typeof result.stdio[2]).toBe('number')
    closeSync(result.stdio[2] as number)
  })

  test('degrada a stdio ignorado con aviso clasificado cuando el directorio del breadcrumb no existe (ENOENT)', () => {
    const result = resolveSpawnStdio(join(dir, 'no-existe', 'pty.sock.err'))
    expect(result.stdio).toEqual(['ignore', 'ignore', 'ignore'])
    expect(result.warning).toContain('ENOENT')
  })

  test('un fallo no clasificado (EISDIR) se relanza, no se degrada', () => {
    // Abrir un directorio con flag "a" falla con EISDIR — fuera de la
    // clasificación de x9n (ENOENT/ENOSPC/EACCES/EROFS) — así que x9n lo
    // relanza (`if(f!=="ENOENT"&&...)throw g`).
    expect(() => resolveSpawnStdio(dir)).toThrow()
  })
})

describe('spawnPtyHost — cwd inexistente', () => {
  let jobDir: string
  let parent: string

  beforeEach(() => {
    parent = mkdtempSync(join(tmpdir(), 'spawn-pty-cwd-'))
    jobDir = join(parent, 'job')
  })

  afterEach(() => {
    rmSync(parent, { recursive: true, force: true })
  })

  test('rehúsa sin spawnear, limpia jobDir y sale con 1', () => {
    const missingCwd = join(parent, 'does-not-exist')
    const exit = spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit:${code}`)
    }) as never)
    const stderrWrite = spyOn(process.stderr, 'write').mockImplementation(() => true)
    try {
      expect(() =>
        spawnPtyHost({
          short: 'r0000001',
          jobDir,
          flags: [],
          directive: 'hola',
          cwd: missingCwd,
          quiet: true,
        }),
      ).toThrow('exit:1')
      expect(stderrWrite).toHaveBeenCalled()
      const written = stderrWrite.mock.calls.map((c) => String(c[0])).join('')
      expect(written).toContain(describeCwdGone(missingCwd))
    } finally {
      exit.mockRestore()
      stderrWrite.mockRestore()
    }
  })
})
