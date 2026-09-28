/**
 * `providers.ts` — la traduccion de protocolo de conexion a `APIProvider`, y
 * el predicado de endpoint first-party.
 *
 * PROCEDENCIA DEL CONTRATO, declarada: este es el porte de la suite de la
 * fuente, `ccnmt: packages/provider/src/__tests__/providerRouting.test.ts`
 * (185 lineas, 15 casos). Sus casos se reescriben con NUESTRA redaccion —el
 * puerto es reimplementacion bajo UNLICENSED, no copia— pero miden los mismos
 * quince invariantes, uno a uno y en el mismo orden.
 *
 * No es una mitad roja: es cobertura de contrato de un `providers.ts` ya
 * portado, y su valor es el control de anulación del pie.
 *
 * COMO SE AISLA DEL ENTORNO: el registro de conexiones es el REAL. Bajo
 * `NODE_ENV=test`, `saveGlobalConfig` escribe en un objeto de módulo y
 * `getGlobalConfig` lo devuelve —la vía que la fuente dejó para esto—, así
 * que cada caso fija sus conexiones sin doble. Un `mock.module` sobre la raíz
 * de `@thyrox/config` alcanzaría también a `global/config.ts`, que la barrica
 * reexporta, y el orden de ejecución decidiría el veredicto de otras suites;
 * `mock.module` sólo intercepta un `require` posterior cuando se le da un
 * subpath (`@thyrox/config/settings`), no la raíz del paquete (tarea #261).
 *
 * CONTROL DE ANULACION, medido sobre los quince casos:
 *
 *   - sin la rama `case 'anthropic'` de `getProviderForModel` caen el 2 y el
 *     3: un protocolo anthropic deja de dar `firstParty`;
 *   - con `return false` en la rama sin `ANTHROPIC_BASE_URL` de
 *     `isFirstPartyAnthropicBaseUrl` caen el 8 y el 15. El 11 no cae: mide
 *     una conexión anthropic en api.anthropic.com, que se resuelve por la
 *     conexión y no por la variable de entorno.
 */
