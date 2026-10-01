/**
 * El proxy local declara dónde escucha y con qué clave se entra, y quien lo
 * consume —los handlers MITM— lee la misma declaración. Sin ella cada
 * consumidor tendría que adivinar la dirección, que es lo que obliga a
 * OmniRoute a caer a un puerto fijo (`API_PORT`/`PORT`/`20128`).
 *
 * Variables, todas del entorno del proceso:
 *   THYROX_PROXY_HOST      host de escucha; por defecto 127.0.0.1
 *   THYROX_PROXY_PORT      puerto; por defecto 20128, el de OmniRoute
 *   THYROX_PROXY_API_KEYS  claves locales separadas por comas
 */
import { describe, expect, test } from 'bun:test'
import { proxyBaseUrl, proxyClientKey, resolveProxyEndpoint } from '../src/proxy/proxyEndpoint.ts'

describe('resolveProxyEndpoint', () => {
  test('sin declaración: loopback, puerto por defecto y sin claves', () => {
    expect(resolveProxyEndpoint({})).toEqual({ host: '127.0.0.1', port: 20128, accessKeys: [] })
  })

  test('THYROX_PROXY_HOST y THYROX_PROXY_PORT se respetan', () => {
    expect(resolveProxyEndpoint({ THYROX_PROXY_HOST: '::1', THYROX_PROXY_PORT: '31001' }))
      .toEqual({ host: '::1', port: 31001, accessKeys: [] })
  })

  test('THYROX_PROXY_API_KEYS se parte por comas y descarta vacíos', () => {
    expect(resolveProxyEndpoint({ THYROX_PROXY_API_KEYS: ' k1 , ,k2 ' }).accessKeys).toEqual(['k1', 'k2'])
  })

  test('un puerto que no es entero en rango rehúsa en vez de caer al defecto', () => {
    expect(() => resolveProxyEndpoint({ THYROX_PROXY_PORT: 'abc' })).toThrow(/THYROX_PROXY_PORT/)
    expect(() => resolveProxyEndpoint({ THYROX_PROXY_PORT: '70000' })).toThrow(/THYROX_PROXY_PORT/)
  })

  test('un host que no es loopback rehúsa: el proxy lleva credenciales', () => {
    expect(() => resolveProxyEndpoint({ THYROX_PROXY_HOST: '0.0.0.0' })).toThrow(/THYROX_PROXY_HOST/)
  })
})

describe('lo que lee un cliente del proxy', () => {
  test('proxyBaseUrl compone http://host:puerto, con corchetes para IPv6', () => {
    expect(proxyBaseUrl({})).toBe('http://127.0.0.1:20128')
    expect(proxyBaseUrl({ THYROX_PROXY_HOST: '::1', THYROX_PROXY_PORT: '9' })).toBe('http://[::1]:9')
  })

  test('proxyClientKey es la primera clave declarada, o vacía', () => {
    expect(proxyClientKey({ THYROX_PROXY_API_KEYS: 'a,b' })).toBe('a')
    expect(proxyClientKey({})).toBe('')
  })
})
