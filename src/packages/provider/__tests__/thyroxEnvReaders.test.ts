/**
 * La conducta que gobierna cada variable THYROX_* de `@thyrox/provider`.
 * Cada caso contrasta la variable fijada con la ausente: una prueba que
 * sólo nombrara la variable no distinguiría si se sigue leyendo.
 */
import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test'
import axios from 'axios'
import { getMCPUserAgent, getUserAgent } from '../src/http.ts'
import { getOauthConfig } from '../src/oauthConstants.ts'
import { getMockHeaderless429Message, shouldProcessMockLimits } from '../src/mockRateLimits.ts'
import { getSessionLogsViaOAuth } from '../src/sessionIngress.ts'

const KEYS = [
  'USER_TYPE',
  'USE_LOCAL_OAUTH',
  'THYROX_AGENT_SDK_VERSION',
  'THYROX_LOCAL_OAUTH_API_BASE',
  'THYROX_LOCAL_OAUTH_APPS_BASE',
  'THYROX_LOCAL_OAUTH_CONSOLE_BASE',
  'THYROX_MOCK_HEADERLESS_429',
  'THYROX_AFTER_LAST_COMPACT',
]
const saved: Record<string, string | undefined> = {}
beforeEach(() => {
  for (const key of KEYS) {
    saved[key] = process.env[key]
    delete process.env[key]
  }
})
afterEach(() => {
  for (const key of KEYS) {
    if (saved[key] === undefined) delete process.env[key]
    else process.env[key] = saved[key]
  }
})

describe('THYROX_AGENT_SDK_VERSION', () => {
  test('entra en el user-agent de la API y en el de MCP', () => {
    expect(getUserAgent()).not.toContain('agent-sdk/')
    process.env.THYROX_AGENT_SDK_VERSION = '9.9.9'
    expect(getUserAgent()).toContain(', agent-sdk/9.9.9')
    expect(getMCPUserAgent()).toContain('agent-sdk/9.9.9')
  })
})

describe('THYROX_LOCAL_OAUTH_*_BASE', () => {
  test('con OAuth local, cada base sustituye su servidor por defecto sin barra final', () => {
    process.env.USER_TYPE = 'ant'
    process.env.USE_LOCAL_OAUTH = '1'
    expect(getOauthConfig().BASE_API_URL).toBe('http://localhost:8000')
    process.env.THYROX_LOCAL_OAUTH_API_BASE = 'http://api.test:1/'
    process.env.THYROX_LOCAL_OAUTH_APPS_BASE = 'http://apps.test:2/'
    process.env.THYROX_LOCAL_OAUTH_CONSOLE_BASE = 'http://console.test:3/'
    const config = getOauthConfig()
    expect(config.BASE_API_URL).toBe('http://api.test:1')
    expect(config.TOKEN_URL).toBe('http://api.test:1/v1/oauth/token')
    expect(config.CLAUDE_AI_AUTHORIZE_URL).toBe('http://apps.test:2/oauth/authorize')
    expect(config.CONSOLE_AUTHORIZE_URL).toBe('http://console.test:3/oauth/authorize')
  })

  test('fuera de OAuth local las bases no se consultan', () => {
    process.env.THYROX_LOCAL_OAUTH_API_BASE = 'http://api.test:1'
    expect(getOauthConfig().BASE_API_URL).not.toBe('http://api.test:1')
  })
})

describe('THYROX_MOCK_HEADERLESS_429', () => {
  test('en build interna fija el mensaje del 429 sin cabeceras y activa el procesado simulado', () => {
    process.env.USER_TYPE = 'ant'
    expect(shouldProcessMockLimits()).toBe(false)
    process.env.THYROX_MOCK_HEADERLESS_429 = 'límite simulado'
    expect(getMockHeaderless429Message()).toBe('límite simulado')
    expect(shouldProcessMockLimits()).toBe(true)
  })

  test('fuera de build interna no tiene efecto', () => {
    process.env.THYROX_MOCK_HEADERLESS_429 = 'límite simulado'
    expect(getMockHeaderless429Message()).toBeNull()
    expect(shouldProcessMockLimits()).toBe(false)
  })
})

describe('THYROX_AFTER_LAST_COMPACT', () => {
  async function paramsSent(): Promise<unknown> {
    const get = spyOn(axios, 'get').mockResolvedValue({ status: 200, data: { loglines: [] } })
    try {
      await getSessionLogsViaOAuth('s1', 'tok', 'org')
      return (get.mock.calls[0]?.[1] as { params?: unknown } | undefined)?.params
    } finally {
      get.mockRestore()
    }
  }

  test('pide al servidor sólo lo posterior a la última compactación', async () => {
    expect(await paramsSent()).toBeUndefined()
    process.env.THYROX_AFTER_LAST_COMPACT = '1'
    expect(await paramsSent()).toEqual({ after_last_compact: true })
  })
})
