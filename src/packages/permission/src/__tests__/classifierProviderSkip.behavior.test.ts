import { describe, expect, test } from 'bun:test'

import { readFileSync } from 'fs'
import { resolve } from 'path'

/**
 * Copia de `ccnmt: packages/permission/src/__tests__/classifierProviderSkip.behavior.test.ts`
 * con los comentarios traducidos; el cuerpo es el de la fuente.
 *
 * Fijado a nivel de fuente del salto de proveedor no-Anthropic del
 * clasificador de modo automático (la guarda de `classifyYoloAction` en
 * `yoloClassifier.ts`).
 *
 * Por qué a nivel de fuente: `classifyYoloAction` hace un `sideQuery` en vivo
 * y su rama de salto es lo primero que ejecuta — no hay un helper puro
 * exportado que se pueda probar con un test unitario, y bun:test corre con
 * las feature flags APAGADAS (TRANSCRIPT_CLASSIFIER está tras una puerta),
 * así que aquí el camino del clasificador no puede correr en vivo. Lo que se
 * fija es la FORMA de la guarda.
 *
 * La guarda existe porque ccb añade conexiones multi-proveedor (openai,
 * gemini, codex) sobre el mundo sólo-Anthropic de ant. El clasificador
 * construye una petición con el protocolo de Anthropic (`tool_choice`
 * forzado, `stop_sequences`) que esos protocolos no pueden honrar:
 *   - openai y gemini se enrutan a sus propios adaptadores de SDK (no hay un
 *     cuerpo de clasificador de /v1/messages de Anthropic).
 *   - codex se enruta por el adaptador de fetch de codex, que cablea
 *     `tool_choice: 'auto'` y descarta `stop_sequences` — la llamada forzada
 *     a `classify_result` queda degradada, así que Codex a menudo la omite y
 *     toda acción sale espuriamente con `shouldBlock:true`.
 *
 * Historia del defecto: la guarda listaba al principio sólo openai y gemini;
 * codex se coló y rompió el modo automático para quien usa cuenta de ChatGPT
 * (cada llamada de herramienta quedaba bloqueada en falso). Este fijado deja
 * los TRES protocolos no-Anthropic dentro del salto, para que una edición
 * futura no pueda dejar caer uno en silencio.
 */
describe('Auto-mode classifier non-Anthropic provider skip', () => {
  const source = readFileSync(
    resolve(__dirname, '..', 'yoloClassifier.ts'),
    'utf-8',
  )

  const fnStart = source.indexOf('export async function classifyYoloAction')
  expect(fnStart).toBeGreaterThan(0)
  // La guarda está al principio de la función, pero precedida de un
  // comentario explicativo largo; 2600 caracteres cubren el comentario y el
  // cuerpo de la guarda.
  const guardSlice = source.slice(fnStart, fnStart + 2600)

  test('skips openai provider', () => {
    expect(guardSlice).toMatch(/provider === 'openai'/)
  })

  test('skips gemini provider', () => {
    expect(guardSlice).toMatch(/provider === 'gemini'/)
  })

  test('skips codex provider (regression: was missing, broke ChatGPT-account auto-mode)', () => {
    expect(guardSlice).toMatch(/provider === 'codex'/)
  })

  test('all three non-Anthropic protocols are in the same skip condition', () => {
    // Un solo `if` combinado, para que el salto sea atómico — no tres ramas
    // divergentes que podrían discrepar sobre la forma devuelta.
    expect(guardSlice).toMatch(
      /provider === 'openai' \|\| provider === 'gemini' \|\| provider === 'codex'/,
    )
  })

  test('skip returns unavailable:true so the caller applies iron-gate policy', () => {
    // `unavailable:true` es lo que enruta a la decisión de fallar cerrado o
    // fallar abierto de `permissions.ts` — NO un `shouldBlock:false` pelado,
    // que permitiría en silencio. Se fijan los dos campos juntos.
    expect(guardSlice).toMatch(/shouldBlock: false/)
    expect(guardSlice).toMatch(/unavailable: true/)
  })

  test('skip reason names the provider', () => {
    expect(guardSlice).toMatch(
      /Auto mode unavailable for \$\{provider\} provider/,
    )
  })
})
