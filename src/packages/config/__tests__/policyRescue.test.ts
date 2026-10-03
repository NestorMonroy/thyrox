/**
 * La porción de `Ty` (`chunk-379zyrv7.js`, ejecutable 2.1.283; extracción en
 * `.claude/workbench/policy-settings-port-20260927T083804/`) que
 * `./policyFieldRescue.ts` no cubre: la lista `removed`, las claves de nivel
 * superior que el documento traía, contaban como escritura de política real
 * (`Ed`/`isPolicyNoOp`) y desaparecieron del rescate sin que ningún aviso
 * previo ya lo explique.
 */
import { describe, expect, test } from 'bun:test'
import * as R from '../settings/policyRescue.ts'

describe('removedPolicyKeys (la porción de Ty no cubierta por policyFieldRescue)', () => {
  test('una clave puesta a null y ausente del rescate se reporta retirada', () => {
    expect(R.removedPolicyKeys({ model: null }, {}, [])).toEqual(['model'])
  })

  test('una clave que sigue presente en el rescate no se reporta, aunque sea un no-op', () => {
    expect(R.removedPolicyKeys({ model: null }, { model: null }, [])).toEqual([])
  })

  test('una clave con valor real (no no-op) que desaparece no se reporta: Ed sólo cubre retiros intencionales', () => {
    expect(R.removedPolicyKeys({ model: 'nope' }, {}, [])).toEqual([])
  })

  test('un aviso previo NO statusOnly en la misma ruta ya explica la ausencia: no se duplica', () => {
    const issues = [{ path: 'model', message: 'm' }]
    expect(R.removedPolicyKeys({ model: null }, {}, issues)).toEqual([])
  })

  test('un aviso previo statusOnly en la misma ruta NO excluye: sigue siendo una retirada sin explicar', () => {
    const issues = [{ path: 'model', message: 'm', statusOnly: true }]
    expect(R.removedPolicyKeys({ model: null }, {}, issues)).toEqual(['model'])
  })

  test('un aviso previo en una ruta anidada bajo la clave también la excluye', () => {
    const issues = [{ path: 'model.sub', message: 'm' }]
    expect(R.removedPolicyKeys({ model: null }, {}, issues)).toEqual([])
  })

  test('un aviso en otra ruta no excluye la clave retirada', () => {
    const issues = [{ path: 'other', message: 'm' }]
    expect(R.removedPolicyKeys({ model: null }, {}, issues)).toEqual(['model'])
  })

  test('varias claves retiradas sin explicación se reportan todas, en orden del documento', () => {
    expect(R.removedPolicyKeys({ a: null, b: 'x', c: null }, {}, [])).toEqual(['a', 'c'])
  })

  test('un documento vacío no reporta nada', () => {
    expect(R.removedPolicyKeys({}, {}, [])).toEqual([])
  })

  test('el no-op de una puerta "disable" también cuenta, vía isPolicyNoOp (Ed)', () => {
    const gates = [{ key: 'disableAutoMode', restrictive: 'disable' as const }]
    expect(R.removedPolicyKeys({ disableAutoMode: false }, {}, [], gates)).toEqual(['disableAutoMode'])
  })
})
