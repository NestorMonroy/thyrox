/**
 * Porte de `ccnmt: packages/agent/__tests__/deriveShortMessageId.behavior.test.ts`.
 *
 * Fija `deriveShortMessageId` — UUID → resumen base36 de 6 caracteres,
 * determinista. Lo consume la herramienta de recorte para inyectar etiquetas
 * `[id:...]` en los mensajes que van al API, de modo que el modelo pueda
 * referirse a un mensaje anterior por su identificador corto.
 *
 * Dos invariantes con carga:
 *  1. Determinista — el mismo UUID produce SIEMPRE el mismo identificador. Al
 *     modelo se le muestran a lo largo de varios turnos; el mapa no puede
 *     derivar a media sesion.
 *  2. Longitud acotada (6) — deben distinguirse a simple vista sin inflar el
 *     contexto.
 */
import { describe, expect, test } from 'bun:test'

import { deriveShortMessageId } from '../messages.ts'

describe('deriveShortMessageId', () => {
  test('determinista: el mismo UUID da el mismo identificador corto', () => {
    const uuid = '12345678-1234-1234-1234-123456789abc'
    const id1 = deriveShortMessageId(uuid)
    const id2 = deriveShortMessageId(uuid)
    expect(id1).toBe(id2)
  })

  test('la salida mide 6 caracteres o menos', () => {
    // Los primeros 10 hexadecimales convertidos a base36 dan a lo sumo 6.
    // 0xffffffffff = 1099511627775 → base36 'fdkj4tzg' → recortado a 'fdkj4t'.
    for (let i = 0; i < 20; i++) {
      const randomHex = Array.from({ length: 32 }, () =>
        Math.floor(Math.random() * 16).toString(16),
      ).join('')
      const uuid = `${randomHex.slice(0, 8)}-${randomHex.slice(8, 12)}-${randomHex.slice(12, 16)}-${randomHex.slice(16, 20)}-${randomHex.slice(20, 32)}`
      const id = deriveShortMessageId(uuid)
      expect(id.length).toBeLessThanOrEqual(6)
      expect(id.length).toBeGreaterThan(0)
    }
  })

  test('retira los guiones antes de convertir a hexadecimal', () => {
    // Se fija para que un refactor que haga `.substring(0, 10)` sin retirarlos
    // no produzca identificadores equivocados: leeria el primer guion como
    // digito hexadecimal y el analisis fallaria.
    const id1 = deriveShortMessageId('12345678-1234-1234-1234-123456789abc')
    // El mismo hexadecimal con los guiones en otro sitio da los mismos 10
    // primeros: retirados todos, ambos son "1234567812".
    const id2 = deriveShortMessageId('12345678123-4-1234-1234-1234-123456789ab')
    expect(id1).toBe(id2)
  })

  test('UUID distintos suelen dar identificadores distintos', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 50; i++) {
      const randomHex = Array.from({ length: 32 }, () =>
        Math.floor(Math.random() * 16).toString(16),
      ).join('')
      const uuid = `${randomHex.slice(0, 8)}-${randomHex.slice(8, 12)}-${randomHex.slice(12, 16)}-${randomHex.slice(16, 20)}-${randomHex.slice(20, 32)}`
      ids.add(deriveShortMessageId(uuid))
    }
    // Se admite alguna colision, pero la mayoria deben ser unicos: 10
    // hexadecimales son ~40 bits, asi que en 50 muestras la probabilidad de
    // choque es minima.
    expect(ids.size).toBeGreaterThanOrEqual(45)
  })

  test('devuelve el juego base36 en minusculas', () => {
    const id = deriveShortMessageId('abcdef01-2345-6789-abcd-ef0123456789')
    expect(id).toMatch(/^[0-9a-z]+$/)
  })

  test('un UUID que da cero devuelve «0», no cadena vacia', () => {
    // 0x0000000000 = 0 → base36 "0" → recortado a 6 sigue siendo "0". Se fija
    // para que la funcion ni reviente ni devuelva "" ante el cero.
    const id = deriveShortMessageId('00000000-0000-0000-0000-000000000000')
    expect(id).toBe('0')
  })

  test('un UUID que da el maximo sigue cabiendo en 6 caracteres', () => {
    // 0xffffffffff = 1099511627775 → base36 son 8 caracteres → recorte a 6.
    const id = deriveShortMessageId('ffffffff-ffff-ffff-ffff-ffffffffffff')
    expect(id.length).toBeLessThanOrEqual(6)
    expect(id.length).toBeGreaterThanOrEqual(1)
  })
})
