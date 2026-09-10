import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import {
  getErrnoCode,
  getFsImplementation,
  getPathsForPermissionCheck,
  NodeFsOperations,
  readFileRange,
  readLinesReverse,
  resolveDeepestExistingAncestorSync,
  safeResolvePath,
  setFsImplementation,
  setOriginalFsImplementation,
  tailFile,
} from '../fsOperations.js'

function makeTmpDir(): string {
  return mkdtempSync(join(tmpdir(), 'fsops-test-'))
}

describe('getErrnoCode', () => {
  test('extrae el codigo de un error con forma NodeJS.ErrnoException', () => {
    expect(getErrnoCode({ code: 'ENOENT' })).toBe('ENOENT')
  })

  test('devuelve undefined si el valor no trae code de tipo string', () => {
    expect(getErrnoCode(new Error('plain'))).toBeUndefined()
    expect(getErrnoCode({ code: 42 })).toBeUndefined()
    expect(getErrnoCode(null)).toBeUndefined()
  })
})

describe('NodeFsOperations — round trip real de disco', () => {
  let dir: string
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true })
  })

  test('mkdirSync + appendFileSync + readFileSync + existsSync + unlinkSync', () => {
    dir = makeTmpDir()
    const nested = join(dir, 'a', 'b')
    NodeFsOperations.mkdirSync(nested)
    expect(NodeFsOperations.existsSync(nested)).toBe(true)

    const file = join(nested, 'f.txt')
    NodeFsOperations.appendFileSync(file, 'hola')
    expect(NodeFsOperations.readFileSync(file, { encoding: 'utf8' })).toBe('hola')

    NodeFsOperations.unlinkSync(file)
    expect(NodeFsOperations.existsSync(file)).toBe(false)
  })

  test('mkdirSync es idempotente ante un directorio ya existente (EEXIST tragado)', () => {
    dir = makeTmpDir()
    NodeFsOperations.mkdirSync(dir)
    expect(() => NodeFsOperations.mkdirSync(dir)).not.toThrow()
  })

  test('readSync lee los primeros N bytes sin agotar el archivo', () => {
    dir = makeTmpDir()
    const file = join(dir, 'f.bin')
    writeFileSync(file, 'ABCDEFGH')
    const { buffer, bytesRead } = NodeFsOperations.readSync(file, { length: 4 })
    expect(bytesRead).toBe(4)
    expect(buffer.subarray(0, 4).toString('utf8')).toBe('ABCD')
  })

  test('isDirEmptySync distingue vacio de no-vacio', () => {
    dir = makeTmpDir()
    const empty = join(dir, 'empty')
    NodeFsOperations.mkdirSync(empty)
    expect(NodeFsOperations.isDirEmptySync(empty)).toBe(true)
    writeFileSync(join(empty, 'x'), '')
    expect(NodeFsOperations.isDirEmptySync(empty)).toBe(false)
  })
})

describe('safeResolvePath', () => {
  let dir: string
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true })
  })

  test('resuelve un symlink vivo y marca isSymlink=true', () => {
    dir = makeTmpDir()
    const target = join(dir, 'target.txt')
    writeFileSync(target, 'contenido')
    const link = join(dir, 'link.txt')
    symlinkSync(target, link)

    const result = safeResolvePath(NodeFsOperations, link)
    expect(result.isSymlink).toBe(true)
    expect(result.isCanonical).toBe(true)
    expect(result.resolvedPath).toBe(target)
  })

  test('un archivo inexistente devuelve la ruta original, isSymlink=false', () => {
    dir = makeTmpDir()
    const missing = join(dir, 'no-existe.txt')
    const result = safeResolvePath(NodeFsOperations, missing)
    expect(result).toEqual({
      resolvedPath: missing,
      isSymlink: false,
      isCanonical: false,
    })
  })

  test('una ruta UNC (//host/share) se rechaza SIN tocar el filesystem', () => {
    const result = safeResolvePath(NodeFsOperations, '//host/share/file')
    expect(result).toEqual({
      resolvedPath: '//host/share/file',
      isSymlink: false,
      isCanonical: false,
    })
  })
})

describe('resolveDeepestExistingAncestorSync', () => {
  let dir: string
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true })
  })

  test('sin ningun symlink en la cadena de ancestros, devuelve undefined', () => {
    dir = makeTmpDir()
    const newFile = join(dir, 'nuevo.txt')
    expect(
      resolveDeepestExistingAncestorSync(NodeFsOperations, newFile),
    ).toBeUndefined()
  })

  test('con un symlink de directorio padre VIVO, resuelve el destino real', () => {
    dir = makeTmpDir()
    const realDir = join(dir, 'real')
    NodeFsOperations.mkdirSync(realDir)
    const linkedDir = join(dir, 'linked')
    symlinkSync(realDir, linkedDir)

    const newFileThroughLink = join(linkedDir, 'nuevo.txt')
    const resolved = resolveDeepestExistingAncestorSync(
      NodeFsOperations,
      newFileThroughLink,
    )
    expect(resolved).toBe(join(realDir, 'nuevo.txt'))
  })

  test('un symlink de archivo COLGANTE (target inexistente) se resuelve via readlink', () => {
    dir = makeTmpDir()
    const danglingTarget = join(dir, 'no-existe-nunca.txt')
    const link = join(dir, 'dangling-link.txt')
    symlinkSync(danglingTarget, link)

    const resolved = resolveDeepestExistingAncestorSync(NodeFsOperations, link)
    expect(resolved).toBe(danglingTarget)
  })
})

