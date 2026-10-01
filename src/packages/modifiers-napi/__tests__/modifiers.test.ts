/**
 * Contrato de `modifiers-napi`: saber si una tecla modificadora está pulsada,
 * consultando `CGEventSourceFlagsState` de Carbon por `bun:ffi`.
 *
 * Medido con `bin/binary` sobre 2.1.283 (banco
 * `napi-contracts-20260927T073211`): el consumidor es `ker()` de
 * `chunk-e2c1dn81.js` —`a.terminal==="Apple_Terminal"&&Rt("shift")`, que
 * decide si Enter inserta un salto de línea— y la build de Linux compila la
 * consulta a `function Rt(e){return!1}` y el precalentamiento a
 * `function vt(){}`. Fuera de macOS el contrato es ése: siempre `false`, y
 * un `prewarm` sin efecto.
 *
 * Restricción técnica declarada: la consulta real exige Carbon, que sólo
 * existe en macOS. Aquí se mide la conducta fuera de macOS; en macOS esos
 * casos se saltan, y la tabla de bits de `CGEventFlags` no tiene superficie
 * pública que medir sin la llamada nativa.
 *
 * Control de anulación, medido: si la guarda de plataforma respondiera algo
 * distinto de `false`, caen 2, 3 y 4; el 1 mide la superficie y no depende
 * de ella.
 */
import { describe, expect, test } from 'bun:test'
import * as modifiers from '../src/index.ts'

const MODIFIERS = ['shift', 'control', 'option', 'command']
const notDarwin = process.platform !== 'darwin'

describe('modifiers-napi — superficie', () => {
  test('1. exporta la consulta y el precalentamiento, y nada más', () => {
    expect(Object.keys(modifiers).sort()).toEqual(['isModifierPressed', 'prewarm'])
  })
})

describe.skipIf(!notDarwin)(`modifiers-napi — fuera de macOS (${process.platform})`, () => {
  test('2. ninguna de las cuatro modificadoras se lee pulsada', () => {
    expect(MODIFIERS.map(m => [m, modifiers.isModifierPressed(m)]))
      .toEqual(MODIFIERS.map(m => [m, false]))
  })

  test('3. una modificadora desconocida tampoco, y no lanza', () => {
    expect(modifiers.isModifierPressed('hyper')).toBe(false)
    expect(modifiers.isModifierPressed('')).toBe(false)
  })

  test('4. prewarm no tiene efecto observable y es idempotente', () => {
    expect(modifiers.prewarm()).toBeUndefined()
    expect(modifiers.prewarm()).toBeUndefined()
    expect(modifiers.isModifierPressed('shift')).toBe(false)
  })
})
