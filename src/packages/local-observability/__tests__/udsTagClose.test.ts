/**
 * El escape de la etiqueta que envuelve texto ajeno: `Qce`, `CFt`, `PL`, `h`
 * y `H` (`chunk-0grnxhq4.js`) de 2.1.283.
 */
import { describe, expect, test } from 'bun:test'

import { escapeTagClose, escapeTagOpenOrClose, normalizeTagLookalikes } from '../src/uds/tagClose.ts'

const TAG = 'cross-session-message'

describe('escapeTagClose (Qce)', () => {
  test('neutraliza el cierre literal con una barra invertida tras el <', () => {
    expect(escapeTagClose(TAG, 'a</cross-session-message>b')).toBe('a<\\/cross-session-message>b')
  })

  test('no toca la apertura: sólo el cierre puede escapar del sobre', () => {
    expect(escapeTagClose(TAG, '<cross-session-message>')).toBe('<cross-session-message>')
  })

  test('un cierre ya escapado no se vuelve a escapar', () => {
    expect(escapeTagClose(TAG, '<\\/cross-session-message>')).toBe('<\\/cross-session-message>')
  })

  test('mayúsculas, guion bajo y caracteres parecidos también cierran', () => {
    expect(escapeTagClose(TAG, '</CROSS-SESSION-MESSAGE>')).toBe('<\\/CROSS-SESSION-MESSAGE>')
    expect(escapeTagClose(TAG, '</cross_session_message>')).toBe('<\\/cross_session_message>')
    expect(escapeTagClose(TAG, '＜/cross-session-message>')).toBe('<\\/cross-session-message>')
    expect(escapeTagClose(TAG, '<∕cross-session-message>')).toBe('<\\∕cross-session-message>')
  })

  test('un carácter invisible o un espacio entre las piezas no evita el escape', () => {
    expect(escapeTagClose(TAG, '</cross​-session-message>')).toBe('<\\/cross​-session-message>')
    expect(escapeTagClose(TAG, '< /cross-session-message>')).toBe('<\\ /cross-session-message>')
  })

  test('otra etiqueta que sólo comparte el prefijo no se toca', () => {
    expect(escapeTagClose(TAG, '</cross-session-messages>')).toBe('</cross-session-messages>')
    expect(escapeTagClose(TAG, '</cross-session-message2>')).toBe('</cross-session-message2>')
    expect(escapeTagClose(TAG, 'a</cross-session-message')).toBe('a<\\/cross-session-message')
  })
})

describe('escapeTagOpenOrClose (CFt) y normalizeTagLookalikes (PL)', () => {
  test('CFt escapa también la apertura', () => {
    expect(escapeTagOpenOrClose(TAG, '<cross-session-message>x</cross-session-message>')).toBe(
      '<\\cross-session-message>x<\\/cross-session-message>',
    )
  })

  test('PL lleva cada parecido a su signo ASCII', () => {
    expect(normalizeTagLookalikes('＜a∕b〉')).toBe('<a/b>')
  })
})
