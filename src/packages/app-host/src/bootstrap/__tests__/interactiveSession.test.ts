/**
 * La mitad ROJA de la slice de SESIÓN INTERACTIVA de `bootstrap/state.ts`.
 *
 * Procedencia: `ccnmt: packages/app-host/src/bootstrap/state.ts:1095-1105`
 * (`getIsNonInteractiveSession`, `getIsInteractive`, `setIsInteractive`, más
 * el campo `STATE.isInteractive` de `:71` y su valor inicial de `:311`). Ese
 * árbol no declara licencia, así que se reimplementa y no se copia.
 *
 * POR QUÉ AHORA, y por qué la slice entera y no un símbolo. `isTodoV2Enabled`
 * de `@thyrox/agent/tasks.js` figura como NO portada con este bloqueo escrito:
 * *«depende de `getIsNonInteractiveSession()`»*. Medido: la función no existe
 * en NINGÚN paquete de este árbol, así que el bloqueo es real y no caducado.
 * Y con él caen los tres útiles de tarea de `@thyrox/tool-registry` que la
 * consultan en su `isEnabled()`.
 *
 * Traer sólo el lector dejaría `STATE.isInteractive` sin escritor y el
 * veredicto clavado en su valor inicial para siempre: el verde que no
 * discrimina. Por eso entran el campo, los dos lectores y el escritor.
 *
 * Métrica: qué devuelven los dos lectores según lo que el escritor declaró.
 * Ciega a: quién llama al escritor en un arranque real — eso es del punto de
 * entrada, que este árbol todavía no cablea.
 */
import { beforeEach, describe, expect, test } from 'bun:test'
import {
  getIsInteractive,
  getIsNonInteractiveSession,
  resetStateForTests,
  setIsInteractive,
} from '../state.ts'

beforeEach(() => {
  resetStateForTests()
})

describe('la slice de sesión interactiva — 5 casos', () => {
  test('1. arranca declarada NO interactiva', () => {
    // El valor inicial de la fuente es `false`, y es una decisión: un arranque
    // sin declarar es el del SDK, no el de una terminal.
    expect(getIsInteractive()).toBe(false)
    expect(getIsNonInteractiveSession()).toBe(true)
  })

  test('2. el escritor mueve a los dos lectores', () => {
    setIsInteractive(true)
    expect(getIsInteractive()).toBe(true)
    expect(getIsNonInteractiveSession()).toBe(false)
  })

  test('3. los dos lectores son complementarios, nunca coinciden', () => {
    for (const valor of [true, false, true]) {
      setIsInteractive(valor)
      expect(getIsInteractive()).not.toBe(getIsNonInteractiveSession())
    }
  })

  test('4. el reinicio de pruebas la devuelve al default', () => {
    setIsInteractive(true)
    resetStateForTests()
    expect(getIsInteractive()).toBe(false)
  })

  test('5. el valor es SIEMPRE booleano, nunca indefinido', () => {
    // Discrimina un campo sin inicializar: con `undefined`, la negación daría
    // «no interactiva» por accidente y no por declaración, y los dos lectores
    // seguirían pareciendo correctos.
    expect(typeof getIsInteractive()).toBe('boolean')
    setIsInteractive(true)
    expect(typeof getIsInteractive()).toBe('boolean')
  })
})
