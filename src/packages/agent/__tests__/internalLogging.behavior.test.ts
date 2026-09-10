import { describe, expect, test } from 'bun:test'

import { readFileSync } from 'fs'
import { resolve } from 'path'

/**
 * Porte de `ccnmt: packages/agent/__tests__/internalLogging.behavior.test.ts`.
 *
 * Pin a nivel de fuente para `internal/logging.ts`. Son observadores de
 * catch-block / hot path que delegan en las ataduras del host — con
 * fallback a console.* para que un error NUNCA quede en silencio cuando
 * no hay host instalado.
 *
 * Tres invariantes:
 *  1. logEvent: delegado puro (telemetría) — no-op silencioso si falta el host.
 *  2. logError + logAntError: delegan si está instalado, SI NO caen a
 *     console.error. Nunca en silencio.
 *  3. logForDebugging: delegado puro (archivo de debug log) — no-op
 *     silencioso si falta el host.
 *
 * La separación delegado-vs-fallback importa: que la telemetría o el debug
 * log queden a oscuras es aceptable; que un error quede a oscuras, no.
 */
describe('internal/logging', () => {
  const source = readFileSync(
    resolve(__dirname, '..', 'internal', 'logging.ts'),
    'utf-8',
  )

  describe('logEvent (telemetría — fallback silencioso OK)', () => {
    test('delega vía optional chain (sin host = no-op)', () => {
      expect(source).toMatch(
        /logEvent\([\s\S]{0,300}?getAgentHostBindings\(\)\.logEvent\?\.\(/,
      )
    })

    test('NO fallback silencioso: sin console.* en logEvent', () => {
      // Pin: la telemetría DEBE quedar silenciosa cuando falta el sink de
      // analytics. Un refactor futuro que "siempre haga console.log de la
      // telemetría" saturaría stderr.
      const block = source.match(
        /export function logEvent\([\s\S]+?\n\}/,
      )?.[0]
      expect(block).toBeTruthy()
      expect(block).not.toMatch(/console\./)
    })
  })

  describe('logError (error — fallback console.error OBLIGATORIO)', () => {
    test('usa console.error cuando falta la atadura del host', () => {
      expect(source).toMatch(
        /logError[\s\S]{0,300}?if \(logger\) \{[\s\S]{0,200}?logger\(error\)[\s\S]{0,100}?\}\s*\n\s*console\.error\(error\)/,
      )
    })

    test('se detiene (early-return tras la llamada al host, sin log doble)', () => {
      // Pin: si dispara la atadura del host, se hace RETURN — nunca se
      // loguea dos veces.
      const block = source.match(
        /export function logError\([\s\S]+?\n\}/,
      )?.[0]
      expect(block).toMatch(/logger\(error\)\s*\n\s*return/)
    })
  })

  describe('logAntError (error con nombre — misma disciplina de fallback)', () => {
    test('pasa el message Y el error tanto al logger como a console', () => {
      // Pin: la firma es (message, error). Un regresivo que quite el campo
      // message perdería la etiqueta legible en los logs.
      expect(source).toMatch(
        /logAntError\(message: string, error: unknown\)/,
      )
      expect(source).toMatch(/logger\(message, error\)/)
      expect(source).toMatch(/console\.error\(message, error\)/)
    })

    test('early-return al acertar el host (sin log doble)', () => {
      const block = source.match(
        /export function logAntError\([\s\S]+?\n\}/,
      )?.[0]
      expect(block).toMatch(/logger\(message, error\)\s*\n\s*return/)
    })
  })

  describe('logForDebugging (archivo de debug log — fallback silencioso OK)', () => {
    test('delega vía optional chain (sin fallback a console)', () => {
      expect(source).toMatch(
        /logForDebugging\([\s\S]{0,300}?getAgentHostBindings\(\)\.logDebug\?\.\(message, metadata\)/,
      )
    })

    test('SIN fallback a console (el debug-only es silencioso si falta el sink)', () => {
      const block = source.match(
        /export function logForDebugging\([\s\S]+?\n\}/,
      )?.[0]
      expect(block).toBeTruthy()
      expect(block).not.toMatch(/console\./)
    })

    test('acepta metadata opcional', () => {
      expect(source).toMatch(/metadata\?:\s*unknown/)
    })
  })

  test('el tipo AnalyticsMetadata se re-exporta para quien lo consuma', () => {
    // Quien llama pasa metadata tipada; el re-export evita que tenga que
    // atravesar internalTypes directamente.
    expect(source).toMatch(
      /export type \{ AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS \}/,
    )
  })
})
