/**
 * Tests del puerto declarado-parcial de `getNextPermissionMode.ts` (1 de
 * 2 exports — `cyclePermissionMode` queda fuera, bloqueada por
 * `permissionSetup.ts`). Cubre el ciclo completo Shift+Tab y la
 * propiedad fail-closed: nunca se ofrece 'auto' en este árbol.
 */
import { describe, expect, test } from 'bun:test'
import { getNextPermissionMode } from '../src/getNextPermissionMode.ts'

function ctx(overrides: {
  mode: string
  isBypassPermissionsModeAvailable?: boolean
  isAutoModeAvailable?: boolean
}) {
  return {
    isBypassPermissionsModeAvailable: false,
    ...overrides,
  } as Parameters<typeof getNextPermissionMode>[0]
}

describe('getNextPermissionMode — ciclo estándar (no-ant, sin bypass)', () => {
  test('default -> acceptEdits -> plan -> default', () => {
    expect(getNextPermissionMode(ctx({ mode: 'default' }))).toBe('acceptEdits')
    expect(getNextPermissionMode(ctx({ mode: 'acceptEdits' }))).toBe('plan')
    expect(getNextPermissionMode(ctx({ mode: 'plan' }))).toBe('default')
  })
})

describe('getNextPermissionMode — bypassPermissions disponible', () => {
  test('desde plan, con bypass disponible, salta a bypassPermissions', () => {
    expect(
      getNextPermissionMode(
        ctx({ mode: 'plan', isBypassPermissionsModeAvailable: true }),
      ),
    ).toBe('bypassPermissions')
  })

  test('desde bypassPermissions vuelve a default (auto nunca disponible aquí)', () => {
    expect(getNextPermissionMode(ctx({ mode: 'bypassPermissions' }))).toBe(
      'default',
    )
  })
})

describe('getNextPermissionMode — dontAsk y modos desconocidos', () => {
  test('dontAsk cae a default (no expuesto aún en el ciclo)', () => {
    expect(getNextPermissionMode(ctx({ mode: 'dontAsk' }))).toBe('default')
  })

  test('un modo no cubierto por el switch (p. ej. "auto") cae a default', () => {
    expect(getNextPermissionMode(ctx({ mode: 'auto' }))).toBe('default')
  })
})

describe('getNextPermissionMode — fail-closed: nunca devuelve "auto" en este árbol', () => {
  // Divergencia declarada del módulo: `canCycleToAuto` está fijo a
  // `false` (el subsistema de feature-gates no está portado). Aunque se
  // marque `isAutoModeAvailable: true` en el contexto, el resultado
  // nunca debe ser 'auto' — es la propiedad que hace que esta omisión
  // sea MÁS restrictiva que la fuente, nunca menos.
  test('isAutoModeAvailable=true no habilita el ciclo a auto', () => {
    const withAutoFlag = ctx({ mode: 'plan', isAutoModeAvailable: true })
    expect(getNextPermissionMode(withAutoFlag)).toBe('default')
  })

  test('bajo USER_TYPE=ant tampoco se ofrece auto — cae a default', () => {
    const prevUserType = process.env.USER_TYPE
    process.env.USER_TYPE = 'ant'
    try {
      expect(
        getNextPermissionMode(ctx({ mode: 'default', isAutoModeAvailable: true })),
      ).toBe('default')
    } finally {
      if (prevUserType === undefined) delete process.env.USER_TYPE
      else process.env.USER_TYPE = prevUserType
    }
  })

  test('bajo USER_TYPE=ant con bypass disponible, sí se ofrece bypassPermissions', () => {
    const prevUserType = process.env.USER_TYPE
    process.env.USER_TYPE = 'ant'
    try {
      expect(
        getNextPermissionMode(
          ctx({
            mode: 'default',
            isBypassPermissionsModeAvailable: true,
          }),
        ),
      ).toBe('bypassPermissions')
    } finally {
      if (prevUserType === undefined) delete process.env.USER_TYPE
      else process.env.USER_TYPE = prevUserType
    }
  })
})
