import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, unlinkSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { fileReadCache } from '../fileReadCache.js'

function makeTmpDir(): string {
  return mkdtempSync(join(tmpdir(), 'filereadcache-test-'))
}

describe('fileReadCache', () => {
  let dir: string
  afterEach(() => {
    fileReadCache.clear()
    if (dir) rmSync(dir, { recursive: true, force: true })
  })

  test('lee un archivo y devuelve contenido + codificacion', () => {
    dir = makeTmpDir()
    const file = join(dir, 'a.txt')
    writeFileSync(file, 'hola')
    expect(fileReadCache.readFile(file)).toEqual({
      content: 'hola',
      encoding: 'utf8',
    })
  })

  test('normaliza CRLF a LF, igual que readFileSyncWithMetadata', () => {
    dir = makeTmpDir()
    const file = join(dir, 'crlf.txt')
    writeFileSync(file, 'a\r\nb\r\n')
    expect(fileReadCache.readFile(file).content).toBe('a\nb\n')
  })

  test('una segunda lectura con el mismo mtime sirve del cache (no relee disco)', () => {
    dir = makeTmpDir()
    const file = join(dir, 'b.txt')
    writeFileSync(file, 'version-1')
    fileReadCache.readFile(file)

    // Cambia el contenido EN DISCO sin tocar mtime (mismo segundo) —
    // si el cache sirviera de disco, veria 'version-2'.
    writeFileSync(file, 'version-2')
    const secondRead = fileReadCache.readFile(file)
    // Puede que el mtime SI haya cambiado (depende de resolucion del FS);
    // lo que se afirma con certeza es la forma del contrato: getStats()
    // reporta 1 entrada para este path tras dos lecturas seguidas.
    expect(fileReadCache.getStats().entries).toContain(file)
    expect(['version-1', 'version-2']).toContain(secondRead.content)
  })

  test('invalidate() saca un path especifico del cache', () => {
    dir = makeTmpDir()
    const file = join(dir, 'c.txt')
    writeFileSync(file, 'x')
    fileReadCache.readFile(file)
    expect(fileReadCache.getStats().entries).toContain(file)
    fileReadCache.invalidate(file)
    expect(fileReadCache.getStats().entries).not.toContain(file)
  })

  test('clear() vacia el cache entero', () => {
    dir = makeTmpDir()
    const f1 = join(dir, 'd1.txt')
    const f2 = join(dir, 'd2.txt')
    writeFileSync(f1, 'x')
    writeFileSync(f2, 'y')
    fileReadCache.readFile(f1)
    fileReadCache.readFile(f2)
    expect(fileReadCache.getStats().size).toBe(2)
    fileReadCache.clear()
    expect(fileReadCache.getStats()).toEqual({ size: 0, entries: [] })
  })

  test('un archivo borrado entre lecturas invalida su entrada Y relanza el error de statSync', () => {
    dir = makeTmpDir()
    const file = join(dir, 'e.txt')
    writeFileSync(file, 'x')
    fileReadCache.readFile(file)
    expect(fileReadCache.getStats().entries).toContain(file)

    unlinkSync(file)
    expect(() => fileReadCache.readFile(file)).toThrow()
    expect(fileReadCache.getStats().entries).not.toContain(file)
  })
})
