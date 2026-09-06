import { afterEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, utimesSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { findModifiedFiles, getEnvironmentKind } from '../outputsScanner.js'

function makeTmpDir(): string {
  return mkdtempSync(join(tmpdir(), 'outputsscanner-test-'))
}

describe('getEnvironmentKind', () => {
  const original = process.env.CLAUDE_CODE_ENVIRONMENT_KIND
  afterEach(() => {
    if (original === undefined) delete process.env.CLAUDE_CODE_ENVIRONMENT_KIND
    else process.env.CLAUDE_CODE_ENVIRONMENT_KIND = original
  })

  test("'byoc' se reconoce", () => {
    process.env.CLAUDE_CODE_ENVIRONMENT_KIND = 'byoc'
    expect(getEnvironmentKind()).toBe('byoc')
  })

  test("'anthropic_cloud' se reconoce", () => {
    process.env.CLAUDE_CODE_ENVIRONMENT_KIND = 'anthropic_cloud'
    expect(getEnvironmentKind()).toBe('anthropic_cloud')
  })

  test('un valor no reconocido devuelve null', () => {
    process.env.CLAUDE_CODE_ENVIRONMENT_KIND = 'bridge'
    expect(getEnvironmentKind()).toBeNull()
  })

  test('sin la variable definida devuelve null', () => {
    delete process.env.CLAUDE_CODE_ENVIRONMENT_KIND
    expect(getEnvironmentKind()).toBeNull()
  })
})

describe('findModifiedFiles', () => {
  let dir: string
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true })
  })

  test('un directorio inexistente devuelve [] (no lanza)', async () => {
    dir = makeTmpDir()
    const missing = join(dir, 'no-existe')
    expect(await findModifiedFiles({ turnStartTime: 0 }, missing)).toEqual([])
  })

  test('un directorio vacio devuelve []', async () => {
    dir = makeTmpDir()
    expect(await findModifiedFiles({ turnStartTime: 0 }, dir)).toEqual([])
  })

  test('sólo devuelve archivos con mtime >= turnStartTime — el bug de NaN NO reaparece', async () => {
    dir = makeTmpDir()
    const oldFile = join(dir, 'viejo.txt')
    const newFile = join(dir, 'nuevo.txt')
    writeFileSync(oldFile, 'x')
    writeFileSync(newFile, 'y')

    const past = new Date(Date.now() - 60_000)
    const future = new Date(Date.now() + 60_000)
    utimesSync(oldFile, past, past)
    utimesSync(newFile, future, future)

    const turnStartTime = { turnStartTime: Date.now() }
    const result = await findModifiedFiles(turnStartTime, dir)
    expect(result).toEqual([newFile])
  })

  test('escanea subdirectorios recursivamente', async () => {
    dir = makeTmpDir()
    const nested = join(dir, 'a', 'b')
    mkdirSync(nested, { recursive: true })
    const file = join(nested, 'anidado.txt')
    writeFileSync(file, 'x')
    const future = new Date(Date.now() + 60_000)
    utimesSync(file, future, future)

    const result = await findModifiedFiles({ turnStartTime: Date.now() }, dir)
    expect(result).toEqual([file])
  })

  test('los symlinks se EXCLUYEN por seguridad, aunque su mtime califique', async () => {
    dir = makeTmpDir()
    const real = join(dir, 'real.txt')
    writeFileSync(real, 'x')
    const link = join(dir, 'enlace.txt')
    symlinkSync(real, link)
    const future = new Date(Date.now() + 60_000)
    utimesSync(real, future, future)

    const result = await findModifiedFiles({ turnStartTime: Date.now() }, dir)
    // 'real.txt' SI califica (es un archivo normal modificado); 'enlace.txt'
    // (symlink) se filtra aunque apunte al mismo contenido modificado.
    expect(result).toEqual([real])
  })
})
