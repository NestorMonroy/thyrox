/**
 * Adaptado de `ccnmt: packages/swarm/src/__tests__/leaderPermissionBridge.test.ts`.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import {
  getLeaderSetToolPermissionContext,
  getLeaderToolUseConfirmQueue,
  registerLeaderSetToolPermissionContext,
  registerLeaderToolUseConfirmQueue,
  unregisterLeaderSetToolPermissionContext,
  unregisterLeaderToolUseConfirmQueue,
} from '../permissions/leaderPermissionBridge.js'

afterEach(() => {
  // Los tests comparten estado a nivel de módulo — limpiar tras cada uno
  // para no filtrar un registro obsoleto al siguiente test.
  unregisterLeaderToolUseConfirmQueue()
  unregisterLeaderSetToolPermissionContext()
})

describe('puente de ToolUseConfirmQueue hacia el líder', () => {
  test('devuelve null cuando no hay nada registrado', () => {
    expect(getLeaderToolUseConfirmQueue()).toBeNull()
  })

  test('registrar → el getter devuelve la función registrada', () => {
    const fn = (_u: (prev: unknown[]) => unknown[]) => undefined
    registerLeaderToolUseConfirmQueue(fn as never)
    expect(getLeaderToolUseConfirmQueue()).toBe(fn as never)
  })

  test('desregistrar → el getter vuelve a devolver null', () => {
    registerLeaderToolUseConfirmQueue((() => undefined) as never)
    unregisterLeaderToolUseConfirmQueue()
    expect(getLeaderToolUseConfirmQueue()).toBeNull()
  })

  test('registrar reemplaza un registro previo (gana el último)', () => {
    // El REPL vuelve a registrar en cada montaje del líder. Sin "gana el
    // último", un re-registro dejaría un closure obsoleto apuntando a un
    // árbol de React ya desmontado → no-op silencioso o avisos de
    // "setState en componente desmontado".
    const first = (() => undefined) as never
    const second = (() => undefined) as never
    registerLeaderToolUseConfirmQueue(first)
    registerLeaderToolUseConfirmQueue(second)
    expect(getLeaderToolUseConfirmQueue()).toBe(second)
  })

  test('el getter devuelve la MISMA referencia en llamadas repetidas (sin copia)', () => {
    // El getter se consulta en la ruta caliente (cada petición de permiso
    // de un compañero en proceso). No debe asignar un envoltorio nuevo en
    // cada llamada.
    const fn = (() => undefined) as never
    registerLeaderToolUseConfirmQueue(fn)
    expect(getLeaderToolUseConfirmQueue()).toBe(getLeaderToolUseConfirmQueue())
  })
})

describe('puente de ToolPermissionContext hacia el líder', () => {
  test('devuelve null cuando no hay nada registrado', () => {
    expect(getLeaderSetToolPermissionContext()).toBeNull()
  })

  test('registrar → el getter devuelve la función registrada', () => {
    const fn = (_ctx: unknown, _opts?: { preserveMode?: boolean }) => undefined
    registerLeaderSetToolPermissionContext(fn as never)
    expect(getLeaderSetToolPermissionContext()).toBe(fn as never)
  })

  test('desregistrar → el getter vuelve a devolver null', () => {
    registerLeaderSetToolPermissionContext((() => undefined) as never)
    unregisterLeaderSetToolPermissionContext()
    expect(getLeaderSetToolPermissionContext()).toBeNull()
  })

  test('registrar reemplaza un registro previo', () => {
    const first = (() => undefined) as never
    const second = (() => undefined) as never
    registerLeaderSetToolPermissionContext(first)
    registerLeaderSetToolPermissionContext(second)
    expect(getLeaderSetToolPermissionContext()).toBe(second)
  })
})

describe('los dos puentes son INDEPENDIENTES', () => {
  // CRÍTICO: las dos ranuras son variables de módulo separadas. Un bug que
  // compartiera la ranura haría que registrar una borrara la otra. Este
  // grupo fija esa separación.

  test('registrar ToolUseConfirmQueue NO afecta a ToolPermissionContext', () => {
    registerLeaderToolUseConfirmQueue((() => undefined) as never)
    expect(getLeaderSetToolPermissionContext()).toBeNull()
  })

  test('registrar ToolPermissionContext NO afecta a ToolUseConfirmQueue', () => {
    registerLeaderSetToolPermissionContext((() => undefined) as never)
    expect(getLeaderToolUseConfirmQueue()).toBeNull()
  })

  test('desregistrar uno NO borra el otro', () => {
    const queueFn = (() => undefined) as never
    const ctxFn = (() => undefined) as never
    registerLeaderToolUseConfirmQueue(queueFn)
    registerLeaderSetToolPermissionContext(ctxFn)
    unregisterLeaderToolUseConfirmQueue()
    expect(getLeaderToolUseConfirmQueue()).toBeNull()
    expect(getLeaderSetToolPermissionContext()).toBe(ctxFn)
  })

  test('los dos pueden registrarse a la vez', () => {
    const queueFn = (() => undefined) as never
    const ctxFn = (() => undefined) as never
    registerLeaderToolUseConfirmQueue(queueFn)
    registerLeaderSetToolPermissionContext(ctxFn)
    expect(getLeaderToolUseConfirmQueue()).toBe(queueFn)
    expect(getLeaderSetToolPermissionContext()).toBe(ctxFn)
  })
})
