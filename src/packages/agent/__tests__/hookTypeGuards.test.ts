/**
 * Porte de `ccnmt: packages/agent/__tests__/hookTypeGuards.test.ts` —
 * guardas de tipo de hook que gobiernan el enrutamiento sync/async del
 * despacho.
 *
 * Una clasificación equivocada produce, o bien:
 *   - un hook async tratado como sync: quien llama espera un resultado
 *     que nunca llega de forma síncrona, cuelga el turno
 *   - un hook sync tratado como async: quien llama asume que devuelve una
 *     promesa, pero volvió de inmediato, y la salida se descarta
 *
 * `isHookEvent` protege la superficie de la API — aceptar una cadena
 * desconocida como nombre de `HookEvent` deja que la configuración
 * derive en silencio.
 *
 * DIVERGENCIA DE IMPORT, declarada: la fuente importa `HookJSONOutput` de
 * `@claude-code-how-works/headless-sdk/agentSdkTypes.js`, paquete ausente
 * en este árbol. Se importa en su lugar el tipo homónimo declarado en
 * `../types/hooks.ts` (mismo pase, mismo stub estructural
 * `Record<string, unknown>` que la fuente misma usa en su capa generada —
 * ver el docstring de ese archivo).
 */
import { describe, expect, test } from 'bun:test'
import {
  isAsyncHookJSONOutput,
  isHookEvent,
  isSyncHookJSONOutput,
} from '../types/hooks.js'
import type { HookJSONOutput } from '../types/hooks.js'

describe('isHookEvent — guarda de tipo para la unión de cadenas HookEvent', () => {
  test('acepta eventos conocidos', () => {
    expect(isHookEvent('PreToolUse')).toBe(true)
    expect(isHookEvent('PostToolUse')).toBe(true)
    expect(isHookEvent('Stop')).toBe(true)
    expect(isHookEvent('SessionStart')).toBe(true)
    expect(isHookEvent('Notification')).toBe(true)
  })

  test('rechaza nombres de evento desconocidos', () => {
    expect(isHookEvent('SomeFutureEvent')).toBe(false)
    expect(isHookEvent('preToolUse')).toBe(false) // distingue mayúsculas
    expect(isHookEvent('PRE_TOOL_USE')).toBe(false) // mayúsculas-con-guion-bajo
    expect(isHookEvent('')).toBe(false)
  })

  test('rechaza nombres parecidos a erratas', () => {
    // Atrapa erratas comunes que habrían deshabilitado hooks en silencio.
    expect(isHookEvent('PreTooluse')).toBe(false) // mayúscula equivocada
    expect(isHookEvent('PreToolUsage')).toBe(false)
    expect(isHookEvent('PostUseTool')).toBe(false)
  })
})

describe('isSyncHookJSONOutput — guarda de unión discriminada', () => {
  test('objeto sin la clave async → sync (true)', () => {
    expect(isSyncHookJSONOutput({} as HookJSONOutput)).toBe(true)
  })

  test('objeto con async: false → sync (true)', () => {
    expect(
      isSyncHookJSONOutput({ async: false } as unknown as HookJSONOutput),
    ).toBe(true)
  })

  test('objeto con async: true → NO es sync', () => {
    expect(
      isSyncHookJSONOutput({ async: true } as unknown as HookJSONOutput),
    ).toBe(false)
  })

  test('objeto con async: undefined → sync (sin clave async tras el delete)', () => {
    // Documentado: sólo async===true rechaza. Los valores falsy son sync.
    expect(
      isSyncHookJSONOutput({ async: undefined } as unknown as HookJSONOutput),
    ).toBe(true)
  })

  test('objeto con continue/decision (campo sync) → sync', () => {
    expect(
      isSyncHookJSONOutput({
        continue: true,
        decision: 'approve',
      } as HookJSONOutput),
    ).toBe(true)
  })

  test('objeto con async: 1 (truthy no-booleano) → SIGUE siendo sync (=== estricto)', () => {
    // Documentado: sólo async===true EXACTO dispara la clasificación async.
    expect(
      isSyncHookJSONOutput({ async: 1 } as unknown as HookJSONOutput),
    ).toBe(true)
  })
})

describe('isAsyncHookJSONOutput — guarda inversa', () => {
  test('async: true → async (true)', () => {
    expect(
      isAsyncHookJSONOutput({ async: true } as unknown as HookJSONOutput),
    ).toBe(true)
  })

  test('async: false → NO es async', () => {
    expect(
      isAsyncHookJSONOutput({ async: false } as unknown as HookJSONOutput),
    ).toBe(false)
  })

  test('objeto sin la clave async → NO es async', () => {
    expect(isAsyncHookJSONOutput({} as HookJSONOutput)).toBe(false)
  })

  test('async: 1 (truthy) → NO es async (=== estricto)', () => {
    expect(
      isAsyncHookJSONOutput({ async: 1 } as unknown as HookJSONOutput),
    ).toBe(false)
  })

  test('async: "true" (cadena) → NO es async', () => {
    expect(
      isAsyncHookJSONOutput({ async: 'true' } as unknown as HookJSONOutput),
    ).toBe(false)
  })
})

describe('isSyncHookJSONOutput / isAsyncHookJSONOutput — partición exhaustiva', () => {
  test('toda entrada es EXACTAMENTE una de sync O async (mutuamente excluyentes)', () => {
    const cases = [
      {} as HookJSONOutput,
      { async: false } as unknown as HookJSONOutput,
      { async: true } as unknown as HookJSONOutput,
      { continue: true } as HookJSONOutput,
      { decision: 'approve' } as HookJSONOutput,
      { async: undefined } as unknown as HookJSONOutput,
    ]
    for (const c of cases) {
      const sync = isSyncHookJSONOutput(c)
      const async = isAsyncHookJSONOutput(c)
      // XOR: exactamente una de las dos es true.
      expect(sync !== async).toBe(true)
    }
  })
})
