/**
 * El dialecto por URL y la apertura multi-motor (`openByUrl`).
 */
import { describe, expect, test } from 'bun:test'
import { DIALECTS, dialectOf, jsonParam, openByUrl, readId, readJson, readTimestamp } from '../sql.ts'

describe('dialectOf elige el motor por el esquema de la URL', () => {
  test('sqlite y file son sqlite; postgres y postgresql son postgres', () => {
    expect(dialectOf('sqlite:///tmp/e.sqlite3')).toBe('sqlite')
    expect(dialectOf('file:///tmp/e.sqlite3')).toBe('sqlite')
    expect(dialectOf('postgres://u@h/db')).toBe('postgres')
    expect(dialectOf('postgresql://u@h/db')).toBe('postgres')
  })

  test('un esquema que no está en DIALECTS no es ninguno de los declarados', () => {
    expect(dialectOf('mysql://u@h/db')).toBeNull()
    expect(dialectOf('mongodb://u@h/db')).toBeNull()
    expect(DIALECTS).toEqual(['sqlite', 'postgres'])
  })
})

describe('los helpers de dialecto viajan igual que en la base de errores', () => {
  test('jsonParam serializa en sqlite y pasa el objeto en postgres', () => {
    expect(jsonParam('sqlite', { a: 1 })).toBe('{"a":1}')
    expect(jsonParam('postgres', { a: 1 })).toEqual({ a: 1 })
  })

  test('readJson acepta texto (sqlite) u objeto ya parseado (postgres)', () => {
    expect(readJson('{"a":1}')).toEqual({ a: 1 })
    expect(readJson({ a: 1 })).toEqual({ a: 1 })
  })

  test('readTimestamp normaliza un Date (postgres) o deja el texto (sqlite)', () => {
    const at = new Date('2026-09-28T17:40:00.000Z')
    expect(readTimestamp(at)).toBe('2026-09-28T17:40:00.000Z')
    expect(readTimestamp('2026-09-28T17:40:00.000Z')).toBe('2026-09-28T17:40:00.000Z')
  })

  test('readId siempre da número, venga como número o como texto (BIGINT de postgres)', () => {
    expect(readId(9)).toBe(9)
    expect(readId('9')).toBe(9)
  })
})

describe('openByUrl abre la conexión que la URL declara', () => {
  test('el esquema elige el motor', () => {
    expect(openByUrl('sqlite://:memory:').dialect).toBe('sqlite')
    expect(openByUrl('postgres://u@h/db').dialect).toBe('postgres')
  })

  test('extensionsLoadable es falso en sqlite y verdadero en postgres (H-THYROX-238)', () => {
    expect(openByUrl('sqlite://:memory:').capabilities).toEqual({ dialect: 'sqlite', extensionsLoadable: false })
    expect(openByUrl('postgres://u@h/db').capabilities).toEqual({ dialect: 'postgres', extensionsLoadable: true })
  })

  test('mysql y mariadb se rechazan nombrando el motor declarado, no como esquema desconocido', () => {
    expect(() => openByUrl('mysql://user:secret@h/db')).toThrow(/mysql.*not yet supported/)
    expect(() => openByUrl('mariadb://user:secret@h/db')).toThrow(/mariadb.*not yet supported/)
    // CONTROL: sin la guarda de mysql/mariadb, dialectOf los trata como esquema
    // desconocido y cae en el mensaje genérico, que NO dice "not yet supported".
    expect(() => openByUrl('mysql://user:secret@h/db')).not.toThrow(/^unsupported database URL/)
  })

  test('un esquema fuera de todo lo declarado se rechaza como no admitido, sin nombrar una fase', () => {
    expect(() => openByUrl('mongodb://user:secret@h/db')).toThrow(/^unsupported database URL/)
    expect(() => openByUrl('mongodb://user:secret@h/db')).not.toThrow(/phase D7/)
  })

  // CONTROL: si openByUrl dejara de nombrar mysql/mariadb como caso propio, caería
  // sobre el mensaje genérico de "unsupported" en vez de nombrar el motor declarado.
  test('las credenciales de la URL van enmascaradas en los dos mensajes de rechazo', () => {
    expect(() => openByUrl('mysql://user:secret@h/db')).toThrow(/mysql:\/\/\*\*\*@h\/db/)
    expect(() => openByUrl('mysql://user:secret@h/db')).not.toThrow(/secret/)
    expect(() => openByUrl('mongodb://user:secret@h/db')).toThrow(/mongodb:\/\/\*\*\*@h\/db/)
    expect(() => openByUrl('mongodb://user:secret@h/db')).not.toThrow(/secret/)
  })
})
