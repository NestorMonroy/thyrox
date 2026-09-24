/**
 * `withMemoryCorrectionHint` ≙ `WO` de 2.1.275 (`chunk-q2gh92k2.js`): la
 * nota se añade sólo con memoria automática y la bandera activas. El texto
 * de la nota es de este árbol.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { clearGrowthBookConfigOverrides, setGrowthBookConfigOverride } from '@thyrox/config/feature-flags'
import { MEMORY_CORRECTION_HINT, withMemoryCorrectionHint } from '../messages.js'

const saved = process.env.CLAUDE_CODE_DISABLE_AUTO_MEMORY
afterEach(() => {
  clearGrowthBookConfigOverrides()
  if (saved === undefined) delete process.env.CLAUDE_CODE_DISABLE_AUTO_MEMORY
  else process.env.CLAUDE_CODE_DISABLE_AUTO_MEMORY = saved
})

describe('withMemoryCorrectionHint (WO)', () => {
  test('sin la bandera, el mensaje intacto', () => {
    expect(withMemoryCorrectionHint('rechazado')).toBe('rechazado')
  })
  test('con la bandera y memoria activa, se añade la nota', () => {
    setGrowthBookConfigOverride('tengu_amber_prism', true)
    process.env.CLAUDE_CODE_DISABLE_AUTO_MEMORY = '0'
    expect(withMemoryCorrectionHint('rechazado')).toBe('rechazado' + MEMORY_CORRECTION_HINT)
  })
  test('con la memoria automática desactivada, no', () => {
    setGrowthBookConfigOverride('tengu_amber_prism', true)
    process.env.CLAUDE_CODE_DISABLE_AUTO_MEMORY = '1'
    expect(withMemoryCorrectionHint('rechazado')).toBe('rechazado')
  })
  test('la nota es propia y va separada por una línea en blanco', () => {
    expect(MEMORY_CORRECTION_HINT.startsWith('\n\n')).toBe(true)
    expect(MEMORY_CORRECTION_HINT).toMatch(/memory/i)
    expect(MEMORY_CORRECTION_HINT).not.toContain('Pay close attention')
  })
})
