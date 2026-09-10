import { describe, expect, test } from 'bun:test'

import { readFileSync } from 'fs'
import { resolve } from 'path'

/**
 * Pines a nivel de fuente para `internal/sdkRuntime.ts` — 6 fachadas que
 * alimentan el sobre de resultado del SDK (errores / duración / costo / uso
 * de modelo). Porte de
 * `ccnmt: packages/agent/__tests__/internalSdkRuntime.behavior.test.ts`.
 *
 * Invariantes críticos:
 *  1. `getTotalCost` / `getTotalAPIDuration` caen a 0 (cero NUMÉRICO, no
 *     null/undefined). El sobre de resultado multiplica estos valores.
 *  2. `categorizeRetryableAPIError` HACE ECO del error de entrada cuando no
 *     hay clasificador del host — quien llama sigue teniendo el error
 *     original para mostrarlo, no se traga nada.
 *  3. `getFastModeState` cae a null (NO undefined). Quien llama compara
 *     `=== null` explícitamente para distinguir "apagado" de "sin
 *     configurar".
 *  4. `getInMemoryErrors` cae a [] (para que quien llama pueda iterar sin
 *     riesgo).
 *  5. `getModelUsage` cae a {} (quien llama lo esparce dentro de un
 *     resultado).
 */
describe('internal/sdkRuntime fallbacks', () => {
  const source = readFileSync(
    resolve(__dirname, '..', 'internal', 'sdkRuntime.ts'),
    'utf-8',
  )

  test('getInMemoryErrors: sin host → [] (NO undefined)', () => {
    expect(source).toMatch(/getInMemoryErrors\?\.\(\) \?\? \[\]/)
  })

  test('categorizeRetryableAPIError HACE ECO del error (sin tragárselo)', () => {
    // Pin: sin clasificador instalado, devuelve el error original sin
    // cambios. Una regresión a `?? null` descartaría errores del sobre del
    // SDK en silencio.
    expect(source).toMatch(
      /categorizeRetryableAPIError\?\.\(error\) \?\? error/,
    )
  })

  test('getTotalAPIDuration: sin host → 0', () => {
    expect(source).toMatch(/getTotalAPIDuration\?\.\(\) \?\? 0/)
  })

  test('getTotalCost: sin host → 0', () => {
    // Pin: cero numérico. Quien consume el SDK multiplica/suma esto; null
    // rompería la aritmética.
    expect(source).toMatch(/getTotalCost\?\.\(\) \?\? 0/)
  })

  test('getModelUsage: sin host → {} (NO undefined)', () => {
    // Pin: quien llama esparce con `{ ...result, model_usage: getModelUsage()
    // }`. {} es el default seguro.
    expect(source).toMatch(/getModelUsage\?\.\(\) \?\? \{\}/)
  })

  test('getFastModeState: sin host → null (distinto de undefined)', () => {
    // Pin: null señala "ningún host clasificó el modelo". Quien llama
    // compara `=== null` explícitamente. Devolver undefined dejaría que
    // cadenas `??` de quien llama sustituyan otro default.
    expect(source).toMatch(
      /getFastModeState\?\.\(model, fastMode\) \?\? null/,
    )
  })

  test('getFastModeState pasa ambos argumentos (model, fastMode)', () => {
    expect(source).toMatch(
      /getFastModeState\?\.\(model, fastMode\)/,
    )
  })

  test('las 6 fachadas se exportan', () => {
    const exports = source.match(/^export function /gm)
    expect(exports?.length).toBe(6)
  })
})
