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
 * NO ES MITAD ROJA, y no se finge que lo sea: `providers.ts` ya estaba
 * portado cuando esta suite llego. Es cobertura de contrato retroactiva — el
 * modulo no tenia ninguna—, y su valor es el control de anulacion, que si se
 * midio y esta al pie.
 *
 * COMO SE AISLA DEL ENTORNO: `providers.ts` lee la configuracion global por
 * `require` diferido, asi que la suite intercepta el modulo con `mock.module`
 * y le da un objeto de conexiones que cada caso escribe. Es la misma costura
 * que usa la fuente.
 *
 * CINCO CASOS ESTAN BLOQUEADOS, y se declaran como tales en vez de borrarse:
 * los 4, 5, 6, 12 y 13 exigen que el registro de conexiones tenga algo dentro,
 * y hoy NO puede tenerlo. Medido: `require('@thyrox/config').getGlobalConfig`
 * es `undefined` —nuestro paquete config no porta `global/config.ts` de la
 * fuente— asi que `getEnabledConnections()` devuelve `[]` siempre y todo cae a
 * la rama de variables de entorno. Van como `test.todo`: visibles en la salida,
 * nunca en verde. Sucesor registrado: tarea #260.
 *
 * Y hay un segundo hallazgo del mismo pase, medido con cuatro sondas:
 * `mock.module` SI intercepta un `require` posterior cuando se le da un
 * subpath (`@thyrox/config/settings` devolvio el valor marcador), y NO cuando
 * se le da la raiz del paquete —ni por specifier ni por ruta absoluta—. Por
 * eso la costura de configuracion global de esta suite no llega. Tarea #261.
 *
 * CONTROL DE ANULACION, medido sobre los diez que si corren: se retira la rama
 * `case 'anthropic'` del `switch` de `getProviderForModel` —de modo que un
 * protocolo anthropic caiga al `default`— y caen **0 de 10**. Y ese cero es el
 * hallazgo, no un fallo del control: con el registro vacio ningun caso llega
 * al `switch`, asi que la suite NO puede medir hoy la fuga del literal
 * `'anthropic'` que la fuente documenta. Es la ceguera declarada de este
 * instrumento, y se levanta con la tarea #260.
 *
 * El control que SI discrimina sobre lo que queda: se cambia el `return true`
 * por `return false` en la rama sin `ANTHROPIC_BASE_URL` de
 * `isFirstPartyAnthropicBaseUrl` y caen **3 de 10**: los casos 8, 11 y 15.
 *
 * Que el 11 caiga es evidencia adicional del mismo bloqueo, no ruido: ese caso
 * dice medir una conexion anthropic en api.anthropic.com, y con el registro
 * vacio no llega a mirarla — sale por la misma rama de entorno que el 8 y el
 * 15. Cuando la tarea #260 cierre, el 11 dejara de caer con esta anulacion.
 */
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import type { ConnectionRecord } from '../src/connections.js'

const configReal = await import('@thyrox/config')
const config = { connections: [] as ConnectionRecord[] }

mock.module('@thyrox/config', () => ({
  ...configReal,
  getGlobalConfig: () => config,
}))

// `getAPIProvider()` consulta los ajustes iniciales, que en ejecucion exigen
// bindings instalados. La suite no los instala: se sustituye por un objeto
// vacio para que corran las ramas de respaldo por variable de entorno.
const ajustesReales = await import('@thyrox/config/settings')
mock.module('@thyrox/config/settings', () => ({
  ...ajustesReales,
  getInitialSettings: () => ({}),
}))

const { getProviderForModel, isFirstPartyAnthropicEndpoint } = await import(
  '../src/providers.js'
)

const CLAVES = [
  'ANTHROPIC_BASE_URL',
  'CLAUDE_CODE_USE_BEDROCK',
  'CLAUDE_CODE_USE_VERTEX',
  'CLAUDE_CODE_USE_FOUNDRY',
  'CLAUDE_CODE_USE_OPENAI',
  'CLAUDE_CODE_USE_GEMINI',
] as const
const guardado = new Map<string, string | undefined>()

