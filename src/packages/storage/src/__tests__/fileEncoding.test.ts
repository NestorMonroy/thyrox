import { afterEach, describe, expect, spyOn, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { detectFileEncoding } from '../fileEncoding.js'
import {
  getFsImplementation,
  NodeFsOperations,
  setFsImplementation,
  setOriginalFsImplementation,
} from '../fsOperations.js'

function makeTmpDir(): string {
  return mkdtempSync(join(tmpdir(), 'fileencoding-test-'))
}

describe('detectFileEncoding', () => {
  let dir: string
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true })
    setOriginalFsImplementation()
  })

  test('un archivo real sin BOM devuelve utf8', () => {
    dir = makeTmpDir()
    const file = join(dir, 'f.txt')
    writeFileSync(file, 'contenido plano')
    expect(detectFileEncoding(file)).toBe('utf8')
  })

  test('un archivo INEXISTENTE (ENOENT) cae al fallback utf8, SIN pasar por logError', () => {
    dir = makeTmpDir()
    const errorSpy = spyOn(console, 'error')
    const missing = join(dir, 'no-existe.txt')
    expect(detectFileEncoding(missing)).toBe('utf8')
    // ENOENT es "fs inaccesible": va por logForDebugging, no por logError.
    // logForDebugging tambien usa console.error como sink por defecto, asi
    // que se verifica el MENSAJE, no la mera invocacion.
    const calls = errorSpy.mock.calls.map(args => String(args[0]))
    expect(calls.some(m => m.includes('detectFileEncoding failed for expected reason'))).toBe(true)
    errorSpy.mockRestore()
  })

  test('un error NO relacionado con fs (p.ej. corrupcion de datos) SI pasa por logError', () => {
    dir = makeTmpDir()
    const file = join(dir, 'f2.txt')
    writeFileSync(file, 'x')

    // Fuerza que readSync lance un error sin `code` — no matchea ningun
    // caso de isFsInaccessible, asi que toma la rama logError().
    const fake = {
      ...NodeFsOperations,
      readSync(): never {
        throw new Error('boom sin code')
      },
    }
    setFsImplementation(fake)
    const errorSpy = spyOn(console, 'error')

    expect(detectFileEncoding(file)).toBe('utf8')
    expect(errorSpy).toHaveBeenCalledWith(new Error('boom sin code'))
    errorSpy.mockRestore()
  })

  test('usa la implementacion de fs activa (getFsImplementation), no node:fs directo', () => {
    dir = makeTmpDir()
    let readSyncCalls = 0
    const fake = {
      ...NodeFsOperations,
      readSync(...args: Parameters<typeof NodeFsOperations.readSync>) {
        readSyncCalls++
        return NodeFsOperations.readSync(...args)
      },
    }
    setFsImplementation(fake)
    expect(getFsImplementation()).toBe(fake)
    const file = join(dir, 'f3.txt')
    writeFileSync(file, 'x')
    detectFileEncoding(file)
    expect(readSyncCalls).toBe(1)
  })
})
