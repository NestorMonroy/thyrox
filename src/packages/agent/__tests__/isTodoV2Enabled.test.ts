/**
 * La mitad ROJA de `isTodoV2Enabled`.
 *
 * Procedencia: `ccnmt: packages/agent/tasks.ts:134-140`. Ese árbol no declara
 * licencia, así que se reimplementa y no se copia.
 *
 * POR QUÉ AHORA. El docstring de nuestro `tasks.ts` la lista como NO portada
 * con el bloqueo *«depende de `getIsNonInteractiveSession()`»*. Ese bloqueo
 * era real —medido, la función no existía en ningún paquete— y cae en este
 * mismo pase al portar la slice de sesión interactiva de `app-host`.
 *
 * QUÉ DECIDE. Si los útiles de tarea están habilitados. La regla tiene dos
 * mitades y la segunda es la interesante: en sesión NO interactiva quedan
 * apagados por defecto —ahí manda TodoWrite— pero una variable de entorno los
 * fuerza, porque quien usa el SDK puede querer el subsistema de tareas y no
 * tiene terminal donde declararse interactivo.
 *
 * Métrica: el veredicto ante cada combinación de sesión y variable.
 * Ciega a: si los útiles funcionan una vez habilitados — eso es de cada útil.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import {
  resetStateForTests,
  setIsInteractive,
} from '@thyrox/app-host/bootstrap/state.js'
import { isTodoV2Enabled } from '../tasks.ts'

const PREVIO = process.env.CLAUDE_CODE_ENABLE_TASKS

beforeEach(() => {
  resetStateForTests()
  delete process.env.CLAUDE_CODE_ENABLE_TASKS
})

afterEach(() => {
  if (PREVIO === undefined) delete process.env.CLAUDE_CODE_ENABLE_TASKS
  else process.env.CLAUDE_CODE_ENABLE_TASKS = PREVIO
})

describe('isTodoV2Enabled — 4 casos', () => {
  test('6. en sesión interactiva, habilitado', () => {
    setIsInteractive(true)
    expect(isTodoV2Enabled()).toBe(true)
  })

  test('7. en sesión NO interactiva, apagado', () => {
    setIsInteractive(false)
    expect(isTodoV2Enabled()).toBe(false)
  })

  test('8. la variable de entorno lo fuerza aunque no sea interactiva', () => {
    setIsInteractive(false)
    for (const valor of ['1', 'true', 'yes', 'on', 'TRUE']) {
      process.env.CLAUDE_CODE_ENABLE_TASKS = valor
      expect(isTodoV2Enabled()).toBe(true)
    }
  })

  test('9. un valor que no es verdadero NO fuerza nada', () => {
    // Discrimina la comprobación de verdad: con un `if (variable)` pelado, la
    // cadena '0' sería verdadera y habilitaría los útiles al revés de lo pedido.
    setIsInteractive(false)
    for (const valor of ['0', 'false', 'no', 'off', '']) {
      process.env.CLAUDE_CODE_ENABLE_TASKS = valor
      expect(isTodoV2Enabled()).toBe(false)
    }
  })
})