beforeEach(() => {
  config.connections = []
  for (const k of CLAVES) {
    guardado.set(k, process.env[k])
    delete process.env[k]
  }
})

afterEach(() => {
  for (const k of CLAVES) {
    const v = guardado.get(k)
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
  guardado.clear()
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
    config.connections = [
      { ...conexionBase, protocol: 'anthropic', endpoint: 'https://api.anthropic.com' },
    ]
    expect(getProviderForModel('test:claude-opus-4-7')).toBe('firstParty')
  })

  test('3. protocolo anthropic contra un proxy sigue dando firstParty', () => {
    // La distincion proxy/first-party no vive aqui: la hace
    // `isFirstPartyAnthropicEndpoint`, que es otro eje.
    config.connections = [
      {
        ...conexionBase,
        protocol: 'anthropic',
        endpoint: 'https://mi-litellm.example.com/anthropic',
      },
    ]
    expect(getProviderForModel('test:claude-opus-4-7')).toBe('firstParty')
  })

  test.todo('4. protocolo openai da openai', () => {
    config.connections = [
      {
        ...conexionBase,
        protocol: 'openai',
        endpoint: 'https://api.openai.com/v1',
        models: [{ id: 'gpt-5.5', label: 'GPT-5.5' }],
      },
    ]
    expect(getProviderForModel('test:gpt-5.5')).toBe('openai')
  })

  test.todo('5. protocolo gemini da gemini', () => {
    config.connections = [
      {
        ...conexionBase,
        protocol: 'gemini',
        endpoint: 'https://generativelanguage.googleapis.com',
        models: [{ id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' }],
      },
    ]
    expect(getProviderForModel('test:gemini-2.5-pro')).toBe('gemini')
  })

  test.todo('6. protocolo codex da codex', () => {
    config.connections = [
      {
        ...conexionBase,
        protocol: 'codex',
        endpoint: 'https://chatgpt.com/backend-api',
        models: [{ id: 'gpt-5.2-codex', label: 'GPT-5.2 Codex' }],
      },
    ]
    expect(getProviderForModel('test:gpt-5.2-codex')).toBe('codex')
  })

  test('7. ningun protocolo produce el literal "anthropic" — la fuga que el switch cierra', () => {
    const protocolos = ['anthropic', 'openai', 'gemini', 'codex'] as const
    for (const protocol of protocolos) {
      config.connections = [
        { ...conexionBase, protocol, endpoint: 'https://example.com' },
      ]
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
    process.env.CLAUDE_CODE_USE_BEDROCK = '1'
    expect(isFirstPartyAnthropicEndpoint()).toBe(false)
  })

  test('11. el modelo resuelve a una conexion anthropic en api.anthropic.com: verdadero', () => {
    config.connections = [
      { ...conexionBase, protocol: 'anthropic', endpoint: 'https://api.anthropic.com' },
    ]
    expect(isFirstPartyAnthropicEndpoint('test:claude-opus-4-7')).toBe(true)
  })

  test.todo('12. el modelo resuelve a una conexion anthropic en un proxy: falso', () => {
    config.connections = [
      {
        ...conexionBase,
        protocol: 'anthropic',
        endpoint: 'https://mi-litellm.example.com/anthropic',
      },
    ]
    expect(isFirstPartyAnthropicEndpoint('test:claude-opus-4-7')).toBe(false)
  })

  test.todo('13. el modelo resuelve a una conexion openai: falso, no es un endpoint de Anthropic', () => {
    config.connections = [
      {
        ...conexionBase,
        protocol: 'openai',
        endpoint: 'https://api.openai.com/v1',
        models: [{ id: 'gpt-5.5', label: 'GPT-5.5' }],
      },
    ]
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
