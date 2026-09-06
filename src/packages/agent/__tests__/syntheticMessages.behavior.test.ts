/**
 * Porte de `ccnmt: packages/agent/__tests__/syntheticMessages.behavior.test.ts`.
 *
 * Fija la pertenencia al conjunto `SYNTHETIC_MESSAGES`: las cadenas literales
 * con que `isSyntheticMessage` distingue «esto es una pista sintetica de la
 * interfaz» de «esto es salida real del modelo». La deriva tiene dos formas de
 * fallo opuestas:
 *
 *  1. El texto de un mensaje de usuario cambia y se aparta del conjunto → los
 *     mensajes sinteticos se cuelan en la compactacion y en la telemetria de
 *     uso como si fueran salida del modelo.
 *  2. El conjunto gana una cadena ajena → salida real del modelo que coincida
 *     se filtra fuera, y eso es perdida de datos.
 */
import { describe, expect, test } from 'bun:test'

import {
  CANCEL_MESSAGE,
  INTERRUPT_MESSAGE,
  INTERRUPT_MESSAGE_FOR_TOOL_USE,
  NO_RESPONSE_REQUESTED,
  REJECT_MESSAGE,
  SYNTHETIC_MESSAGES,
  SYNTHETIC_MODEL,
} from '../messages.ts'

describe('conjunto SYNTHETIC_MESSAGES y su modelo centinela', () => {
  test('SYNTHETIC_MODEL es el centinela «<synthetic>», no un modelo real', () => {
    expect(SYNTHETIC_MODEL).toBe('<synthetic>')
  })

  test('contiene INTERRUPT_MESSAGE', () => {
    expect(SYNTHETIC_MESSAGES.has(INTERRUPT_MESSAGE)).toBe(true)
  })

  test('contiene INTERRUPT_MESSAGE_FOR_TOOL_USE, aparte del de interrupcion normal', () => {
    expect(SYNTHETIC_MESSAGES.has(INTERRUPT_MESSAGE_FOR_TOOL_USE)).toBe(true)
  })

  test('contiene CANCEL_MESSAGE', () => {
    expect(SYNTHETIC_MESSAGES.has(CANCEL_MESSAGE)).toBe(true)
  })

  test('contiene REJECT_MESSAGE', () => {
    expect(SYNTHETIC_MESSAGES.has(REJECT_MESSAGE)).toBe(true)
  })

  test('contiene NO_RESPONSE_REQUESTED', () => {
    expect(SYNTHETIC_MESSAGES.has(NO_RESPONSE_REQUESTED)).toBe(true)
  })

  test('su tamano es exactamente 5, contra una adicion silenciosa', () => {
    expect(SYNTHETIC_MESSAGES.size).toBe(5)
  })

  test('NO contiene texto parcial ni parecido: solo coincidencia exacta', () => {
    // La comprobacion usa `Set.has()`, no coincidencia de subcadena. Se fijan
    // las dos direcciones: ni una supercadena ni una subcadena de un mensaje
    // sintetico deben detectarse como sinteticas.
    expect(SYNTHETIC_MESSAGES.has('[Request interrupted by user]\n')).toBe(false)
    expect(SYNTHETIC_MESSAGES.has('Request interrupted by user')).toBe(false) // sin corchetes
    expect(SYNTHETIC_MESSAGES.has(INTERRUPT_MESSAGE.toLowerCase())).toBe(false) // distingue caja
  })

  test('NO contiene la variante con razon, que recibe un sufijo del usuario', () => {
    // La variante «con razon» es dinamica —el usuario aporta el sufijo—, asi
    // que no puede vivir en un conjunto estatico. El REJECT_MESSAGE sin
    // sufijo SI esta. Se fija para que un refactor futuro no meta el prefijo
    // en el conjunto y fabrique una coincidencia de subcadena disfrazada.
    expect(
      SYNTHETIC_MESSAGES.has(
        "The user doesn't want to proceed with this tool use. To tell you how to proceed, the user said:\n",
      ),
    ).toBe(false)
  })
})
