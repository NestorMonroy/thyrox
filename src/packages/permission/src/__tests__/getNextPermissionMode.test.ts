import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'

// Copia de `ccnmt: packages/permission/src/__tests__/
// getNextPermissionMode.test.ts` con los comentarios traducidos; el cuerpo es
// el de la fuente.
//
// Se mockean las dependencias entre paquetes para que el test unitario se
// mantenga centrado en la logica del ciclo.
const realPermissionSetup = await import('../permissionSetup.js')

let isAutoModeGateEnabledStub = () => false
mock.module('../permissionSetup.js', () => ({
  ...realPermissionSetup,
  isAutoModeGateEnabled: () => isAutoModeGateEnabledStub(),
  getAutoModeUnavailableReason: () => null,
  // transitionPermissionMode de paso: en estos tests devuelve el ctx de
  // entrada sin cambios.
  transitionPermissionMode: (
    _from: string,
    _to: string,
    ctx: unknown,
  ) => ctx,
}))

const { getNextPermissionMode } = await import('../getNextPermissionMode.js')

const ORIGINAL_USER_TYPE = process.env.USER_TYPE

beforeEach(() => {
  isAutoModeGateEnabledStub = () => false
  delete process.env.USER_TYPE
})
afterEach(() => {
  if (ORIGINAL_USER_TYPE === undefined) delete process.env.USER_TYPE
  else process.env.USER_TYPE = ORIGINAL_USER_TYPE
})

// Fabrica minima de ctx, para no construir la forma completa de
// ToolPermissionContext en cada test.
function ctx(overrides: Record<string, unknown> = {}): any {
  return {
    mode: 'default',
    isAutoModeAvailable: false,
    isBypassPermissionsModeAvailable: false,
    ...overrides,
  }
}

describe('getNextPermissionMode (non-ant user)', () => {
  test('default → acceptEdits', () => {
    expect(getNextPermissionMode(ctx({ mode: 'default' }))).toBe('acceptEdits')
  })
  test('acceptEdits → plan', () => {
    expect(getNextPermissionMode(ctx({ mode: 'acceptEdits' }))).toBe('plan')
  })
  test('plan → default (when bypass not available)', () => {
    expect(getNextPermissionMode(ctx({ mode: 'plan' }))).toBe('default')
  })
  test('plan → bypassPermissions (when bypass available)', () => {
    expect(
      getNextPermissionMode(
        ctx({ mode: 'plan', isBypassPermissionsModeAvailable: true }),
      ),
    ).toBe('bypassPermissions')
  })
  test('bypassPermissions → default', () => {
    expect(getNextPermissionMode(ctx({ mode: 'bypassPermissions' }))).toBe(
      'default',
    )
  })
  test('dontAsk → default (fallback)', () => {
    expect(getNextPermissionMode(ctx({ mode: 'dontAsk' }))).toBe('default')
  })
  test('unknown mode → default', () => {
    expect(getNextPermissionMode(ctx({ mode: 'someFutureMode' }))).toBe(
      'default',
    )
  })
})

describe('getNextPermissionMode (ant user — auto mode replaces accept/plan)', () => {
  beforeEach(() => {
    process.env.USER_TYPE = 'ant'
  })

  test('default → default (ant, no bypass, no auto)', () => {
    expect(getNextPermissionMode(ctx({ mode: 'default' }))).toBe('default')
  })

  test('default → bypassPermissions (ant, bypass available)', () => {
    expect(
      getNextPermissionMode(
        ctx({ mode: 'default', isBypassPermissionsModeAvailable: true }),
      ),
    ).toBe('bypassPermissions')
  })

  // Los tests de entrada al modo automatico necesitan que
  // feature('TRANSCRIPT_CLASSIFIER') sea true, pero el feature() de bun:bundle
  // esta apagado bajo `bun test`: no se aplica ningun define de
  // STABLE_FEATURES. El camino automatico es por tanto inalcanzable aqui, y
  // todo sitio de llamada que habria devuelto 'auto' cae a 'default'. Se
  // asevera esa caida para que el test signifique algo en el modo de ejecucion
  // actual.

  test('default → default (ant, no bypass, auto path unreachable in test mode)', () => {
    isAutoModeGateEnabledStub = () => true
    expect(
      getNextPermissionMode(
        ctx({ mode: 'default', isAutoModeAvailable: true }),
      ),
    ).toBe('default')
  })

  test('default → default (ant, auto context flag set but gate disabled)', () => {
    isAutoModeGateEnabledStub = () => false
    expect(
      getNextPermissionMode(
        ctx({ mode: 'default', isAutoModeAvailable: true }),
      ),
    ).toBe('default')
  })
})

describe('cycle entry from plan/bypass (auto path unreachable in test mode)', () => {
  beforeEach(() => {
    isAutoModeGateEnabledStub = () => true
  })

  test('plan → default when no bypass available', () => {
    expect(
      getNextPermissionMode(
        ctx({ mode: 'plan', isAutoModeAvailable: true }),
      ),
    ).toBe('default')
  })

  test('bypassPermissions → default', () => {
    expect(
      getNextPermissionMode(
        ctx({ mode: 'bypassPermissions', isAutoModeAvailable: true }),
      ),
    ).toBe('default')
  })

  test('plan → bypassPermissions when bypass available', () => {
    expect(
      getNextPermissionMode(
        ctx({
          mode: 'plan',
          isBypassPermissionsModeAvailable: true,
          isAutoModeAvailable: true,
        }),
      ),
    ).toBe('bypassPermissions')
  })
})
