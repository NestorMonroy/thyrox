/**
 * Proveedores de credenciales — porte de `ccnmt: packages/provider/src/auth.ts`,
 * con los invariantes de su suite `anthropicAuthProvider.behavior.test.ts`.
 *
 * MITAD ROJA. `adapters.ts` compone cada adaptador con su `authProvider`, y
 * este árbol tiene el TIPO `AuthProvider` y ninguna instancia. Sin ellas
 * `getProviderAdapter` no puede armar nada.
 *
 * POR QUÉ ESTA SUITE NO ES LA DE LA REFERENCIA, aunque pincha lo mismo: la
 * suya lee `auth.ts` como TEXTO y empareja expresiones regulares contra su
 * fuente. Ese instrumento no sirve aquí por dos razones, y la segunda es la
 * de fondo:
 *
 * 1. Nuestro archivo es una REIMPLEMENTACIÓN —UNLICENSED, se porta el patrón
 *    y no el texto—, así que su forma difiere por construcción y un regex
 *    sobre ella mediría la diferencia de redacción, no la del contrato.
 * 2. Un regex sobre el fuente **no puede fallar por lo que importa**. Pincha
 *    que la línea `const apiKey = subscriber ? null : …` esté escrita; no
 *    pincha que un suscriptor reciba `apiKey: null`. Es el sub-patrón C de
 *    `metrica-decide-la-conclusion.md`: mide el significante y concluye sobre
 *    el significado. Aquí se mide el significado — se llama a
 *    `getCredentials` con bindings sembrados y se lee lo que sale.
 *
 * CONTROL DE ANULACIÓN, medido: retirando la exclusión mutua —dejando que un
 * suscriptor conserve su `apiKey`— caen **2 de 12**: el caso 2 (suscriptor con
 * apiKey null) y el 3 (el par que comprueba que un NO suscriptor sí la
 * conserva, y que es el que impide «devolver siempre null»). Sobreviven los
 * otros diez. Esa exclusión es el invariante que la referencia llama CRITICAL:
 * firmar con clave y token a la vez confunde la tubería de autenticación.
 */

import { afterEach, describe, expect, test } from 'bun:test'
import { installProviderHostBindings, type ProviderHostBindings } from '../src/host.ts'
import {
  anthropicAuthProvider,
  geminiAuthProvider,
  getAnthropicAuthProvider,
  openAIAuthProvider,
} from '../src/auth.ts'

const entornoOriginal = { ...process.env }
afterEach(() => { process.env = { ...entornoOriginal } })

/** Sólo lo que el proveedor de credenciales lee de los bindings. */
function sembrar(auth: Partial<Record<string, unknown>> = {}) {
  let refrescos = 0
  const bindings = {
    auth: {
      checkAndRefreshOAuthTokenIfNeeded: async () => { refrescos += 1; return true },
      getAnthropicApiKey: () => 'clave-de-los-bindings',
      getApiKeyFromApiKeyHelper: async () => 'clave-del-ayudante',
      getClaudeAIOAuthTokens: () => ({ accessToken: 'token-oauth' }),
      isClaudeAISubscriber: () => false,
      isEnvTruthy: (v: unknown) => v === '1' || v === 'true',
      getOauthConfig: () => ({ BASE_API_URL: 'https://staging.example' }),
      ...auth,
    },
  } as unknown as ProviderHostBindings
  installProviderHostBindings(bindings)
  return { refrescos: () => refrescos }
}

