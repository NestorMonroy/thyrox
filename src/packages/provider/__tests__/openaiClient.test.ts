/**
 * `openai/client.ts` — la envoltura del SDK de OpenAI.
 *
 * PROCEDENCIA DEL CONTRATO, declarada: a diferencia de `convertMessages`,
 * `convertTools` y `modelMapping`, la fuente NO tiene suite para este modulo.
 * Medido: `grep -rl "openai/client"` sobre sus dos directorios de test da
 * cero. Asi que el contrato de estos casos es la LECTURA de la fuente, no una
 * suite portada, y eso lo hace mas debil: mide lo que yo entendi que hace, no
 * lo que su autor declaro que hace. Se declara para que nadie lo lea como si
 * viniera de la referencia.
 *
 * Lo que NO se alcanza por conducta: la rama del registro de conexiones.
 * `resolveConnectionForModel` lee la config global por `require`, envuelto en
 * try/catch que devuelve vacio; sin config no hay conexion que resolver y sin
 * una costura que la fuente no tiene no se puede sembrar una. Esa rama se
 * pincha sobre la fuente en `openaiClientSourcePinning.test.ts`.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import {
  clearOpenAIClientCache,
  getOpenAIClient,
} from '../src/openai/client.js'
import {
  installProviderHostBindings,
  resetProviderRuntimeBindingsForTests,
} from '../src/providerHostSetup.js'
import type { ProviderHostBindings } from '../src/host.js'

const TRACKED = [
  'OPENAI_API_KEY',
  'OPENAI_BASE_URL',
  'OPENAI_ORG_ID',
  'OPENAI_PROJECT_ID',
  'API_TIMEOUT_MS',
] as const
const saved = new Map<string, string | undefined>()

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
  } as unknown as ProviderHostBindings
}

beforeEach(() => {
  for (const k of TRACKED) {
    saved.set(k, process.env[k])
    delete process.env[k]
  }
  installProviderHostBindings(stubBindings())
  clearOpenAIClientCache()
})

afterEach(() => {
  for (const k of TRACKED) {
    const v = saved.get(k)
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
  saved.clear()
  clearOpenAIClientCache()
  resetProviderRuntimeBindingsForTests()
})

describe('getOpenAIClient — construccion desde el entorno', () => {
  test('toma la clave de OPENAI_API_KEY', () => {
    process.env.OPENAI_API_KEY = 'sk-de-prueba'
    expect(getOpenAIClient().apiKey).toBe('sk-de-prueba')
  })

  test('sin OPENAI_API_KEY la clave queda vacia, no undefined', () => {
    // Cadena vacia y no `undefined`: el SDK trata la ausencia leyendo el
    // entorno por su cuenta, y eso enmascararia el fallo de configuracion.
    expect(getOpenAIClient().apiKey).toBe('')
  })

  test('toma la URL base de OPENAI_BASE_URL', () => {
    process.env.OPENAI_BASE_URL = 'http://localhost:11434/v1'
    expect(getOpenAIClient().baseURL).toBe('http://localhost:11434/v1')
  })

  test('maxRetries por defecto es 0', () => {
    expect(getOpenAIClient().maxRetries).toBe(0)
  })

  test('maxRetries se puede fijar por opcion', () => {
    expect(getOpenAIClient({ maxRetries: 3 }).maxRetries).toBe(3)
  })

  test('el timeout por defecto es de 600 segundos', () => {
    expect(getOpenAIClient().timeout).toBe(600_000)
  })

  test('API_TIMEOUT_MS anula el timeout por defecto', () => {
    process.env.API_TIMEOUT_MS = '5000'
    expect(getOpenAIClient().timeout).toBe(5000)
  })

  test('la organizacion solo se pasa si OPENAI_ORG_ID esta', () => {
    expect(getOpenAIClient().organization).toBeNull()
    clearOpenAIClientCache()
    process.env.OPENAI_ORG_ID = 'org-1'
    expect(getOpenAIClient().organization).toBe('org-1')
  })

  test('el proyecto solo se pasa si OPENAI_PROJECT_ID esta', () => {
    expect(getOpenAIClient().project).toBeNull()
    clearOpenAIClientCache()
    process.env.OPENAI_PROJECT_ID = 'proj-1'
    expect(getOpenAIClient().project).toBe('proj-1')
  })
})

describe('getOpenAIClient — la cache por conexion', () => {
  test('dos llamadas sin fetchOverride devuelven la MISMA instancia', () => {
    expect(getOpenAIClient()).toBe(getOpenAIClient())
  })

  test('fetchOverride desactiva la cache: cada llamada construye una nueva', () => {
    // Es la costura de prueba que la fuente declara: sembrar un fetch propio
    // no debe contaminar el cliente compartido.
    const fetchOverride = () => Promise.resolve(new Response(''))
    const a = getOpenAIClient({ fetchOverride })
    const b = getOpenAIClient({ fetchOverride })
    expect(a).not.toBe(b)
  })

  test('un cliente construido con fetchOverride NO entra en la cache', () => {
    const fetchOverride = () => Promise.resolve(new Response(''))
    const conFetch = getOpenAIClient({ fetchOverride })
    expect(getOpenAIClient()).not.toBe(conFetch)
  })

  test('clearOpenAIClientCache fuerza una instancia nueva', () => {
    const antes = getOpenAIClient()
    clearOpenAIClientCache()
    expect(getOpenAIClient()).not.toBe(antes)
  })

  test('la cache no vuelve a leer el entorno: la clave vieja sobrevive', () => {
    // Documenta la consecuencia real de cachear por clave de conexion. Si esto
    // deja de ser cierto es que la cache cambio de eje, y hay que decidirlo.
    process.env.OPENAI_API_KEY = 'primera'
    const primero = getOpenAIClient()
    process.env.OPENAI_API_KEY = 'segunda'
    expect(getOpenAIClient()).toBe(primero)
    expect(getOpenAIClient().apiKey).toBe('primera')
  })
})
