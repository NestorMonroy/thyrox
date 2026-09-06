import { describe, expect, test } from 'bun:test'

import { readFileSync } from 'fs'
import { resolve } from 'path'

/**
 * Porte de `ccnmt: packages/agent/__tests__/internalMacroFallback.behavior.test.ts`
 * (verbatim en casos, datos y expectativas). Pin a nivel de fuente para
 * `internal/macroFallback.ts` — rellena `globalThis.MACRO` cuando se corre
 * bajo bun:test u otros runtimes que no recibieron los `MACRO` defines de
 * build-time.
 *
 * Es una red de seguridad load-bearing: muchos módulos importan MACRO a
 * nivel de módulo (p. ej. `if (MACRO.VERSION === '...')`). Si MACRO está
 * `undefined` cuando esos módulos cargan, el import revienta con un
 * ReferenceError ANTES de que corra ningún test.
 *
 * Invariantes:
 *  1. El fallback SÓLO dispara cuando MACRO está `undefined` (guard con
 *     typeof). Los builds de producción reciben valores reales vía
 *     scripts/defines.ts, así que NO se pueden pisar.
 *  2. VERSION cae a la variable de entorno CLAUDE_CODE_VERSION, y luego a
 *     '1.carus.000' (prefijo identificador ccb — distingue test/fallback
 *     de un build real de Anthropic).
 *  3. BUILD_TIME es `new Date().toISOString()` (hora actual, NO el epoch
 *     ni una cadena vacía).
 *  4. Defaults de cadena vacía para {FEEDBACK_CHANNEL, ISSUES_EXPLAINER,
 *     NATIVE_PACKAGE_URL, PACKAGE_URL, VERSION_CHANGELOG}. Se fijan los
 *     defaults vacíos para que analytics/mocks de test no vean `undefined`.
 *
 * Este test NUNCA importa/ejecuta el módulo — sólo lee su texto fuente
 * (`readFileSync`) y lo compara contra los patrones pinneados. Por eso el
 * import de `@claude-code-how-works/config/env` que la fuente declara
 * (paquete hermano ausente en este árbol) no rompe nada al correr esta
 * suite: nunca se resuelve, porque nunca se ejecuta.
 */
describe('internal/macroFallback', () => {
  const source = readFileSync(
    resolve(__dirname, '..', 'internal', 'macroFallback.ts'),
    'utf-8',
  )

  test('typeof guard against existing MACRO (no clobber)', () => {
    // Pin: production builds inject MACRO at build time. The fallback
    // MUST guard against overwriting it.
    expect(source).toMatch(/if \(typeof globalThis\.MACRO === 'undefined'\)/)
  })

  test('VERSION priority: CLAUDE_CODE_VERSION env → "1.carus.000" literal', () => {
    expect(source).toMatch(
      /VERSION: readEnv\('CLAUDE_CODE_VERSION'\) \|\| '1\.carus\.000'/,
    )
  })

  test('BUILD_TIME is new Date().toISOString() (current time)', () => {
    expect(source).toMatch(/BUILD_TIME: new Date\(\)\.toISOString\(\)/)
  })

  test('FEEDBACK_CHANNEL defaults to empty string', () => {
    // Pin: analytics code expects a string (possibly empty), not undefined.
    expect(source).toMatch(/FEEDBACK_CHANNEL: ''/)
  })

  test('ISSUES_EXPLAINER / NATIVE_PACKAGE_URL / PACKAGE_URL / VERSION_CHANGELOG all "" defaults', () => {
    expect(source).toMatch(/ISSUES_EXPLAINER: ''/)
    expect(source).toMatch(/NATIVE_PACKAGE_URL: ''/)
    expect(source).toMatch(/PACKAGE_URL: ''/)
    expect(source).toMatch(/VERSION_CHANGELOG: ''/)
  })

  test('readEnv is imported from @claude-code-how-works/config/env', () => {
    // Pin: NOT process.env directly — the canonical readEnv allows test
    // overrides and is the only env read sanctioned by the doctor.
    expect(source).toMatch(
      /import \{ readEnv \} from '@claude-code-how-works\/config\/env'/,
    )
  })

  test('module has `export {}` to mark it as a module (side-effect import)', () => {
    // Pin: callers do `import './macroFallback.js'` for the side effect.
    // Removing `export {}` makes it a script — TS warns, but more
    // importantly, breaks the dual-context rule.
    expect(source).toMatch(/^export \{\}/m)
  })

  test('side-effect-only module — no exported functions/values', () => {
    // Pin: NO export function/const/class. This module is purely side-
    // effecting; exposing names would invite drift.
    expect(source).not.toMatch(/^export (function|const|class|interface|type)/m)
  })
})
