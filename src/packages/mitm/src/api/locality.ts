/**
 * Cuándo una petición a la API del MITM es local. Lo decide la IP real del
 * par, nunca un encabezado que el cliente controla, y falla cerrado: sin par
 * conocido no hay acceso.
 *
 * Porte de `omniroute: src/server/authz/routeGuard.ts` (`isLoopbackHost`) y
 * `peerContext.ts` (`isViaProxyRequest`, `isLoopbackRequest`) (MIT). La
 * referencia estampa el par en una cabecera firmada porque su runtime no
 * expone el socket; Bun sí lo da, así que se lee directamente. Tampoco se
 * porta la ampliación a la LAN privada: el servidor escucha sólo en
 * `127.0.0.1`, así que ningún par de la LAN llega a preguntarlo.
 */

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])

/** Las cabeceras que pone un proxy inverso: con ellas, el par es el proxy y no el usuario. */
const FORWARDING_HEADERS = ['x-forwarded-for', 'x-real-ip'] as const

export function isLoopbackHost(hostHeader: string | null): boolean {
  if (!hostHeader) return false
  let host = hostHeader.trim()
  if (host.startsWith('[')) {
    const bracketEnd = host.indexOf(']')
    host = bracketEnd >= 0 ? host.slice(1, bracketEnd) : host.slice(1)
  } else if ((host.match(/:/g) ?? []).length === 1) {
    // Un solo `:` es IPv4 u hostname con puerto; una IPv6 desnuda tiene varios.
    host = host.split(':')[0]!
  }
  host = host.replace(/^::ffff:/i, '')
  return LOOPBACK_HOSTS.has(host.toLowerCase())
}

export function hasForwardingHeaders(headers: Headers): boolean {
  return FORWARDING_HEADERS.some(name => headers.has(name))
}

/**
 * Local: sin cabeceras de reenvío, con par de loopback y con un `Host` de
 * loopback. Lo último no está en la referencia: sin él, una página web que
 * resuelva su dominio a 127.0.0.1 (DNS rebinding) alcanza estas rutas, que
 * instalan una CA y editan el DNS del sistema.
 */
export function isLocalRequest(request: Request, peerAddress: string | null): boolean {
  if (hasForwardingHeaders(request.headers)) return false
  if (!isLoopbackHost(peerAddress)) return false
  return isLoopbackHost(request.headers.get('host'))
}
