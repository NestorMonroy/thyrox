/**
 * Retirada y escape de caracteres que no se ven: `chunk-pbnxt79v.js` entero,
 * con `Mz` y `fr` (`chunk-vq0drrah.js`), de 2.1.283.
 */
import { describe, expect, test } from 'bun:test'

import {
  CONTROL_CHAR_CLASS,
  MARKDOWN_LABEL_MAX_UNITS,
  MARKDOWN_SENSITIVE_CHARS,
  MARKDOWN_TEXT_MAX_UNITS,
  collapseControls,
  controlsToSpace,
  escapeForAsciiLog,
  escapeFormatCharacters,
  escapeHiddenCharacters,
  escapeNonPrintableAscii,
  flattenControls,
  replaceControls,
  sanitizeMarkdownLabel,
  sanitizeMarkdownText,
  sanitizeUnicodeDeep,
  sanitizeUnicodeToFixedPoint,
  stripAnsiEscapes,
  stripIgnorables,
  toSingleLine,
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

describe('el resto de chunk-pbnxt79v.js', () => {
  test('stripAnsiEscapes (wt) quita las secuencias de terminal', () => {
    expect(stripAnsiEscapes('\x1b[31mrojo\x1b[0m')).toBe('rojo')
  })

  test('replaceControls (YH) cambia cada tramo de controles; conserva los que unen un emoji dentro de una palabra', () => {
    expect(replaceControls('a\u0007\u200bb', ' ')).toBe('a b')
    expect(replaceControls('a\nb', ' ', { keepNewlines: true })).toBe('a\nb')
    expect(replaceControls('👨\u200d👩 \u200dx', ' ', { keepEmojiJoiners: true })).toBe('👨\u200d👩 x')
    expect(replaceControls('a\ud800b', '_')).toBe('a_b')
    expect(replaceControls('a\ud800\x1b[0m\udc00b', '_')).toBe('a_b')
  })

  test('collapseControls (fr) retira controles C0 y C1 y colapsa los espacios', () => {
    expect(collapseControls('  a\u0007 \t\n b\u0085 ')).toBe('a b')
  })

  test('stripIgnorables (Cy) quita formato e ignorables y colapsa', () => {
    expect(stripIgnorables('a\u200b\u034fb  c\u115f')).toBe('ab c')
  })

  test('sanitizeUnicodeToFixedPoint (Njr) normaliza en NFKC y quita formato hasta que el texto no cambie', () => {
    expect(sanitizeUnicodeToFixedPoint('ﬁ\u200bx\ud800')).toBe('fix')
  })

  test('sanitizeUnicodeDeep (H_) recorre cadenas, listas y claves', () => {
    expect(sanitizeUnicodeDeep<unknown>({ 'k\u200b': ['a\u200b', 1, null, { x: 'ﬁ' }] })).toEqual({ k: ['a', 1, null, { x: 'fi' }] })
  })

  test('escapeNonPrintableAscii (vUe) y escapeForAsciiLog (wl)', () => {
    expect(escapeNonPrintableAscii('añ\n')).toBe('a\\u00f1\\u000a')
    expect(escapeForAsciiLog('\\u0041ñ')).toBe('\\u005cu0041\\u00f1')
    expect(escapeForAsciiLog('\\n')).toBe('\\n')
  })

  test('controlsToSpace (Tn)', () => {
    expect(controlsToSpace('a\u0007\u200b\u2028b')).toBe('a b')
  })

  test('escapeHiddenCharacters (PJ) escribe como \\uXXXX formato, C1 e ignorables', () => {
    expect(escapeHiddenCharacters('a\u200b\u0085\u2800b\n')).toBe('a\\u200b\\u0085\\u2800b\n')
  })

  test('flattenControls (OJ) y toSingleLine (po)', () => {
    expect(flattenControls('\x1b[1ma\u0007b')).toBe('a b')
    expect(toSingleLine('  a\n\n b \t c ')).toBe('a b c')
    expect(toSingleLine('`a` <b>', { drop: /[`<>]/g })).toBe('a b')
    expect(toSingleLine('abcdef', { maxCodeUnits: 3 })).toBe('abc')
  })

  test('sanitizeMarkdownLabel (QE) rompe la sintaxis de enlace y corta a 255', () => {
    expect(sanitizeMarkdownLabel('[x](y) ![i][r] [a]: `c` <d>')).toBe('[x] (y) ! [i] [r] [a] : c d')
    expect(sanitizeMarkdownLabel('x'.repeat(300)).length).toBe(MARKDOWN_LABEL_MAX_UNITS)
  })

  test('sanitizeMarkdownText (v6) además separa cada <', () => {
    expect(sanitizeMarkdownText('[x](y) <tag>')).toBe('[x] (y) < tag>')
    expect(sanitizeMarkdownText('x'.repeat(3000)).length).toBe(MARKDOWN_TEXT_MAX_UNITS)
    expect('a`[<'.replace(MARKDOWN_SENSITIVE_CHARS, '')).toBe('a')
  })

  test('CONTROL_CHAR_CLASS (cde) es una clase de caracteres válida', () => {
    expect(new RegExp(`[${CONTROL_CHAR_CLASS}]`, 'u').test('\u2800')).toBe(true)
  })
})
