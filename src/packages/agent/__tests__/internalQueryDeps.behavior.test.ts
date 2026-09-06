import { describe, expect, test } from 'bun:test'

import { readFileSync } from 'fs'
import { resolve } from 'path'

/**
 * Porte de `ccnmt: packages/agent/__tests__/internalQueryDeps.behavior.test.ts`
 * (verbatim en casos, datos y expectativas). Pins a nivel de fuente para
 * `internal/queryDeps.ts` — la superficie de inyección de dependencias que
 * usa `query.ts` para invocar al modelo y a la compactación.
 *
 * Invariantes críticos:
 *  1. callModel es el `queryModelWithStreaming` REAL (NO enrutado por un
 *     binding) — el import directo mantiene la ruta caliente de streaming
 *     sin sobrecosto.
 *  2. microcompact: binding del host con optional-chaining. Si el host no
 *     devuelve nada, cae a `{ messages }` (pass-through, NO un crash). El
 *     array de mensajes original queda intacto.
 *  3. autocompact: binding del host con optional-chaining. Si el host no
 *     devuelve nada, devuelve `{ wasCompacted: false }` — el loop
 *     continúa, no hubo compactación, ninguna mentira de "acabamos de
 *     compactar".
 *  4. uuid es el `randomUUID` de crypto — NO un contador ni un stub
 *     determinista. Una regresión que meta un contador colisionaría entre
 *     queries en paralelo.
 *  5. rapidRefillBreakerTripped es parte del tipo de retorno de
 *     autocompact. El loop de la query lo revisa para salir con razón
 *     'rapid_refill_breaker' en vez de seguir compactando.
 *
 * Este test NUNCA importa/ejecuta el módulo — sólo lee su texto fuente
 * (`readFileSync`) y lo compara contra los patrones pinneados. Por eso el
 * import de `@claude-code-how-works/provider/claudeLegacy` que la fuente
 * declara (paquete hermano ausente en este árbol) no rompe nada al correr
 * esta suite: nunca se resuelve, porque nunca se ejecuta.
 */
describe('internal/queryDeps', () => {
  const source = readFileSync(
    resolve(__dirname, '..', 'internal', 'queryDeps.ts'),
    'utf-8',
  )

  describe('production wiring', () => {
    test('callModel is the REAL queryModelWithStreaming (no host indirection)', () => {
      // Pin: direct module import. A future refactor that routes callModel
      // through host bindings would add a function-call layer to the
      // streaming hot path.
      expect(source).toMatch(
        /import \{ queryModelWithStreaming \} from '@claude-code-how-works\/provider\/claudeLegacy'/,
      )
      expect(source).toMatch(/callModel: queryModelWithStreaming/)
    })

    test('uuid is crypto randomUUID (NOT a counter or stub)', () => {
      // Pin: collision across parallel queries breaks message dedup.
      expect(source).toMatch(/import \{ randomUUID \} from 'crypto'/)
      expect(source).toMatch(/uuid: randomUUID/)
    })
  })

  describe('microcompact fallback', () => {
    test('host binding called via optional chain', () => {
      expect(source).toMatch(
        /microcompact: async [\s\S]{0,200}?getAgentHostBindings\(\)\.microcompactMessages\?\.\(/,
      )
    })

    test('fallback is `{ messages }` (pass-through, NOT empty)', () => {
      // Pin: if microcompact host binding is absent, return the input
      // messages unchanged. A regression to `{ messages: [] }` would
      // silently drop history.
      expect(source).toMatch(
        /microcompactMessages\?\.\([\s\S]{0,200}?\)\)\s*\?\?\s*\{ messages \}/,
      )
    })

    test('arity: 3 args passed through (messages, ctx, source)', () => {
      expect(source).toMatch(
        /microcompactMessages\?\.\(\s*\n?\s*messages,\s*\n?\s*toolUseContext,\s*\n?\s*querySource,\s*\n?\s*\)/,
      )
    })
  })

  describe('autocompact fallback', () => {
    test('host binding called via optional chain', () => {
      expect(source).toMatch(
        /autocompact: async [\s\S]{0,400}?getAgentHostBindings\(\)\.autoCompactIfNeeded\?\.\(/,
      )
    })

    test('fallback is `{ wasCompacted: false }` (NOT true, NOT a lie)', () => {
      // Pin: missing host MUST report no compaction happened. A regression
      // to `{ wasCompacted: true }` would make the query loop skip its
      // continuation logic.
      expect(source).toMatch(
        /autoCompactIfNeeded\?\.\([\s\S]+?\)\)\s*\?\?\s*\{ wasCompacted: false \}/,
      )
    })

    test('passes all 6 args (msgs, ctx, cacheSafe, source, tracking, snipTokensFreed)', () => {
      expect(source).toMatch(
        /autoCompactIfNeeded\?\.\(\s*\n?\s*messages,\s*\n?\s*toolUseContext,\s*\n?\s*cacheSafeParams,\s*\n?\s*querySource,\s*\n?\s*tracking,\s*\n?\s*snipTokensFreed,/,
      )
    })

    test('return type declares rapidRefillBreakerTripped (V8 reason: rapid_refill_breaker)', () => {
      // Pin: ant 3970.js — autocompact bails out when the breaker trips;
      // caller exits the query loop with reason "rapid_refill_breaker"
      // instead of looping into more compaction.
      expect(source).toMatch(/rapidRefillBreakerTripped\?:\s*boolean/)
    })

    test('return type declares consecutiveRapidRefills (companion counter)', () => {
      expect(source).toMatch(/consecutiveRapidRefills\?:\s*number/)
    })

    test('return type declares consecutiveFailures (also tracked)', () => {
      expect(source).toMatch(/consecutiveFailures\?:\s*number/)
    })
  })

  test('QueryDeps type EXPORTED for downstream typing', () => {
    expect(source).toMatch(/^export type QueryDeps = \{/m)
  })

  test('productionDeps EXPORTED (consumed by query.ts)', () => {
    expect(source).toMatch(/^export function productionDeps\(\): QueryDeps/m)
  })
})
