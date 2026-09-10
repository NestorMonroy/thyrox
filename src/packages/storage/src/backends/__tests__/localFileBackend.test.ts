import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { LocalFileStorageBackend } from '../localFileBackend.js'

function makeTmpDir(): string {
  return mkdtempSync(join(tmpdir(), 'localfilebackend-test-'))
}

describe('LocalFileStorageBackend', () => {
  let dir: string
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true })
  })

  test('read() de un path inexistente devuelve null (no lanza)', async () => {
    dir = makeTmpDir()
    const backend = new LocalFileStorageBackend()
    const result = await backend.read(join(dir, 'no-existe.txt'))
    expect(result).toBeNull()
  })

  test('write() crea directorios padre y el contenido se puede leer despues', async () => {
    dir = makeTmpDir()
    const backend = new LocalFileStorageBackend()
    const path = join(dir, 'a', 'b', 'c.txt')
    await backend.write(path, 'hola')
    const result = await backend.read(path)
    expect(Buffer.from(result as Uint8Array).toString('utf8')).toBe('hola')
  })

  test('write() acepta Uint8Array ademas de string', async () => {
    dir = makeTmpDir()
    const backend = new LocalFileStorageBackend()
    const path = join(dir, 'bytes.bin')
    await backend.write(path, new Uint8Array([1, 2, 3]))
    const result = await backend.read(path)
    expect(Array.from(result as Uint8Array)).toEqual([1, 2, 3])
  })

  test('append() concatena sobre contenido existente', async () => {
    dir = makeTmpDir()
    const backend = new LocalFileStorageBackend()
    const path = join(dir, 'append.txt')
    await backend.write(path, 'uno-')
    await backend.append(path, 'dos-')
    await backend.append(path, 'tres')
    const result = await backend.read(path)
    expect(Buffer.from(result as Uint8Array).toString('utf8')).toBe('uno-dos-tres')
  })

  test('append() sobre un path inexistente lo crea (sin fallar por read() previo)', async () => {
    dir = makeTmpDir()
    const backend = new LocalFileStorageBackend()
    const path = join(dir, 'sub', 'nuevo.txt')
    await backend.append(path, 'primero')
    const result = await backend.read(path)
    expect(Buffer.from(result as Uint8Array).toString('utf8')).toBe('primero')
  })

  test('delete() borra un archivo; es idempotente sobre uno ya ausente', async () => {
    dir = makeTmpDir()
    const backend = new LocalFileStorageBackend()
    const path = join(dir, 'x.txt')
    await backend.write(path, 'x')
    await backend.delete(path)
    expect(await backend.read(path)).toBeNull()
    await expect(backend.delete(path)).resolves.toBeUndefined()
  })

  test('list() sobre un archivo devuelve ese unico path', async () => {
    dir = makeTmpDir()
    const backend = new LocalFileStorageBackend()
    const path = join(dir, 'unico.txt')
    await backend.write(path, 'x')
    expect(await backend.list(path)).toEqual([path])
  })

  test('list() sobre un directorio devuelve sus entradas con path completo', async () => {
    dir = makeTmpDir()
    const backend = new LocalFileStorageBackend()
    writeFileSync(join(dir, 'e1.txt'), '1')
    writeFileSync(join(dir, 'e2.txt'), '2')
    const entries = (await backend.list(dir)).sort()
    expect(entries).toEqual([join(dir, 'e1.txt'), join(dir, 'e2.txt')])
  })

  test('list() sobre un path inexistente devuelve [] (no lanza)', async () => {
    dir = makeTmpDir()
    const backend = new LocalFileStorageBackend()
    expect(await backend.list(join(dir, 'nada'))).toEqual([])
  })
})
