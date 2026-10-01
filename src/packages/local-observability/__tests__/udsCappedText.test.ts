/**
 * Lectores de archivo con tope y el resumen de una línea: `cl`, `rLo`, `OP`,
 * `oLo`, `lfn` y `aFt` (`chunk-q8a07cv0.js`), con `YH` (`chunk-pbnxt79v.js`)
 * y `ot` (`chunk-8w2y72gy.js`) de 2.1.283.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import * as fs from 'node:fs'
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import * as fsPromises from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  firstLineSummary,
  oneLineSummary,
  readCappedFile,
  readCappedFileSync,
  readCappedWith,
  readCappedWithSync,
  replaceControls,
  truncateToWidth,
} from '../src/uds/cappedText.ts'

let dir: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'capped-'))
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

describe('lectores con tope', () => {
  test('cl/rLo leen un archivo regular dentro del tope; si no, null', async () => {
    const file = join(dir, 'a.txt')
    writeFileSync(file, 'hola')
    expect(await readCappedFile(file, 4)).toBe('hola')
    expect(await readCappedFile(file, 3)).toBeNull()
    expect(readCappedFileSync(file, 4)).toBe('hola')
    expect(readCappedFileSync(file, 3)).toBeNull()
    expect(await readCappedFile(join(dir, 'no'), 10)).toBeNull()
    expect(readCappedFileSync(dir, 10)).toBeNull()
  })

  test('cl/rLo no siguen un enlace simbólico', async () => {
    const file = join(dir, 'a.txt')
    writeFileSync(file, 'hola')
    symlinkSync(file, join(dir, 'l'))
    expect(await readCappedFile(join(dir, 'l'), 10)).toBeNull()
    expect(readCappedFileSync(join(dir, 'l'), 10)).toBeNull()
  })

  test('OP/oLo usan el sistema de archivos dado, siguen enlaces y avisan del rechazo', async () => {
    const file = join(dir, 'a.txt')
    writeFileSync(file, 'hola')
    symlinkSync(file, join(dir, 'l'))
    expect(await readCappedWith(fsPromises, join(dir, 'l'), 10)).toBe('hola')
    let rejectedSize = -1
    expect(await readCappedWith(fsPromises, file, 2, stats => void (rejectedSize = stats.size))).toBeNull()
    expect(rejectedSize).toBe(4)
    expect(readCappedWithSync(fs, join(dir, 'l'), 10)).toBe('hola')
    expect(readCappedWithSync(fs, file, 2)).toBeNull()
    await expect(readCappedWith(fsPromises, join(dir, 'no'), 10)).rejects.toThrow()
  })
})

describe('resumen de una línea', () => {
  test('replaceControls (YH) cambia controles e invisibles; con joiners de emoji los conserva dentro de palabra', () => {
    expect(replaceControls('a\u0007​b', ' ')).toBe('a b')
    expect(replaceControls('a\nb', ' ', { keepNewlines: true })).toBe('a\nb')
    expect(replaceControls('👨‍👩 ‍x', ' ', { keepEmojiJoiners: true })).toBe('👨‍👩 x')
    expect(replaceControls('\x1b[31mrojo\x1b[0m', ' ')).toBe('rojo')
  })

  test('truncateToWidth (ot) mide el ancho de celdas y corta por grafemas', () => {
    expect(truncateToWidth('abc', 3)).toBe('abc')
    expect(truncateToWidth('abcd', 3)).toBe('ab…')
    expect(truncateToWidth('漢字漢', 5)).toBe('漢字…')
    expect(truncateToWidth('abc', 1)).toBe('…')
  })

  test('firstLineSummary (lfn) salta las líneas vacías tras transformar y corta a 512', () => {
    const identity = (text: string) => text
    expect(firstLineSummary('\n  \nsegunda  línea\ntercera', identity)).toBe('segunda línea')
    expect(firstLineSummary('\n\n', identity)).toBe('')
    expect(firstLineSummary('x'.repeat(600), identity)).toBe(`${'x'.repeat(512)}…`)
    expect(firstLineSummary(`${' '.repeat(2049)}\nb`, identity)).toBe('…')
  })

  test('oneLineSummary (aFt) aplica controles fuera y ancho 120', () => {
    expect(oneLineSummary('\n\u0007hola\u0007mundo')).toBe('hola mundo')
    expect(oneLineSummary('y'.repeat(130))).toBe(`${'y'.repeat(119)}…`)
    expect(oneLineSummary('\n')).toBe('')
  })
})
