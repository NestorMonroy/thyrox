/**
 * Paridad entre `ARG_GATED_CMDLETS` (`@thyrox/shell/powershell/dangerousCmdlets`)
 * y las entradas de `CMDLET_ALLOWLIST` que llevan
 * `additionalCommandIsDangerousCallback` (`readOnlyValidation.ts`).
 *
 * `dangerousCmdlets.ts` cita esta prueba —«asserts this set covers every
 * additionalCommandIsDangerousCallback entry»— y no existía. Lo que protege:
 * un cmdlet de la allowlist con callback se auto-permite con argumentos
 * seguros, y el diálogo de permiso sólo aparece cuando el callback rechaza. Si
 * ahí se aceptara el comodín `Cmdlet:*`, casaría por prefijo con TODA
 * invocación futura y saltaría el callback para siempre
 * (`ForEach-Object:*` → `ForEach-Object { Remove-Item -Recurse / }`).
 * `ARG_GATED_CMDLETS` alimenta `NEVER_SUGGEST`, que impide sugerir ese
 * comodín; un cmdlet con callback que falte en el conjunto es un bypass.
 *
 * Vive en tool-registry porque es el paquete que ve los dos lados: depende de
 * `@thyrox/shell` y define la allowlist. Hoy la paridad se cumple (17 y 17,
 * `cited-missing-tests-20260927T080258/probe-arg-gated.txt`); la prueba es la
 * guarda contra la deriva.
 *
 * Control de anulación, medido: sin `route` en el conjunto caen 2 y 4 (el 4
 * porque `NEVER_SUGGEST` se deriva de él); con un cmdlet de más, el 3.
 */
import { describe, expect, test } from 'bun:test'
import { ARG_GATED_CMDLETS, NEVER_SUGGEST } from '@thyrox/shell/powershell/dangerousCmdlets.js'
import { CMDLET_ALLOWLIST } from '../readOnlyValidation.js'

const withCallback = Object.entries(CMDLET_ALLOWLIST)
  .filter(([, config]) => typeof config.additionalCommandIsDangerousCallback === 'function')
  .map(([name]) => name.toLowerCase())
  .sort()

describe('ARG_GATED_CMDLETS frente a la allowlist', () => {
  test('1. hay entradas con callback que medir', () => {
    expect(withCallback.length).toBeGreaterThan(0)
  })

  test('2. cada cmdlet de la allowlist con callback está en ARG_GATED_CMDLETS', () => {
    expect(withCallback.filter(name => !ARG_GATED_CMDLETS.has(name))).toEqual([])
  })

  test('3. ARG_GATED_CMDLETS no nombra cmdlets que la allowlist no gatee', () => {
    expect([...ARG_GATED_CMDLETS].filter(name => !withCallback.includes(name))).toEqual([])
  })

  test('4. ninguno de ellos se sugiere como comodín', () => {
    expect(withCallback.filter(name => !NEVER_SUGGEST.has(name))).toEqual([])
  })
})
