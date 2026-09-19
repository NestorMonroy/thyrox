/**
 * Contrato de `getProxyUrl`: la elección es POR PROTOCOLO, y `ALL_PROXY` es
 * su respaldo.
 *
 * Hasta TASK-THYROX-0187 la función devolvía
 * `https_proxy || HTTPS_PROXY || http_proxy || HTTP_PROXY` sin mirar el
 * destino: un `http://` recibía el proxy de `https`. Y `ALL_PROXY` no se
 * leía en NINGÚN archivo del árbol (medido: 0), cuando es el respaldo que
 * la convención declara.
 *
 * La forma se adapta de `omniroute: open-sse/utils/proxyFetch.ts:502-526`
 * (MIT), que elige `HTTPS_PROXY || https_proxy || ALL_PROXY || all_proxy`
 * para un destino https y la terna equivalente para http.
 *
 * DIVERGENCIA declarada en la precedencia de caja: la referencia pone la
 * MAYÚSCULA primero; este árbol pone la minúscula, que es lo que
 * `getNoProxy` ya hace y lo que curl documenta. No se cambia por la
 * referencia: cambiarlo alteraría el comportamiento de un entorno que
 * declare las dos con valores distintos.
 *
 * El caso que DISCRIMINA es el 3: un destino `http://` con los dos proxies
 * declarados. Una implementación ciega al protocolo pasa 1, 2 y 4 y falla
 * el 3.
 *
 * Ciega a: qué hace el llamador con la URL devuelta — esta suite mide la
 * elección, no la conexión.
 */
import { describe, expect, test } from 'bun:test'
import { getProxyUrl } from '../proxy.js'

const HTTPS = 'http://proxy-https:8443'
const HTTP = 'http://proxy-http:8080'
const ALL = 'http://proxy-all:1080'

describe('getProxyUrl — lo que ya hacía, y no debe romperse', () => {
  test('sin destino declarado, https gana sobre http', () => {
    expect(getProxyUrl({ https_proxy: HTTPS, http_proxy: HTTP })).toBe(HTTPS)
  })

  test('la minúscula gana sobre la MAYÚSCULA', () => {
    expect(getProxyUrl({ https_proxy: HTTPS, HTTPS_PROXY: 'http://otro:1' })).toBe(HTTPS)
  })

  test('sin ninguna clave, undefined', () => {
    expect(getProxyUrl({})).toBeUndefined()
  })
})

describe('getProxyUrl — las DOS formas ciegas', () => {
  test('forma 1: un destino http:// recibe el proxy de http, no el de https', () => {
    expect(getProxyUrl({ https_proxy: HTTPS, http_proxy: HTTP }, 'http://api.example.com/v1'))
      .toBe(HTTP)
  })

  test('forma 1-bis: un destino https:// sigue recibiendo el de https', () => {
    expect(getProxyUrl({ https_proxy: HTTPS, http_proxy: HTTP }, 'https://api.example.com/v1'))
      .toBe(HTTPS)
  })

  test('forma 1-ter: un destino https:// NO cae al proxy de http', () => {
    // El caso que hace FALSIFICABLE la rama `https:`. Sin ella el camino sin
    // destino devuelve `http_proxy`, porque lo tiene cuarto en su cadena; la
    // referencia nunca lo lee para un destino TLS
    // (`omniroute: open-sse/utils/proxyFetch.ts:512-518`).
    expect(getProxyUrl({ http_proxy: HTTP }, 'https://api.example.com')).toBeUndefined()
  })

  test('forma 2: ALL_PROXY es el respaldo cuando no hay proxy de ese protocolo', () => {
    expect(getProxyUrl({ ALL_PROXY: ALL }, 'https://api.example.com')).toBe(ALL)
    expect(getProxyUrl({ all_proxy: ALL }, 'http://api.example.com')).toBe(ALL)
  })

  test('forma 2-bis: el proxy del protocolo gana sobre ALL_PROXY', () => {
    expect(getProxyUrl({ https_proxy: HTTPS, ALL_PROXY: ALL }, 'https://api.example.com'))
      .toBe(HTTPS)
  })

  test('sin destino, ALL_PROXY sigue siendo el respaldo de los cuatro', () => {
    expect(getProxyUrl({ all_proxy: ALL })).toBe(ALL)
  })

  test('una URL que no parsea cae al camino sin destino, no revienta', () => {
    expect(getProxyUrl({ https_proxy: HTTPS }, 'no-es-una-url')).toBe(HTTPS)
  })
})

describe('getProxyUrl — el protocolo que no es http: ni https:', () => {
  // La referencia resuelve con un ternario: `https:` toma la cadena de https
  // y TODO lo demas la de http (`omniroute: proxyFetch.ts:512-518`). Medido
  // quien la llama —`proxyFallback.ts:206`, `proxyFetch.ts:552`,
  // `tlsClientProxy.ts:21`—, su poblacion es la del camino de fetch y TLS: un
  // `ws:` de la referencia viaja por otro camino (`executors/uc/ws.ts`) y no
  // llega aqui. El ternario no es un descuido sobre `wss:`, es la forma.

  test('un destino ws:// toma la cadena de http, como todo lo no-https', () => {
    expect(getProxyUrl({ https_proxy: HTTPS, http_proxy: HTTP }, 'ws://api.example.com'))
      .toBe(HTTP)
  })

  test('un destino wss:// tambien, porque el eje es «es https», no «es TLS»', () => {
    expect(getProxyUrl({ https_proxy: HTTPS, http_proxy: HTTP }, 'wss://api.example.com'))
      .toBe(HTTP)
  })

  test('sin proxy de http, un destino no-https cae a ALL_PROXY, no al de https', () => {
    expect(getProxyUrl({ https_proxy: HTTPS, ALL_PROXY: ALL }, 'ftp://files.example.com'))
      .toBe(ALL)
  })
})