import { afterAll, afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import type { ConnectionRecord } from '../src/connections.js'

const { saveGlobalConfig } = await import('@thyrox/config/global/config.js')

/**
 * Fija el registro de conexiones. Bajo `NODE_ENV=test` el registro real
 * escribe en su objeto de pruebas en vez de tocar el disco — es la via que la
 * fuente dejo abierta justo para esto, y por eso aqui no hace falta doble.
 */
function setConnections(connections: ConnectionRecord[]): void {
  saveGlobalConfig(c => ({ ...c, connections: connections as never }))
}

// `getAPIProvider()` consulta los ajustes iniciales, que en ejecucion exigen
// bindings instalados. La suite no los instala: se sustituye por un objeto
// vacio para que corran las ramas de respaldo por variable de entorno.
//
// Se toma una COPIA de las exportaciones reales y se vuelve a registrar al
// terminar el archivo: sin ella, la otra `providerRouting.test.ts`
// (`src/__tests__`) corrida después con `--randomize` leía estos ajustes
// vacíos (banco `test-order-leaks-20260927T082148`).
const realSettings = { ...(await import('@thyrox/config/settings')) }
afterAll(() => {
  mock.module('@thyrox/config/settings', () => realSettings)
})
mock.module('@thyrox/config/settings', () => ({
  ...realSettings,
  getInitialSettings: () => ({}),
}))

const { getProviderForModel, isFirstPartyAnthropicEndpoint } = await import(
  '../src/providers.js'
)

const TRACKED_KEYS = [
  'ANTHROPIC_BASE_URL',
  'THYROX_CODE_USE_BEDROCK',
  'THYROX_CODE_USE_VERTEX',
  'THYROX_CODE_USE_FOUNDRY',
  'THYROX_CODE_USE_OPENAI',
  'THYROX_CODE_USE_GEMINI',
] as const
const savedEnv = new Map<string, string | undefined>()

beforeEach(() => {
  setConnections([])
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

const conexionBase = {
  id: 'test',
  name: 'Test',
  auth: { type: 'api_key' as const, key: 'k' },
  enabled: true,
  models: [{ id: 'claude-opus-4-7', label: 'Opus 4.7' }],
  createdAt: 0,
}

describe('getProviderForModel — de protocolo de conexion a APIProvider', () => {
  test('1. sin conexion que coincida cae al proveedor global (firstParty por defecto)', () => {
    expect(getProviderForModel('claude-opus-4-7')).toBe('firstParty')
  })

  test('2. protocolo anthropic da firstParty, no el literal del protocolo', () => {
    setConnections([
      { ...conexionBase, protocol: 'anthropic', endpoint: 'https://api.anthropic.com' },
    ])
    expect(getProviderForModel('test:claude-opus-4-7')).toBe('firstParty')
  })

  test('3. protocolo anthropic contra un proxy sigue dando firstParty', () => {
    // La distincion proxy/first-party no vive aqui: la hace
    // `isFirstPartyAnthropicEndpoint`, que es otro eje.
    setConnections([
      {
        ...conexionBase,
        protocol: 'anthropic',
        endpoint: 'https://mi-litellm.example.com/anthropic',
      },
    ])
    expect(getProviderForModel('test:claude-opus-4-7')).toBe('firstParty')
  })

  test('4. protocolo openai da openai', () => {
    setConnections([
      {
        ...conexionBase,
        protocol: 'openai',
        endpoint: 'https://api.openai.com/v1',
        models: [{ id: 'gpt-5.5', label: 'GPT-5.5' }],
      },
    ])
    expect(getProviderForModel('test:gpt-5.5')).toBe('openai')
  })

  test('5. protocolo gemini da gemini', () => {
    setConnections([
      {
        ...conexionBase,
        protocol: 'gemini',
        endpoint: 'https://generativelanguage.googleapis.com',
        models: [{ id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' }],
      },
    ])
    expect(getProviderForModel('test:gemini-2.5-pro')).toBe('gemini')
  })

  test('6. protocolo codex da codex', () => {
    setConnections([
      {
        ...conexionBase,
        protocol: 'codex',
        endpoint: 'https://chatgpt.com/backend-api',
        models: [{ id: 'gpt-5.2-codex', label: 'GPT-5.2 Codex' }],
      },
    ])
    expect(getProviderForModel('test:gpt-5.2-codex')).toBe('codex')
  })

  test('7. ningun protocolo produce el literal "anthropic" — la fuga que el switch cierra', () => {
    const protocolos = ['anthropic', 'openai', 'gemini', 'codex'] as const
    for (const protocol of protocolos) {
      setConnections([
        { ...conexionBase, protocol, endpoint: 'https://example.com' },
      ])
      expect(getProviderForModel('test:claude-opus-4-7')).not.toBe('anthropic')
    }
  })
})

describe('isFirstPartyAnthropicEndpoint', () => {
  test('8. sin modelo, sin conexion y sin variable: la URL por defecto es first-party', () => {
    expect(isFirstPartyAnthropicEndpoint()).toBe(true)
  })

  test('9. sin modelo, con ANTHROPIC_BASE_URL a un proxy: falso', () => {
    process.env.ANTHROPIC_BASE_URL = 'https://mi-proxy.example.com'
    expect(isFirstPartyAnthropicEndpoint()).toBe(false)
  })

  test('10. sin modelo y con bedrock activo: falso, aunque el modelo sea de clase Anthropic', () => {
    process.env.THYROX_CODE_USE_BEDROCK = '1'
    expect(isFirstPartyAnthropicEndpoint()).toBe(false)
  })

  test('11. el modelo resuelve a una conexion anthropic en api.anthropic.com: verdadero', () => {
    setConnections([
      { ...conexionBase, protocol: 'anthropic', endpoint: 'https://api.anthropic.com' },
    ])
    expect(isFirstPartyAnthropicEndpoint('test:claude-opus-4-7')).toBe(true)
  })

  test('12. el modelo resuelve a una conexion anthropic en un proxy: falso', () => {
    setConnections([
      {
        ...conexionBase,
        protocol: 'anthropic',
        endpoint: 'https://mi-litellm.example.com/anthropic',
      },
    ])
    expect(isFirstPartyAnthropicEndpoint('test:claude-opus-4-7')).toBe(false)
  })

  test('13. el modelo resuelve a una conexion openai: falso, no es un endpoint de Anthropic', () => {
    setConnections([
      {
        ...conexionBase,
        protocol: 'openai',
        endpoint: 'https://api.openai.com/v1',
        models: [{ id: 'gpt-5.5', label: 'GPT-5.5' }],
      },
    ])
    expect(isFirstPartyAnthropicEndpoint('test:gpt-5.5')).toBe(false)
  })

  test('14. un modelo sin conexion que lo reclame cae a la comprobacion por variable', () => {
    process.env.ANTHROPIC_BASE_URL = 'https://mi-proxy.example.com'
    expect(isFirstPartyAnthropicEndpoint('claude-opus-4-7')).toBe(false)
  })

  test('15. y con la variable por defecto, ese mismo modelo sin conexion da verdadero', () => {
    // El caso 14 mide el falso; este mide que la rama de respaldo no esta
    // clavada en `false`, que es lo que un `return false` la dejaria.
    expect(isFirstPartyAnthropicEndpoint('claude-opus-4-7')).toBe(true)
  })
})
