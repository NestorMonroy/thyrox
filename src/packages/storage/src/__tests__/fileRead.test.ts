import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import {
  detectEncodingForResolvedPath,
  detectLineEndingsForString,
  readFileSync,
  readFileSyncWithMetadata,
} from '../fileRead.js'

function makeTmpDir(): string {
  return mkdtempSync(join(tmpdir(), 'fileread-test-'))
}

describe('detectEncodingForResolvedPath', () => {
  let dir: string
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true })
  })

  test('un archivo vacio devuelve utf8 (evita el bug de emojis/CJK corruptos)', () => {
    dir = makeTmpDir()
    const file = join(dir, 'empty.txt')
    writeFileSync(file, '')
    expect(detectEncodingForResolvedPath(file)).toBe('utf8')
  })

  test('un BOM UTF-16LE (FF FE) se detecta', () => {
    dir = makeTmpDir()
    const file = join(dir, 'utf16le.txt')
    writeFileSync(file, Buffer.from([0xff, 0xfe, 0x41, 0x00]))
    expect(detectEncodingForResolvedPath(file)).toBe('utf16le')
  })

  test('un BOM UTF-8 (EF BB BF) se detecta como utf8', () => {
    dir = makeTmpDir()
    const file = join(dir, 'utf8bom.txt')
    writeFileSync(file, Buffer.from([0xef, 0xbb, 0xbf, 0x41]))
    expect(detectEncodingForResolvedPath(file)).toBe('utf8')
  })

  test('contenido normal (sin BOM) devuelve utf8', () => {
    dir = makeTmpDir()
    const file = join(dir, 'normal.txt')
    writeFileSync(file, 'hola mundo')
    expect(detectEncodingForResolvedPath(file)).toBe('utf8')
  })
})

describe('detectLineEndingsForString', () => {
  test('mayoria CRLF devuelve CRLF', () => {
    expect(detectLineEndingsForString('a\r\nb\r\nc\n')).toBe('CRLF')
  })

  test('mayoria LF devuelve LF', () => {
    expect(detectLineEndingsForString('a\nb\nc\r\n')).toBe('LF')
  })

  test('empate (mismo conteo) devuelve LF — crlfCount > lfCount es falso en empate', () => {
    expect(detectLineEndingsForString('a\r\nb\n')).toBe('LF')
  })

  test('sin ningun salto de linea devuelve LF (ambos conteos en cero)', () => {
    expect(detectLineEndingsForString('sin saltos')).toBe('LF')
  })
})

describe('readFileSyncWithMetadata / readFileSync', () => {
  let dir: string
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true })
  })

  test('normaliza CRLF a LF y reporta la codificacion/line-ending original', () => {
    dir = makeTmpDir()
    const file = join(dir, 'crlf.txt')
    writeFileSync(file, 'linea1\r\nlinea2\r\n')

    const result = readFileSyncWithMetadata(file)
    expect(result.content).toBe('linea1\nlinea2\n')
    expect(result.encoding).toBe('utf8')
    expect(result.lineEndings).toBe('CRLF')
  })

  test('readFileSync devuelve solo el contenido normalizado', () => {
    dir = makeTmpDir()
    const file = join(dir, 'plain.txt')
    writeFileSync(file, 'una linea\notra linea\n')
    expect(readFileSync(file)).toBe('una linea\notra linea\n')
  })
})
