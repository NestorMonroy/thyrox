/**
 * `/provider unset` borra las variables de proveedor del entorno, como la
 * fuente (`delete process.env.CLAUDE_CODE_USE_*`). El porte las había vuelto
 * `delete readEnv(...)`, que borra un valor y no la variable: un no-op.
 */
import { afterEach, describe, expect, mock, test } from 'bun:test'

const settingsWrites: unknown[] = []
mock.module('@thyrox/config/settings', () => ({
  getSettings: () => ({}),
  getInitialSettings: () => ({}),
  updateSettingsForSource: (_source: string, value: unknown) => {
    settingsWrites.push(value)
    return { error: null }
  },
}))

const { default: provider } = await import('../commands/provider.js')

const NAMES = [
  'CLAUDE_CODE_USE_BEDROCK',
  'CLAUDE_CODE_USE_VERTEX',
  'CLAUDE_CODE_USE_FOUNDRY',
  'CLAUDE_CODE_USE_OPENAI',
  'CLAUDE_CODE_USE_GEMINI',
]

afterEach(() => {
  for (const name of NAMES) delete process.env[name]
})

describe('/provider unset', () => {
  test('borra las cinco variables de proveedor', async () => {
    for (const name of NAMES) process.env[name] = '1'
    const { call } = await provider.load()
    await call('unset', {} as never)
    expect(NAMES.filter(name => name in process.env)).toEqual([])
    expect(settingsWrites).toEqual([{ modelType: undefined }])
  })
})
