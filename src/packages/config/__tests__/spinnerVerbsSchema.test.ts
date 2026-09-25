// Contrato de `spinnerVerbs` en 2.1.281: un objeto con `mode`
// (`append` | `replace`) y `verbs`, que es lo que lee `getSpinnerVerbs`.
import { describe, expect, test } from 'bun:test'
import { SettingsSchema } from '../settings/types.ts'

describe('spinnerVerbs', () => {
  test('acepta el objeto mode/verbs', () => {
    const parsed = SettingsSchema().safeParse({ spinnerVerbs: { mode: 'replace', verbs: ['Pondering'] } })
    expect(parsed.success).toBe(true)
    expect(parsed.data?.spinnerVerbs).toEqual({ mode: 'replace', verbs: ['Pondering'] })
  })
  test('un modo desconocido no pasa', () => {
    const parsed = SettingsSchema().safeParse({ spinnerVerbs: { mode: 'prepend', verbs: [] } })
    expect(parsed.success).toBe(false)
  })
})
