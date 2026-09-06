/**
 * Porte de `ccnmt: packages/command-runtime/src/__tests__/types.test.ts`.
 *
 * Fija la precedencia de `getCommandName` (userFacingName sobre name, con
 * `??` y no `||` — una cadena vacía sigue ganando) y de `isCommandEnabled`
 * (default `true` cuando `isEnabled` es `undefined`, con `??` y no `||`).
 */
import { describe, expect, test } from 'bun:test'
import {
  getCommandName,
  isCommandEnabled,
  type CommandBase,
} from '../types.js'

function makeCmd(over: Partial<CommandBase> = {}): CommandBase {
  return {
    name: 'default-name',
    description: 'desc',
    ...over,
  }
}

describe('getCommandName — precedencia de userFacingName', () => {
  test('devuelve el resultado de userFacingName() cuando está definida', () => {
    expect(
      getCommandName(makeCmd({ userFacingName: () => 'fancy-name' })),
    ).toBe('fancy-name')
  })

  test('cae a .name cuando userFacingName es undefined', () => {
    expect(getCommandName(makeCmd({ name: 'plain-name' }))).toBe('plain-name')
  })

  test('userFacingName devolviendo cadena vacía igual gana (NO hay chequeo de veracidad)', () => {
    // La función usa ?? y no ||. Una cadena vacía es no-nula → gana.
    // CRÍTICO: un refactor a || cambiaría en silencio al fallback de .name.
    expect(
      getCommandName(
        makeCmd({ name: 'plain-name', userFacingName: () => '' }),
      ),
    ).toBe('')
  })

  test('userFacingName se invoca fresco en cada llamada (no se cachea)', () => {
    let calls = 0
    const cmd = makeCmd({
      userFacingName: () => `name-${calls++}`,
    })
    expect(getCommandName(cmd)).toBe('name-0')
    expect(getCommandName(cmd)).toBe('name-1')
  })
})

describe('isCommandEnabled — precedencia de isEnabled', () => {
  test('devuelve el resultado de isEnabled() cuando está definida y es true', () => {
    expect(isCommandEnabled(makeCmd({ isEnabled: () => true }))).toBe(true)
  })

  test('devuelve false cuando isEnabled() devuelve false', () => {
    expect(isCommandEnabled(makeCmd({ isEnabled: () => false }))).toBe(false)
  })

  test('por defecto es TRUE cuando isEnabled es undefined', () => {
    // Default crítico — los comandos sin gate explícito quedan habilitados
    // por defecto. Un futuro ?? false deshabilitaría en silencio todo
    // comando que carezca de isEnabled.
    expect(isCommandEnabled(makeCmd())).toBe(true)
  })

  test('isEnabled() se invoca fresco en cada llamada', () => {
    // El gate puede depender de estado dinámico (env, settings). Documenta
    // que no está memoizado.
    let calls = 0
    const cmd = makeCmd({ isEnabled: () => calls++ === 0 })
    expect(isCommandEnabled(cmd)).toBe(true) // calls=0, ret true
    expect(isCommandEnabled(cmd)).toBe(false) // calls=1, ret false
  })
})
