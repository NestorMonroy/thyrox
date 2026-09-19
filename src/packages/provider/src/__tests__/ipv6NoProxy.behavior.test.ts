import { describe, expect, test } from 'bun:test'

import { shouldBypassProxy } from '../proxy.ts'

/**
 * `NO_PROXY` con IPv6, en sus dos formas. Cierra TASK-THYROX-0204.
 *
 * El predicado heredado era ciego a las dos por razones distintas, y ninguna
 * de las dos se veia leyendo el codigo del matcher:
 *
 *   1. `URL.hostname` CONSERVA los corchetes de un literal IPv6 — medido:
 *      `new URL('http://[::1]:8080').hostname` da `'[::1]'`, y `isIP` sobre esa
 *      forma devuelve 0. Todo el razonamiento de IP de abajo quedaba inerte.
 *   2. Un literal IPv6 desnudo lleva dos puntos, asi que caia en la rama de
 *      `host:puerto`: `'::1:8080' === '::1'` es falso, nunca casaba.
 *
 * El defecto NO es cosmetico: un `NO_PROXY` que el operador declara y el
 * predicado no lee manda por el proxy trafico que se le dijo que no mandara.
 *
 * Metrica: el veredicto de `shouldBypassProxy` sobre una URL y un `NO_PROXY`
 * dados, por conducta.
 * Ciega a: si el agente que se construye despues honra el veredicto — eso lo
 * miden `getProxyAgent` y `getProxyFetchOptions`, no este predicado.
 */
describe('shouldBypassProxy — IPv6', () => {
  test('reconoce un literal IPv6 desnudo', () => {
    expect(shouldBypassProxy('http://[::1]:8080/x', '::1')).toBe(true)
  })

  test('reconoce un bloque CIDR IPv6 de rango unico local', () => {
    expect(shouldBypassProxy('http://[fd00::1]:443/x', 'fd00::/8')).toBe(true)
  })

  test('reconoce un bloque CIDR IPv6 de enlace local', () => {
    expect(shouldBypassProxy('http://[fe80::1]:443/x', 'fe80::/10')).toBe(true)
  })

  // Prefijo > 32, que es donde mordia el tope de la version heredada. Sin este
  // caso la guarda `maxPrefix` quedaba SIN MEDIR: al anularla no caia ninguna
  // asercion — el sub-patron D con el propio control como sujeto.
  test('admite un prefijo mayor que 32, que el tope heredado rechazaba', () => {
    expect(shouldBypassProxy('http://[fd12:3456:789a::1]/x', 'fd12:3456:789a::/48')).toBe(true)
  })

  test('un bloque IPv6 NO casa una direccion de otro bloque', () => {
    expect(shouldBypassProxy('http://[2001:db8::1]/x', 'fd00::/8')).toBe(false)
    expect(shouldBypassProxy('http://[fd99::1]/x', 'fd12:3456:789a::/48')).toBe(false)
  })

  // Conducta de `BlockList`, medida: coincide con el `ParseIP().To4()` de
  // `golang.org/x/net/http/httpproxy`, que es la referencia que el matcher ya
  // cita. Se adopta, no se corrige.
  test('un bloque IPv4 casa su direccion IPv4-mapeada', () => {
    expect(shouldBypassProxy('http://[::ffff:127.0.0.1]/x', '127.0.0.0/8')).toBe(true)
  })

  test('CONTROL: el camino IPv4 no cambia', () => {
    expect(shouldBypassProxy('http://127.0.0.1:8080/x', '127.0.0.0/8')).toBe(true)
    expect(shouldBypassProxy('http://8.8.8.8/x', '127.0.0.0/8')).toBe(false)
  })
})
