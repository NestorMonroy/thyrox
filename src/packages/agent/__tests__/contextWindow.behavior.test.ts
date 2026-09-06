import { describe, expect, test } from 'bun:test'

import { readFileSync } from 'fs'
import { resolve } from 'path'

/**
 * Porte de `ccnmt: packages/agent/__tests__/contextWindow.behavior.test.ts`.
 *
 * Pin a nivel de fuente para getContextWindowForModel + has1mContext +
 * modelSupports1M (agent/context.ts).
 *
 * El contexto de 1M es GA para Opus 4.7 / 4.6 / Sonnet 4.x. Fallar estos
 * defaults tiene dos severidades:
 *   - 200K cuando debería ser 1M: la compactación dispara ~5× demasiado
 *     pronto. Los usuarios lo notan (montones de adjuntos de "compactación"
 *     a mitad de tarea).
 *   - 1M cuando el modelo no lo soporta: la API rechaza con 400 "context
 *     limit exceeded" en cuanto el input cruza los 200K.
 *
 * CLAUDE_CODE_DISABLE_1M_CONTEXT=1 es la vía de escape para HIPAA (fuerza
 * 200K) — debe respetarse en todo lugar donde se consulte has1m /
 * modelSupports1M.
 */
describe('detección de contexto de 1M (vs el gate de modelo ant)', () => {
  const source = readFileSync(
    resolve(__dirname, '..', 'context.ts'),
    'utf-8',
  )

  test('CLAUDE_CODE_DISABLE_1M_CONTEXT corta has1mContext a false', () => {
    expect(source).toMatch(
      /export function has1mContext\(model: string\): boolean \{[\s\S]*?if\s*\(is1mContextDisabled\(\)\)\s*\{?\s*\n?\s*return false/,
    )
  })

  test('marcador de sufijo [1m] reconocido (opt-in legacy de Sonnet 4.0)', () => {
    expect(source).toMatch(/\/\\\[1m\\\]\/i\.test\(model\)/)
  })

  test('modelSupports1M incluye las TRES familias de modelo con 1M GA', () => {
    expect(source).toMatch(/canonical\.includes\('claude-sonnet-4'\)/)
    expect(source).toMatch(/canonical\.includes\('opus-4-7'\)/)
    expect(source).toMatch(/canonical\.includes\('opus-4-6'\)/)
  })

  test('modelSupports1M EXCLUYE Haiku 4.5 (genuinamente 200K)', () => {
    // Sin haiku en la lista explícita. Se fija por ausencia.
    const fnStart = source.indexOf('export function modelSupports1M')
    const fnEnd = source.indexOf('\n}', fnStart) + 2
    const fnBody = source.slice(fnStart, fnEnd)
    expect(fnBody).not.toMatch(/haiku/i)
  })

  test('getContextWindowForModel: el override de CLAUDE_CODE_MAX_CONTEXT_TOKENS (ant) va PRIMERO', () => {
    // El orden importa — si el chequeo de [1m] corriera primero, el
    // override de entorno no podría achicar la ventana para pruebas. Se
    // fija el orden.
    const fnStart = source.indexOf('export function getContextWindowForModel')
    const fnSlice = source.slice(fnStart, fnStart + 2000)
    const envOverrideIdx = fnSlice.indexOf("readEnv('CLAUDE_CODE_MAX_CONTEXT_TOKENS')")
    const has1mIdx = fnSlice.indexOf('has1mContext(model)')
    expect(envOverrideIdx).toBeGreaterThan(0)
    expect(envOverrideIdx).toBeLessThan(has1mIdx)
  })

  test('se devuelve 1M para Opus 4.7 / 4.6 / Sonnet 4.x ANTES de caer al default de 200K', () => {
    const fnStart = source.indexOf('export function getContextWindowForModel')
    const fnSlice = source.slice(fnStart, fnStart + 2000)
    expect(fnSlice).toMatch(
      /if\s*\(modelSupports1M\(model\)\)\s*\{?\s*\n?\s*return 1_000_000/,
    )
  })

  test('cae a MODEL_CONTEXT_WINDOW_DEFAULT (200K) cuando ninguna aplica', () => {
    const fnStart = source.indexOf('export function getContextWindowForModel')
    const fnSlice = source.slice(fnStart, fnStart + 2500)
    expect(fnSlice).toMatch(/return MODEL_CONTEXT_WINDOW_DEFAULT/)
  })
})
