import { describe, expect, test } from 'bun:test'

import { readFileSync } from 'fs'
import { resolve } from 'path'

/**
 * Pines a nivel de fuente para `internal/sessionRuntime.ts` — fachadas de
 * session-id / cwd / presupuesto de tokens. Cada una tiene un fallback
 * determinista usado en tests y en escenarios previos a la instalación del
 * host. Porte de
 * `ccnmt: packages/agent/__tests__/internalSessionRuntime.behavior.test.ts`.
 *
 * Invariantes clave:
 *  1. El fallback de `getSessionId` es "unknown" (el centinela que la
 *     telemetría espera cuando no arrancó ninguna sesión).
 *  2. `getCwdState` encadena DOS fallbacks del host (cwd actual → cwd
 *     original) antes de caer en `process.cwd()`. El orden importa: un
 *     turno puede haber hecho `cd`, y se quiere la ruta actual, no la de
 *     arranque.
 *  3. `getOriginalCwd` cae directo en `process.cwd()` (un solo fallback).
 *  4. `isSessionPersistenceDisabled` cae en FALSE por defecto (persistencia
 *     encendida por defecto — una regresión a true descartaría sesiones en
 *     silencio).
 */
describe('internal/sessionRuntime fallbacks', () => {
  const source = readFileSync(
    resolve(__dirname, '..', 'internal', 'sessionRuntime.ts'),
    'utf-8',
  )

  test('getSessionId cae en el literal "unknown"', () => {
    // Pin: NO '' ni 'no-session'. La telemetría hace join sobre este valor
    // exacto.
    expect(source).toMatch(/getSessionId\?\.\(\) \?\? 'unknown'/)
  })

  test('getSdkBetas: sin host → [] (NO undefined)', () => {
    // Pin: quien llama esparce ...getSdkBetas() dentro de un arreglo de
    // headers.
    expect(source).toMatch(/getSdkBetas\?\.\(\) \?\? \[\]/)
  })

  test('getCurrentTurnTokenBudget: sin host → 0', () => {
    expect(source).toMatch(/getCurrentTurnTokenBudget\?\.\(\) \?\? 0/)
  })

  test('getTurnOutputTokens: sin host → 0', () => {
    expect(source).toMatch(/getTurnOutputTokens\?\.\(\) \?\? 0/)
  })

  test('incrementBudgetContinuationCount: sin host → no-op silencioso (void)', () => {
    // Pin: retorno void; ningún resultado observable.
    expect(source).toMatch(
      /incrementBudgetContinuationCount\?\.\(\)/,
    )
  })

  test('cadena de getCwdState: actual → original → process.cwd()', () => {
    // Pin: fallback de 3 niveles. El orden es crítico — primero el
    // actual, para que un /cd del turno se refleje, cayendo al directorio
    // de arranque original, y luego al default del proceso.
    expect(source).toMatch(
      /getCwdState\?\.\(\) \?\?\s*\n?\s*getAgentHostBindings\(\)\.getOriginalCwd\?\.\(\) \?\?\s*\n?\s*process\.cwd\(\)/,
    )
  })

  test('getOriginalCwd: sin host → process.cwd() (el directorio de arranque del binario)', () => {
    // Pin: fallback más simple. NO encadenado — el cwd original es
    // exactamente ese.
    expect(source).toMatch(
      /getOriginalCwd\?\.\(\) \?\? process\.cwd\(\)/,
    )
  })

  test('setCwdState: optional-chain (no-op sin host)', () => {
    expect(source).toMatch(/setCwdState\?\.\(cwd\)/)
  })

  test('isSessionPersistenceDisabled cae en FALSE (persistencia encendida por defecto)', () => {
    // Pin: invariante crítico de UX. Una regresión a `?? true`
    // desactivaría la persistencia de sesión en silencio, descartando el
    // historial de conversación en cada salida.
    expect(source).toMatch(
      /isSessionPersistenceDisabled\?\.\(\) \?\? false/,
    )
  })
})
