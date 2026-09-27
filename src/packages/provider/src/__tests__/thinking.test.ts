import { afterAll, afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import type { ConnectionRecord } from '@thyrox/config'

// `getGlobalConfig` se sustituye porque la prueba necesita alimentar listas
// de conexiones arbitrarias; reproducirlo con ajustes escribibles pesaría más
// que la sustitución. `envMap` era antes otro `mock.module` y pasó a
// guardar-y-restaurar el entorno (abajo), para no contaminar `env-utils` en
// todo el proceso.
//
// La sustitución se DESHACE al terminar el archivo registrando la copia de
// las exportaciones reales tomada antes: sin ella, `providerRouting.test.ts`
// corrido después con `--randomize` leía este `getGlobalConfig` fijo (banco
// `test-order-leaks-20260927T082148`).
const realConfigModule = { ...(await import('@thyrox/config')) }
afterAll(() => {
  mock.module('@thyrox/config', () => realConfigModule)
})
const config = {
  connections: [] as ConnectionRecord[],
}

mock.module('@thyrox/config', () => ({
  ...realConfigModule,
  getGlobalConfig: () => config,
}))

const { modelSupportsAdaptiveThinking, modelSupportsThinking } = await import(
  '../thinking.js'
)

const TRACKED_KEYS = [
  'ANTHROPIC_DEFAULT_OPUS_MODEL',
  'ANTHROPIC_DEFAULT_OPUS_MODEL_SUPPORTED_CAPABILITIES',
  'USER_TYPE',
] as const
const savedEnv = new Map<string, string | undefined>()

beforeEach(() => {
  config.connections = []
  for (const k of TRACKED_KEYS) {
    savedEnv.set(k, process.env[k])
    delete process.env[k]
  }
})

afterEach(() => {
  for (const k of TRACKED_KEYS) {
    const v = savedEnv.get(k)
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
  savedEnv.clear()
})

describe('connection-aware thinking support', () => {
  test('does not enable Anthropic thinking for compatible non-Anthropic endpoints', () => {
    config.connections = [
      {
        id: 'deepseek-anthropic',
        name: 'DeepSeek Anthropic Compatible',
        protocol: 'anthropic',
        endpoint: 'https://api.deepseek.com/anthropic',
        auth: { type: 'api_key', key: 'test' },
        enabled: true,
        models: [
          {
            id: 'claude-opus-4-7',
            label: 'Opus (claude-opus-4-7)',
          },
        ],
        createdAt: 0,
      },
    ]

    const model = 'deepseek-anthropic:claude-opus-4-7'

    expect(modelSupportsThinking(model)).toBe(false)
    expect(modelSupportsAdaptiveThinking(model)).toBe(false)
  })

  test('honors explicit capability overrides for compatible endpoints', () => {
    config.connections = [
      {
        id: 'deepseek-anthropic-override',
        name: 'DeepSeek Anthropic Compatible',
        protocol: 'anthropic',
        endpoint: 'https://api.deepseek.com/anthropic',
        auth: { type: 'api_key', key: 'test' },
        enabled: true,
        models: [
          {
            id: 'deepseek-reasoner',
            label: 'DeepSeek Reasoner',
          },
        ],
        createdAt: 0,
      },
    ]
    process.env.ANTHROPIC_DEFAULT_OPUS_MODEL = 'deepseek-reasoner'
    process.env.ANTHROPIC_DEFAULT_OPUS_MODEL_SUPPORTED_CAPABILITIES =
      'thinking,adaptive_thinking'

    const model = 'deepseek-anthropic-override:deepseek-reasoner'

    expect(modelSupportsThinking(model)).toBe(true)
    expect(modelSupportsAdaptiveThinking(model)).toBe(true)
  })

  test('keeps Anthropic thinking defaults for official Anthropic endpoints', () => {
    config.connections = [
      {
        id: 'anthropic-console',
        name: 'Anthropic Console',
        protocol: 'anthropic',
        endpoint: 'https://api.anthropic.com',
        auth: { type: 'api_key', key: 'test' },
        enabled: true,
        models: [
          {
            id: 'claude-opus-4-7',
            label: 'Opus 4.7',
          },
        ],
        createdAt: 0,
      },
    ]

    const model = 'anthropic-console:claude-opus-4-7'

    expect(modelSupportsThinking(model)).toBe(true)
    expect(modelSupportsAdaptiveThinking(model)).toBe(true)
  })
})
