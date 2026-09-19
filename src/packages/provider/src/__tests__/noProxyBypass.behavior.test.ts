import { describe, expect, test } from 'bun:test'

import { shouldBypassProxy } from '../proxy.ts'

/**
 * Las TRES formas de `NO_PROXY` que el entorno declara y el predicado no lee.
 *
 * El control positivo no es fabricado: es el `NO_PROXY` real del contenedor
 * remoto en que corre esta sesión, cuya lista declara bloques CIDR
 * (`10.0.0.0/8`, `172.16.0.0/12`, `169.254.0.0/16`, `100.64.0.0/10`) y un
 * comodín (`*.svc.cluster.local`) junto a hosts literales.
 *
 * El matcher heredado de `ccnmt: packages/provider/src/proxy.ts` conoce cuatro
 * formas —`*`, `host:puerto`, `.sufijo` con punto guía, y host exacto— así que
 * ensancharlo es una divergencia declarada frente a la referencia, no la
 * corrección de un porte parcial.
 *
 * La forma del glob se adapta de `omniroute: open-sse/utils/proxyFetch.ts:449`
 * (MIT), que lo resuelve con un escaneo lineal en vez de componer un `RegExp`
 * dinámico — un patrón de `NO_PROXY` es entrada no confiable, y un `RegExp`
 * compuesto desde ella admite ReDoS. Esa raíz **no** lee CIDR: cubre los
 * rangos privados con una lista paralela codificada a mano (`isLocalAddress`,
 * `:480`), que es un segundo significante para el mismo significado y puede
 * divergir de lo que el entorno declaró. Aquí se lee el CIDR declarado.
 */
const REAL_NO_PROXY =
  'localhost,127.0.0.1,::1,127.0.0.0/8,0.0.0.0/8,::,169.254.0.0/16,' +
  'api.anthropic.com,registry.npmjs.org,pypi.org,host.docker.internal,' +
  '10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,100.64.0.0/10,' +
  '.svc.cluster.local,*.svc.cluster.local'

describe('shouldBypassProxy — las formas que la referencia ya leía', () => {
  test('el comodín solitario cubre todo destino', () => {
    expect(shouldBypassProxy('https://api.github.com/x', '*')).toBe(true)
  })

  test('el host literal se compara entero', () => {
    expect(shouldBypassProxy('https://api.anthropic.com/v1', REAL_NO_PROXY)).toBe(true)
  })

  test('el punto guía cubre el subdominio y el dominio pelado', () => {
    expect(shouldBypassProxy('https://a.svc.cluster.local/x', '.svc.cluster.local')).toBe(true)
    expect(shouldBypassProxy('https://svc.cluster.local/x', '.svc.cluster.local')).toBe(true)
  })

  test('el par host:puerto discrimina el puerto', () => {
    expect(shouldBypassProxy('https://a.example.com:8443/x', 'a.example.com:8443')).toBe(true)
    expect(shouldBypassProxy('https://a.example.com:9999/x', 'a.example.com:8443')).toBe(false)
  })

  test('un destino fuera de la lista NO se salta el proxy', () => {
    expect(shouldBypassProxy('https://api.github.com/x', REAL_NO_PROXY)).toBe(false)
  })
})

describe('shouldBypassProxy — las TRES formas ciegas', () => {
  test('forma 1: bloque CIDR', () => {
    expect(shouldBypassProxy('https://10.1.2.3/x', REAL_NO_PROXY)).toBe(true)
    expect(shouldBypassProxy('https://172.20.0.5/x', REAL_NO_PROXY)).toBe(true)
    expect(shouldBypassProxy('https://192.168.1.7/x', REAL_NO_PROXY)).toBe(true)
    // El punto final de metadata de la nube. Enviarlo por un proxy externo
    // expone credenciales de instancia: es el caso más caro de la lista.
    expect(shouldBypassProxy('https://169.254.169.254/latest/meta-data/', REAL_NO_PROXY)).toBe(true)
  })

  test('forma 1-bis: un CIDR NO cubre una dirección de fuera del bloque', () => {
    expect(shouldBypassProxy('https://11.0.0.1/x', '10.0.0.0/8')).toBe(false)
    expect(shouldBypassProxy('https://172.32.0.1/x', '172.16.0.0/12')).toBe(false)
  })

  test('forma 2: comodín glob', () => {
    expect(shouldBypassProxy('https://foo.svc.cluster.local/x', '*.svc.cluster.local')).toBe(true)
    expect(shouldBypassProxy('https://192.168.1.7/x', '192.168.*')).toBe(true)
    expect(shouldBypassProxy('https://api.github.com/x', '*.svc.cluster.local')).toBe(false)
  })

  test('forma 3: el dominio desnudo cubre sus subdominios', () => {
    // Es la convención de curl y de `golang.org/x/net/http/httpproxy`: un
    // patrón sin punto guía casa el dominio Y todo lo que cuelgue de él.
    expect(shouldBypassProxy('https://api.example.com/x', 'example.com')).toBe(true)
    expect(shouldBypassProxy('https://example.com/x', 'example.com')).toBe(true)
    // Y no casa un dominio que sólo TERMINA con el mismo texto.
    expect(shouldBypassProxy('https://notexample.com/x', 'example.com')).toBe(false)
  })
})
