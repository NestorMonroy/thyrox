// Contrato de `Djn` del binario 2.1.281: invalida las cachés, recorre las
// fuentes en orden de prioridad creciente y devuelve sólo las que aportan
// alguna clave, junto con la configuración efectiva.
import { describe, expect, test } from 'bun:test'
import { getSettingsWithSources } from '../settings/settings.ts'
import type { SettingsJson } from '../settings/types.ts'

describe('getSettingsWithSources', () => {
  test('conserva el orden de prioridad y omite las fuentes vacías o ausentes', () => {
    const sources: Record<string, SettingsJson | null> = {
      userSettings: { model: 'a' },
      projectSettings: {},
      localSettings: null,
      flagSettings: { model: 'b' },
    }
    const result = getSettingsWithSources(source => sources[source] ?? null, () => ({ model: 'b' }))
    expect(result.sources.map(s => s.source)).toEqual(['userSettings', 'flagSettings'])
    expect(result.sources[1]?.settings).toEqual({ model: 'b' })
    expect(result.effective).toEqual({ model: 'b' })
  })
})
