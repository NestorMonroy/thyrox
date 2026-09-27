/**
 * Las combinaciones de teclas que cruzan de app o terminan procesos —Cmd+Q,
 * Alt+F4, Ctrl+Alt+Supr— y que la herramienta `key` rechaza sin el permiso
 * `systemKeyCombos`.
 *
 * El módulo declara su contrato en su cabecera y cita un `keyBlocklist.test.ts`
 * con «las tres formas de bypass» que no existe en este árbol; estas pruebas lo
 * restituyen. Con `bin/binary` sobre 2.1.283 no hay tabla con qué comparar:
 * `alt+meta+escape` y `ctrl+alt+delete` dan 0 declaraciones en la build de
 * Linux, cuyo servidor de computer use no va embebido.
 *
 * Las tres formas de bypass que el gate cierra: un alias del modificador
 * (`command+q`, `meta+q`), el orden o las mayúsculas, y una tecla de más
 * detrás de la combinación (`cmd+q+a`), que pulsa Cmd+Q antes que la A.
 *
 * Control de anulación, medido: sin el alias `command` cae el 3; comparando
 * la combinación entera en vez de tecla por tecla, el 4; Linux con la tabla de
 * macOS, el 5; sin minúsculas, 1, 3 y 5; con un modificador solo bloqueando,
 * el 6; sin ordenar los modificadores, 1 y 3; una tabla para todas, 5 y 7.
 */
import { describe, expect, test } from 'bun:test'
import { _test, isSystemKeyCombo, normalizeKeySequence } from '../src/keyBlocklist.ts'

describe('keyBlocklist — normalización', () => {
  test('1. alias a canónico, minúsculas, espacios, sin duplicados y modificadores en orden', () => {
    expect(normalizeKeySequence('Cmd + Shift + Q')).toBe('shift+meta+q')
    expect(normalizeKeySequence('option+CONTROL+super+win+x')).toBe('ctrl+alt+meta+x')
    expect(normalizeKeySequence('lctrl+rctrl+a')).toBe('ctrl+a')
  })

  test('2. las tablas están en forma canónica: sólo valores canónicos, en orden, la tecla al final', () => {
    const canonical = new Set(Object.values(_test.CANONICAL_MODIFIER))
    for (const entry of [..._test.BLOCKED_DARWIN, ..._test.BLOCKED_WIN32]) {
      const parts = entry.split('+')
      const mods = parts.slice(0, -1)
      expect([entry, mods.every(m => canonical.has(m))]).toEqual([entry, true])
      expect([entry, normalizeKeySequence(entry)]).toEqual([entry, entry])
    }
  })
})

describe('keyBlocklist — el gate', () => {
  test('3. las combinaciones de macOS bloqueadas, escritas con cualquier alias', () => {
    for (const seq of ['command+q', 'meta+q', 'cmd+q', 'Cmd+Shift+Q', 'cmd+alt+escape', 'option+command+escape', 'cmd+tab', 'cmd+space', 'ctrl+cmd+q']) {
      expect([seq, isSystemKeyCombo(seq, 'darwin')]).toEqual([seq, true])
    }
  })

  test('4. una tecla de más detrás de la combinación no la esconde', () => {
    expect(isSystemKeyCombo('cmd+q+a', 'darwin')).toBe(true)
    expect(isSystemKeyCombo('alt+a+f4', 'win32')).toBe(true)
  })

  test('5. las de Windows, y Linux usa la misma tabla que Windows', () => {
    for (const seq of ['ctrl+alt+delete', 'control+option+Delete', 'alt+f4', 'alt+tab', 'win+l', 'super+d']) {
      expect([seq, isSystemKeyCombo(seq, 'win32'), isSystemKeyCombo(seq, 'linux')]).toEqual([seq, true, true])
    }
    expect(isSystemKeyCombo('cmd+q', 'linux')).toBe(false)
  })

  test('6. lo que no cruza de app pasa, y un modificador solo nunca bloquea', () => {
    for (const seq of ['cmd+c', 'cmd+shift+t', 'ctrl+alt+t', 'cmd', 'cmd+shift', 'alt']) {
      expect([seq, isSystemKeyCombo(seq, 'darwin') || isSystemKeyCombo(seq, 'win32')]).toEqual([seq, false])
    }
  })

  test('7. la tabla de cada plataforma no se filtra a la otra', () => {
    expect(isSystemKeyCombo('alt+f4', 'darwin')).toBe(false)
    expect(isSystemKeyCombo('cmd+space', 'win32')).toBe(false)
  })
})
