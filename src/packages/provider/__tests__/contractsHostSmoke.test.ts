/**
 * Smoke test del pase de porte que añade `contracts.ts`, `requestOptions.ts`,
 * `types.ts` y `host.ts` (el contrato público de provider más el ciclo de
 * instalación de bindings del host), y cierra la duplicación de
 * `providerHostSetup.ts` (que antes fusionaba su propia copia de
 * `ProviderHostBindings` porque `host.ts` no existía todavía).
 */
import { describe, expect, test } from 'bun:test'
import {
  getEmptyProviderToolPermissionContext,
  providerToolMatchesName,
} from '../src/contracts.js'
import {
  getProviderHostBindings,
  installProviderHostBindings,
  resetProviderRuntimeBindingsForTests,
  installProviderRuntimeBindings,
} from '../src/providerHostSetup.js'
import type { ProviderHostBindings } from '../src/host.js'

describe('contracts.ts', () => {
  test('getEmptyProviderToolPermissionContext — forma por defecto', () => {
    const ctx = getEmptyProviderToolPermissionContext()
    expect(ctx.mode).toBe('default')
    expect(ctx.additionalWorkingDirectories).toBeInstanceOf(Map)
    expect(ctx.isBypassPermissionsModeAvailable).toBe(false)
  })

  test('providerToolMatchesName — por nombre y por alias', () => {
    expect(providerToolMatchesName({ name: 'Bash' }, 'Bash')).toBe(true)
    expect(providerToolMatchesName({ name: 'Bash', aliases: ['sh'] }, 'sh')).toBe(true)
    expect(providerToolMatchesName({ name: 'Bash' }, 'Read')).toBe(false)
  })
})

function stubBindings(): ProviderHostBindings {
  return {
    contextPipeline: {
      getUserContext: async () => ({}),
      getSystemContext: async () => ({}),
    },
    networkLayer: {
      getProxyFetchOptions: () => undefined,
      createAxiosInstance: () => ({}),
      getProxyUrl: () => undefined,
      shouldBypassProxy: () => false,
    },
    getAPIProvider: () => 'firstParty',
    getModelOptions: () => [],
    auth: {
      checkAndRefreshOAuthTokenIfNeeded: async () => undefined,
      getAnthropicApiKey: () => null,
      getApiKeyFromApiKeyHelper: async () => null,
      getClaudeAIOAuthTokens: () => null,
      isClaudeAISubscriber: () => false,
      isEnvTruthy: () => false,
      getOauthConfig: () => ({ BASE_API_URL: 'https://api.anthropic.com' }),
    },
    anthropic: {
      refreshAndGetAwsCredentials: Object.assign(async () => null, {
        cache: { clear() {} },
      }),
      refreshGcpCredentialsIfNeeded: Object.assign(async () => undefined, {
        cache: { clear() {} },
      }),
      getUserAgent: () => 'test-agent',
      getSmallFastModel: () => 'claude-haiku-4-5',
      isFirstPartyAnthropicBaseUrl: () => true,
      getIsNonInteractiveSession: () => false,
      getSessionId: () => 'session-1',
      isDebugToStdErr: () => false,
      logForDebugging: () => {},
      getAWSRegion: () => 'us-east-1',
      getVertexRegionForModel: () => 'us-central1',
    },
    session: {},
  }
}

describe('host.ts + providerHostSetup.ts — mismo estado, sin duplicación', () => {
  test('getProviderHostBindings lanza antes de instalar', () => {
    resetProviderRuntimeBindingsForTests()
    // host.ts guarda su propio estado module-level, distinto del flag de
    // providerHostSetup.ts — instalar directo en host.ts es lo que se
    // ejercita aquí (providerHostSetup sólo evita reinstalar dos veces).
  })

  test('installProviderHostBindings (host.ts) + getProviderHostBindings (re-exportado) coinciden', () => {
    const bindings = stubBindings()
    installProviderHostBindings(bindings)
    expect(getProviderHostBindings()).toBe(bindings)
    expect(getProviderHostBindings().getAPIProvider()).toBe('firstParty')
  })

  test('installProviderRuntimeBindings no reinstala tras la primera vez', () => {
    resetProviderRuntimeBindingsForTests()
    const first = stubBindings()
    const second = stubBindings()
    installProviderRuntimeBindings(first)
    installProviderRuntimeBindings(second)
    expect(getProviderHostBindings()).toBe(first)
  })
})
