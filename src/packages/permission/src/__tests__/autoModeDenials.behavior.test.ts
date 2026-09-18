import { describe, expect, test } from 'bun:test'

import { readFileSync } from 'fs'
import { resolve } from 'path'

import {
  getAutoModeDenials,
  recordAutoModeDenial,
} from '../autoModeDenials.ts'

/**
 * Copia de `ccnmt: packages/permission/src/__tests__/autoModeDenials.behavior.test.ts`
 * con los comentarios traducidos; el cuerpo es el de la fuente.
 *
 * Fija `autoModeDenials.ts` — el buffer circular en memoria que alimenta el
 * `RecentDenialsTab` de /permissions.
 *
 * Nota sobre el alcance del test: bun:test corre con las feature flags
 * APAGADAS (ver `feedback_bun_test_feature_flags_off.md`).
 * TRANSCRIPT_CLASSIFIER está tras una puerta, así que en este entorno
 * `recordAutoModeDenial` es un no-op. Lo que se fija son los comportamientos
 * de FORMA que siguen siendo observables:
 *   1. `getAutoModeDenials` devuelve un arreglo, NO `undefined`.
 *   2. `recordAutoModeDenial` es un no-op con la feature flag apagada (el
 *      estado no cambia tras la llamada).
 *   3. El tope MAX_DENIALS vale 20 en la fuente.
 *   4. El nombre de la puerta es 'TRANSCRIPT_CLASSIFIER' en la fuente.
 */
describe('autoModeDenials — runtime', () => {
  test('getAutoModeDenials returns array (readonly)', () => {
    const result = getAutoModeDenials()
    expect(Array.isArray(result)).toBe(true)
  })

  test('record under feature-flag-off (bun:test) is no-op', () => {
    // bun:test → `feature('TRANSCRIPT_CLASSIFIER') === false` →
    // `recordAutoModeDenial` vuelve sin mutar nada.
    const before = getAutoModeDenials()
    recordAutoModeDenial({
      toolName: 'Bash',
      display: 'rm -rf /',
      reason: 'dangerous',
      timestamp: Date.now(),
    })
    const after = getAutoModeDenials()
    // Las dos son la misma referencia (o al menos tienen la misma longitud).
    expect(after.length).toBe(before.length)
  })

  test('returned array is readonly (TypeScript)', () => {
    // Fijado: el tipo de retorno es `readonly AutoModeDenial[]`. No se puede
    // imponer la sólo-lectura en tiempo de ejecución con `Object.freeze`,
    // pero sí fijar que el resultado ES el arreglo vivo, no una copia que
    // cuesta N.
    const a = getAutoModeDenials()
    const b = getAutoModeDenials()
    // La misma referencia (sin copia defensiva).
    expect(a).toBe(b)
  })
})

describe('autoModeDenials — source pins', () => {
  const source = readFileSync(
    resolve(__dirname, '..', 'autoModeDenials.ts'),
    'utf-8',
  )

  test('MAX_DENIALS = 20 (ring buffer cap)', () => {
    // Fijado: el presupuesto de scroll de la interfaz. Subirlo dispararía la
    // memoria si se acumulan muchas denegaciones deprisa; bajarlo ocultaría
    // historial.
    expect(source).toMatch(/MAX_DENIALS = 20/)
  })

  test('Feature gate name: TRANSCRIPT_CLASSIFIER', () => {
    // Fijado: tiene que coincidir con `scripts/default-features.ts` y con el
    // registro de feature flags. Una errata haría que siempre se saltara, en
    // silencio.
    expect(source).toMatch(/feature\('TRANSCRIPT_CLASSIFIER'\)/)
  })

  test('recordAutoModeDenial early-returns when flag off', () => {
    expect(source).toMatch(
      /if \(!feature\('TRANSCRIPT_CLASSIFIER'\)\) return/,
    )
  })

  test('ring buffer uses prepend + slice (LIFO order)', () => {
    // Fijado: `[newest, ...prev.slice(0, MAX_DENIALS - 1)]`. La interfaz
    // muestra la más reciente arriba. Una regresión a `[...prev, newest]`
    // pondría la más antigua primero y o crecería sin cota o dejaría caer la
    // más reciente.
    expect(source).toMatch(
      /DENIALS = \[denial, \.\.\.DENIALS\.slice\(0, MAX_DENIALS - 1\)\]/,
    )
  })

  test('AutoModeDenial type has 4 fields: toolName, display, reason, timestamp', () => {
    // Fijado: el formato de intercambio para la interfaz.
    expect(source).toMatch(/toolName: string/)
    expect(source).toMatch(/display: string/)
    expect(source).toMatch(/reason: string/)
    expect(source).toMatch(/timestamp: number/)
  })

  test('module-level DENIALS is `let` (not const) — required for ring buffer mutation', () => {
    // Fijado: un `const` impediría la reasignación. El patrón de reasignar
    // un inmutable (un arreglo nuevo cada vez) es el correcto; fijar `let` es
    // la pista estructural de que se usa ese patrón.
    expect(source).toMatch(
      /let DENIALS: readonly AutoModeDenial\[\] = \[\]/,
    )
  })
})