describe('anthropicAuthProvider', () => {
  test('1. refresh() delega en checkAndRefreshOAuthTokenIfNeeded', async () => {
    const s = sembrar()
    await anthropicAuthProvider.refresh()
    expect(s.refrescos()).toBe(1)
  })

  test('2. CRÍTICO: suscriptor -> apiKey null Y authToken del OAuth', async () => {
    sembrar({ isClaudeAISubscriber: () => true })
    const c = await anthropicAuthProvider.getCredentials()
    expect(c.subscriber).toBe(true)
    expect(c.apiKey).toBeNull()
    expect(c.authToken).toBe('token-oauth')
  })

  test('3. NO suscriptor -> conserva la clave: el par que impide devolver siempre null', async () => {
    sembrar()
    const c = await anthropicAuthProvider.getCredentials()
    expect(c.subscriber).toBe(false)
    expect(c.apiKey).toBe('clave-de-los-bindings')
    expect(c.authToken).toBeNull()
  })

  test('4. apiKeyOverride del contexto gana sobre la clave de los bindings', async () => {
    sembrar()
    const c = await anthropicAuthProvider.getCredentials({ apiKeyOverride: 'clave-del-llamador' })
    expect(c.apiKey).toBe('clave-del-llamador')
  })

  test('5. getCredentials refresca el token ANTES de leerlo', async () => {
    const s = sembrar({ isClaudeAISubscriber: () => true })
    await anthropicAuthProvider.getCredentials()
    expect(s.refrescos()).toBe(1)
  })

  test('6. authorizationHeader: suscriptor -> null', async () => {
    sembrar({ isClaudeAISubscriber: () => true })
    expect((await anthropicAuthProvider.getCredentials()).authorizationHeader).toBeNull()
  })

  test('7. authorizationHeader: no suscriptor -> Bearer del ayudante', async () => {
    sembrar()
    delete process.env.ANTHROPIC_AUTH_TOKEN
    expect((await anthropicAuthProvider.getCredentials()).authorizationHeader)
      .toBe('Bearer clave-del-ayudante')
  })

  test('8. ANTHROPIC_AUTH_TOKEN del entorno gana sobre el ayudante', async () => {
    sembrar()
    process.env.ANTHROPIC_AUTH_TOKEN = 'token-del-entorno'
    expect((await anthropicAuthProvider.getCredentials()).authorizationHeader)
      .toBe('Bearer token-del-entorno')
  })

  test('9. OAuth de staging sólo con USER_TYPE=ant Y la bandera encendida', async () => {
    sembrar()
    process.env.USER_TYPE = 'ant'
    process.env.USE_STAGING_OAUTH = '1'
    expect((await anthropicAuthProvider.getCredentials()).baseURL).toBe('https://staging.example')
    process.env.USER_TYPE = 'externo'
    expect((await anthropicAuthProvider.getCredentials()).baseURL).toBeUndefined()
  })

  test('10. isAvailable: suscriptor O clave O token -> disponible', async () => {
    sembrar({ isClaudeAISubscriber: () => true })
    expect((await anthropicAuthProvider.isAvailable()).available).toBe(true)
    sembrar()
    expect((await anthropicAuthProvider.isAvailable()).available).toBe(true)
  })

  test('11. isAvailable sin nada: la razón nombra las DOS vías, para diagnosticar', async () => {
    sembrar({
      isClaudeAISubscriber: () => false,
      getAnthropicApiKey: () => null,
      getApiKeyFromApiKeyHelper: async () => null,
      getClaudeAIOAuthTokens: () => null,
    })
    delete process.env.ANTHROPIC_AUTH_TOKEN
    const r = await anthropicAuthProvider.isAvailable()
    expect(r.available).toBe(false)
    expect(r.reason).toBe('No Anthropic API key or Claude.ai OAuth token is configured.')
  })

  test('12. getAnthropicAuthProvider devuelve la MISMA instancia, no una copia', () => {
    expect(getAnthropicAuthProvider()).toBe(anthropicAuthProvider)
  })
})

describe('proveedores por variable de entorno (openai / gemini)', () => {
  test('openAIAuthProvider lee OPENAI_API_KEY', async () => {
    process.env.OPENAI_API_KEY = 'clave-openai'
    expect((await openAIAuthProvider.getCredentials()).apiKey).toBe('clave-openai')
    expect((await openAIAuthProvider.isAvailable()).available).toBe(true)
  })

  test('geminiAuthProvider lee GEMINI_API_KEY', async () => {
    process.env.GEMINI_API_KEY = 'clave-gemini'
    expect((await geminiAuthProvider.getCredentials()).apiKey).toBe('clave-gemini')
  })

  test('sin la variable: apiKey null y la razón NOMBRA la variable concreta', async () => {
    delete process.env.OPENAI_API_KEY
    delete process.env.GEMINI_API_KEY
    expect((await openAIAuthProvider.getCredentials()).apiKey).toBeNull()
    expect((await openAIAuthProvider.isAvailable()).reason).toContain('OPENAI_API_KEY')
    expect((await geminiAuthProvider.isAvailable()).reason).toContain('GEMINI_API_KEY')
  })

  test('refresh es no-op: una variable de entorno no se refresca', async () => {
    await expect(openAIAuthProvider.refresh()).resolves.toBeUndefined()
  })

  test('cada uno declara su id', () => {
    expect([anthropicAuthProvider.id, openAIAuthProvider.id, geminiAuthProvider.id])
      .toEqual(['anthropic', 'openai', 'gemini'])
  })
})
