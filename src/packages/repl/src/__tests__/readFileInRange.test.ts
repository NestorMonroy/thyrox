/**
 * Fidelidad de `readFileInRange` contra el ejecutable 2.1.283
 * (`chunk-5t3x93y6.js`: `T9` entrada, `HB` ruta rápida, `jB` ruta en
 * streaming, `dit` = `FileTooLargeError`). Cada caso afirma una conducta que
 * el ejecutable y este módulo comparten; lo que el ejecutable añade y este
 * módulo no tiene (`maxSelectedBytes`, `handle`, tope duro de 128 MB para
 * ficheros no regulares) queda declarado en el banco de TASK-THYROX-0309 y
 * no se afirma aquí.
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { FileTooLargeError, readFileInRange } from '../readFileInRange.js'

const FAST_PATH_MAX_SIZE = 10 * 1024 * 1024
const UTF8_BOM = '﻿'

let dir: string

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'read-file-in-range-'))
})

afterAll(() => {
  rmSync(dir, { recursive: true, force: true })
})

function fixture(name: string, content: string): string {
  const path = join(dir, name)
  writeFileSync(path, content)
  return path
}

describe('readFileInRange — ruta rápida (fichero regular < 10 MB)', () => {
  test('selecciona [offset, offset + maxLines) y cuenta todas las líneas', async () => {
    const path = fixture('lines.txt', 'a\nb\nc\nd\ne\n')
    const result = await readFileInRange(path, 1, 2)
    expect(result.content).toBe('b\nc')
    expect(result.lineCount).toBe(2)
    // Cinco líneas más la vacía tras el último salto, como cuenta `HB`.
    expect(result.totalLines).toBe(6)
    expect(result.readBytes).toBe(3)
    expect(result.totalBytes).toBe(10)
    expect(result.mtimeMs).toBe(statSync(path).mtimeMs)
  })

  test('quita el BOM y convierte CRLF en LF', async () => {
    const path = fixture('crlf.txt', `${UTF8_BOM}uno\r\ndos\r\ntres`)
    const result = await readFileInRange(path)
    expect(result.content).toBe('uno\ndos\ntres')
    expect(result.lineCount).toBe(3)
    expect(result.totalLines).toBe(3)
  })

  test('sin truncado, un fichero mayor que maxBytes lanza FileTooLargeError', async () => {
    const path = fixture('big.txt', 'x'.repeat(100))
    const failure = await readFileInRange(path, 0, undefined, 50).catch(e => e)
    expect(failure).toBeInstanceOf(FileTooLargeError)
    expect(failure.name).toBe('FileTooLargeError')
    expect(failure.sizeInBytes).toBe(100)
    expect(failure.maxSizeBytes).toBe(50)
    expect(failure.message).toContain('exceeds maximum allowed size')
  })

  test('con truncateOnByteLimit recorta a la última línea completa que cabe', async () => {
    const path = fixture('truncate.txt', 'aaaa\nbbbb\ncccc\n')
    const result = await readFileInRange(path, 0, undefined, 9, undefined, {
      truncateOnByteLimit: true,
    })
    expect(result.content).toBe('aaaa\nbbbb')
    expect(result.lineCount).toBe(2)
    expect(result.truncatedByBytes).toBe(true)
  })

  test('sin recorte, truncatedByBytes no es verdadero', async () => {
    const path = fixture('fits.txt', 'aaaa\nbbbb')
    const result = await readFileInRange(path, 0, undefined, 9, undefined, {
      truncateOnByteLimit: true,
    })
    expect(result.content).toBe('aaaa\nbbbb')
    expect(result.truncatedByBytes).toBeFalsy()
  })

  test('un directorio rehúsa con EISDIR', async () => {
    const path = join(dir, 'a-directory')
    mkdirSync(path)
    const failure = await readFileInRange(path).catch(e => e)
    expect(failure).toBeInstanceOf(Error)
    expect(failure.message).toContain('EISDIR')
  })

  test('una señal ya abortada rehúsa antes de leer', async () => {
    const path = fixture('aborted.txt', 'a\n')
    const controller = new AbortController()
    controller.abort()
    const failure = await readFileInRange(path, 0, 1, undefined, controller.signal).catch(e => e)
    expect(failure).toBeInstanceOf(Error)
  })
})

describe('readFileInRange — ruta en streaming (fichero ≥ 10 MB)', () => {
  test('misma selección, BOM quitado y CRLF convertido que en la ruta rápida', async () => {
    const filler = 'z'.repeat(1023) + '\n'
    const head = `${UTF8_BOM}primera\r\nsegunda\r\n`
    const body = filler.repeat(FAST_PATH_MAX_SIZE / filler.length + 1)
    const path = fixture('large.txt', head + body)
    expect(statSync(path).size).toBeGreaterThanOrEqual(FAST_PATH_MAX_SIZE)
    const result = await readFileInRange(path, 0, 2)
    expect(result.content).toBe('primera\nsegunda')
    expect(result.lineCount).toBe(2)
    expect(result.totalLines).toBe(2 + FAST_PATH_MAX_SIZE / filler.length + 1 + 1)
    expect(result.totalBytes).toBe(statSync(path).size - Buffer.byteLength(UTF8_BOM))
  })

  test('sin truncado, superar maxBytes en streaming lanza FileTooLargeError', async () => {
    const path = join(dir, 'large.txt')
    const failure = await readFileInRange(path, 0, 1, 1024).catch(e => e)
    expect(failure).toBeInstanceOf(FileTooLargeError)
  })
})