describe('getPathsForPermissionCheck', () => {
  let dir: string
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true })
  })

  test('sin symlinks, el set contiene solo la ruta original', () => {
    dir = makeTmpDir()
    const file = join(dir, 'plano.txt')
    writeFileSync(file, 'x')
    expect(getPathsForPermissionCheck(file)).toEqual([file])
  })

  test('con un symlink, el set incluye el origen Y el destino resuelto', () => {
    dir = makeTmpDir()
    const target = join(dir, 'destino.txt')
    writeFileSync(target, 'x')
    const link = join(dir, 'origen.txt')
    symlinkSync(target, link)

    const paths = getPathsForPermissionCheck(link)
    expect(paths).toContain(link)
    expect(paths).toContain(target)
  })
})

describe('setFsImplementation / getFsImplementation / setOriginalFsImplementation', () => {
  afterEach(() => {
    setOriginalFsImplementation()
  })

  test('getFsImplementation devuelve NodeFsOperations por defecto', () => {
    expect(getFsImplementation()).toBe(NodeFsOperations)
  })

  test('setFsImplementation sustituye la implementacion activa', () => {
    const fake = { ...NodeFsOperations, cwd: () => '/fake' }
    setFsImplementation(fake)
    expect(getFsImplementation().cwd()).toBe('/fake')
  })

  test('setOriginalFsImplementation restaura NodeFsOperations', () => {
    setFsImplementation({ ...NodeFsOperations, cwd: () => '/fake' })
    setOriginalFsImplementation()
    expect(getFsImplementation()).toBe(NodeFsOperations)
  })
})

describe('readFileRange / tailFile / readLinesReverse', () => {
  let dir: string
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true })
  })

  test('readFileRange lee un tramo intermedio del archivo', async () => {
    dir = makeTmpDir()
    const file = join(dir, 'range.txt')
    writeFileSync(file, '0123456789')
    const result = await readFileRange(file, 2, 3)
    expect(result).toEqual({ content: '234', bytesRead: 3, bytesTotal: 10 })
  })

  test('readFileRange devuelve null si offset >= tamano', async () => {
    dir = makeTmpDir()
    const file = join(dir, 'range2.txt')
    writeFileSync(file, 'abc')
    expect(await readFileRange(file, 10, 5)).toBeNull()
  })

  test('tailFile devuelve el archivo completo si es mas chico que maxBytes', async () => {
    dir = makeTmpDir()
    const file = join(dir, 'tail1.txt')
    writeFileSync(file, 'corto')
    const result = await tailFile(file, 100)
    expect(result).toEqual({ content: 'corto', bytesRead: 5, bytesTotal: 5 })
  })

  test('tailFile devuelve solo los ultimos maxBytes', async () => {
    dir = makeTmpDir()
    const file = join(dir, 'tail2.txt')
    writeFileSync(file, '0123456789')
    const result = await tailFile(file, 4)
    expect(result.content).toBe('6789')
    expect(result.bytesTotal).toBe(10)
  })

  test('readLinesReverse recorre las lineas en orden inverso', async () => {
    dir = makeTmpDir()
    const file = join(dir, 'lines.txt')
    writeFileSync(file, 'uno\ndos\ntres\n')
    const lines: string[] = []
    for await (const line of readLinesReverse(file)) {
      lines.push(line)
    }
    expect(lines).toEqual(['tres', 'dos', 'uno'])
  })

  test('readLinesReverse preserva multibyte UTF-8 partido por el limite de chunk', async () => {
    dir = makeTmpDir()
    const file = join(dir, 'utf8.txt')
    // Fuerza un archivo mayor a 4KB (CHUNK_SIZE) para ejercitar el borde
    // de chunk, con emojis multibyte cerca del limite.
    const filler = 'x'.repeat(4090)
    writeFileSync(file, `primera\n${filler}segunda-emoji-🎉\ntercera\n`)
    const lines: string[] = []
    for await (const line of readLinesReverse(file)) {
      lines.push(line)
    }
    expect(lines[0]).toBe('tercera')
    expect(lines[1]).toBe(`${filler}segunda-emoji-🎉`)
    expect(lines[2]).toBe('primera')
  })
})
