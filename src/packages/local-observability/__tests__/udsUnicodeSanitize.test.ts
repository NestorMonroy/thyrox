/**
 * Retirada y escape de caracteres de formato: `sf`, `E`, `R8e` y `t6n`
 * (`chunk-pbnxt79v.js`) y `Mz` (`chunk-vq0drrah.js`) de 2.1.283.
 */
import { describe, expect, test } from 'bun:test'

import {
  escapeFormatCharacters,
  stripFormatCharacters,
  stripInvisibleFormatting,
  stripLoneSurrogates,
  unicodeEscape,
} from '../src/uds/unicodeSanitize.ts'

describe('retirada', () => {
  test('stripLoneSurrogates (Mz) quita los sustitutos sueltos y deja los pares', () => {
    expect(stripLoneSurrogates('a\ud800b\udc00c')).toBe('abc')
    expect(stripLoneSurrogates('a😀b')).toBe('a😀b')
  })

  test('stripFormatCharacters (E) quita formato, uso privado y sin asignar', () => {
    expect(stripFormatCharacters('a​b‪c⁦d﻿ef­g')).toBe('abcdefg')
    expect(stripFormatCharacters('a\u{e0041}b')).toBe('ab')
    expect(stripFormatCharacters('ñ ok')).toBe('ñ ok')
  })

  test('stripInvisibleFormatting (sf) combina las dos', () => {
    expect(stripInvisibleFormatting('a\ud800​b')).toBe('ab')
    expect(stripInvisibleFormatting('texto')).toBe('texto')
  })
})

describe('escape', () => {
  test('unicodeEscape (t6n) escribe cada unidad UTF-16 como \\uXXXX', () => {
    expect(unicodeEscape('é')).toBe('\\u00e9')
    expect(unicodeEscape('😀')).toBe('\\ud83d\\ude00')
  })

  test('escapeFormatCharacters (R8e) escapa controles C1, separadores de línea y formato', () => {
    expect(escapeFormatCharacters('a\u2028b\u0085c​d\u007fe')).toBe('a\\u2028b\\u0085c\\u200bd\\u007fe')
    expect(escapeFormatCharacters('a\nb')).toBe('a\nb')
  })
})
