/**
 * Guardas de red de la pasarela — porte de 2.1.283.
 *
 * - `chunk-379zyrv7.js`: `m6` [71573) con `zc`, `ir` (conjunto), `ar`, `dr`,
 *   `oo`, `cr`, `Hc`; `Uc`/`lr` son `isIPv4`/`isIPv6` de `net`.
 * - `chunk-wg7ts4cy.js`: `ph` [982261), `dh` [981963), `zM` [982513),
 *   `ir` (función) [982626), `K$`/`$_` [1037042), y la validación de
 *   cabeceras de upstream dentro de `Lre` (`xre`, `Mre`, `jre`, `Ure`).
 *
 * `ph` usa `ipaddr.js` sólo para dos preguntas —¿parsea como IP? y ¿su rango
 * es `loopback` o `unspecified`?—; aquí se responden con `net.isIP` y los
 * bytes de `dr`, sobre un hostname que `new URL` ya normalizó.
 *
 * Divergencia declarada: el cliente rehúsa el loopback salvo con
 * `CLAUDE_GATEWAY_ALLOW_LOOPBACK`; aquí el loopback es un destino válido por
 * diseño y esa variable no tiene equivalente (ver `isBlockedUpstreamIp`).
 */
import { isIP, isIPv4, isIPv6 } from 'node:net'

/** `zc`: nombres que siempre apuntan a la máquina o a sus metadatos. */
const BLOCKED_NAMES = new Set([
  'metadata.google.internal',
  'metadata.goog',
  'metadata',
  'instance-data',
  'instance-data.ec2.internal',
  'ip6-localhost',
  'ip6-loopback',
  'localhost.localdomain',
  'localhost4',
  'localhost4.localdomain4',
  'localhost6',
  'localhost6.localdomain6',
])

/** `ir` de `chunk-379zyrv7.js`: endpoints de metadatos de Alibaba, Azure y el de NAT64 local. */
const BLOCKED_IPV4 = new Set(['100.100.100.200', '168.63.129.16', '192.0.0.192'])

/** `zM`: los nombres de metadatos que `ir` (función) rehúsa en una URL. */
const METADATA_NAMES = new Set([
  'metadata.google.internal',
  'metadata.goog',
  'metadata',
  'instance-data',
  'instance-data.ec2.internal',
])

/** `K$`: las formas literales de un host de escucha en loopback. */
const LOOPBACK_LISTEN_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

/** `ar`: 127/8, 169.254/16 y 0/8. */
function isBlockedIPv4Octets(a: number, b: number, _c: number, _d: number): boolean {
  return a === 127 || (a === 169 && b === 254) || a === 0
}

/** `dr`: los 16 bytes de una IPv6 (con zona o cola IPv4), o undefined. */
export function parseIPv6Bytes(text: string): number[] | undefined {
  const zone = text.indexOf('%')
  const halves = (zone >= 0 ? text.slice(0, zone) : text).toLowerCase().split('::')
  if (halves.length > 2) return undefined
  const head = halves[0] ? halves[0].split(':') : []
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : []
  const last = halves.length === 2 ? tail : head
  let v4: number[] = []
  const lastGroup = last.at(-1)
  if (lastGroup !== undefined && lastGroup.includes('.')) {
    const octets = lastGroup.split('.').map(Number)
    if (octets.length !== 4 || octets.some(o => !Number.isInteger(o) || o < 0 || o > 255)) return undefined
    v4 = octets
    last.pop()
  }
  const toBytes = (groups: string[]): number[] | undefined => {
    const out: number[] = []
    for (const g of groups) {
      if (!/^[0-9a-f]{1,4}$/.test(g)) return undefined
      const n = parseInt(g, 16)
      out.push(n >> 8, n & 255)
    }
    return out
  }
  const before = toBytes(halves.length === 2 ? head : [])
  const after = toBytes(last)
  if (before === undefined || after === undefined) return undefined
  const used = before.length + after.length + v4.length
  if (used > 16 || (halves.length === 1 && used !== 16)) return undefined
  return [...before, ...Array(16 - used).fill(0), ...after, ...v4]
}

/** `oo`: el prefijo NAT64 bien conocido 64:ff9b::/32. */
function isNat64Prefix(b: number[]): boolean {
  return b[0] === 0 && b[1] === 100 && b[2] === 255 && b[3] === 155
}

/** `cr`: 64:ff9b:1::/48, el NAT64 local. */
function isLocalNat64(b: number[]): boolean {
  return isNat64Prefix(b) && b[4] === 0 && b[5] === 1
}

/** `Hc`: las IPv4 que una IPv6 lleva dentro (6to4, mapeada, compatible, NAT64, ISATAP). */
function embeddedIPv4(b: number[]): number[][] {
  const out: number[][] = []
  if (b[0] === 32 && b[1] === 2) out.push(b.slice(2, 6))
  const zeroPrefix = b.slice(0, 10).every(x => x === 0)
  const mapped = zeroPrefix && b[10] === 255 && b[11] === 255
  const compatible = zeroPrefix && b[10] === 0 && b[11] === 0
  const nat64 = isNat64Prefix(b) && b.slice(4, 12).every(x => x === 0)
  const isatap = (b[8] === 0 || b[8] === 2) && b[9] === 0 && b[10] === 94 && b[11] === 254
  if (mapped || compatible || nat64 || isatap) out.push(b.slice(12, 16))
  return out
}

/** `m6`: ¿el host apunta a la propia máquina, a su enlace local o a metadatos? */
export function isBlockedHost(host: string): boolean {
  let h = host.toLowerCase().replace(/^\[|\]$/g, '')
  if (h.endsWith('.')) h = h.slice(0, -1)
  if (h === '' || h === 'localhost' || h.endsWith('.localhost')) return true
  if (BLOCKED_NAMES.has(h)) return true
  if (h.startsWith('instance-data.') && h.endsWith('.compute.internal')) return true
  if (isIPv4(h)) {
    if (BLOCKED_IPV4.has(h)) return true
    const [a = 0, b = 0, c = 0, d = 0] = h.split('.').map(Number)
    return isBlockedIPv4Octets(a, b, c, d)
  }
  if (!isIPv6(h)) return false
  const bytes = parseIPv6Bytes(h)
  if (bytes === undefined) return true
  if (isLocalNat64(bytes)) return true
  if (bytes.every(x => x === 0)) return true
  if (bytes.slice(0, 15).every(x => x === 0) && bytes[15] === 1) return true
  if (h === 'fd00:ec2::254') return true
  if (bytes[0] === 254 && (bytes[1] ?? 0) >= 128 && (bytes[1] ?? 0) <= 191) return true
  return embeddedIPv4(bytes).some(([a = 0, b = 0, c = 0, d = 0]) => {
    return isBlockedIPv4Octets(a, b, c, d) || BLOCKED_IPV4.has(`${a}.${b}.${c}.${d}`)
  })
}

/** Primer octeto de 127/8, el bloque de loopback de IPv4. */
const IPV4_LOOPBACK_FIRST_OCTET = 127

/** Los 16 bytes de una IPv4 mapeada en IPv6 (`::ffff:a.b.c.d`), o undefined. */
function mappedIPv4Octets(bytes: number[]): number[] | undefined {
  const mapped = bytes.slice(0, 10).every(x => x === 0) && bytes[10] === 255 && bytes[11] === 255
  return mapped ? bytes.slice(12) : undefined
}

/**
 * Loopback: 127/8, `::1` y 127/8 mapeado en IPv6. Sólo alcanza la propia
 * máquina en el espacio de red de quien conecta, y es donde vive el Ollama
 * gestionado (ADR-THYROX-007, Regla 5).
 */
function isLoopbackIp(ip: string): boolean {
  if (isIPv4(ip)) return Number(ip.split('.')[0]) === IPV4_LOOPBACK_FIRST_OCTET
  const bytes = parseIPv6Bytes(ip)
  if (bytes === undefined) return false
  const mapped = mappedIPv4Octets(bytes)
  if (mapped !== undefined) return mapped[0] === IPV4_LOOPBACK_FIRST_OCTET
  return bytes.slice(0, 15).every(x => x === 0) && bytes[15] === 1
}

/**
 * `ph`, con una divergencia declarada: en el cliente el loopback se rehúsa
 * salvo con una variable de permiso; en thyrox es un destino válido por diseño,
 * porque sus servicios locales (el Ollama gestionado) se sirven ahí. El resto
 * de direcciones especiales —no especificada, enlace local, metadatos, NAT64
 * local— sigue rehusado, y la variable ya no abre ninguna de ellas. Un nombre
 * que no es IP pasa y se juzga en `isSafeUpstreamUrl`.
 */
function isBlockedUpstreamIp(host: string): boolean {
  const ip = host.replace(/^\[|\]$/g, '').replace(/%.*$/, '')
  if (isIP(ip) === 0) return false
  if (isLoopbackIp(ip)) return false
  return isBlockedHost(ip)
}

/** `ir` (función): una `base_url` de upstream aceptable. */
export function isSafeUpstreamUrl(
  url: string,
): boolean {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false
  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '')
  if (host.split('.').includes('')) return false
  if (METADATA_NAMES.has(host)) return false
  return !isBlockedUpstreamIp(host)
}

/** `$_`: ¿el host de escucha es loopback? (exige `public_url` si no). */
export function isLoopbackListenHost(host: string): boolean {
  return LOOPBACK_LISTEN_HOSTS.has(host)
}

/** `xre`: cabeceras que la pasarela o el SDK del proveedor fijan o firman. */
const RESERVED_HEADERS = new Set([
  'authorization', 'proxy-authorization', 'x-api-key', 'api-key', 'host', 'content-length',
  'content-encoding', 'transfer-encoding', 'connection', 'keep-alive', 'te', 'trailer', 'upgrade',
  'expect', 'content-type', 'accept', 'accept-encoding', 'user-agent', 'x-litellm-end-user-id',
])
/** `Mre`: prefijos reservados. `x-claude-gateway-` es del cliente: aquí también `x-thyrox-gateway-`. */
const RESERVED_HEADER_PREFIXES = [
  'anthropic-', 'x-stainless-', 'x-claude-gateway-', 'x-thyrox-gateway-', 'x-goog-', 'x-amz-', 'x-amzn-',
]
const HEADER_NAME = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/
const HEADER_VALUE = /^[\x20-\x7e]+$/

/** La `superRefine` de `headers` de un upstream, como lista de avisos. */
export function validateUpstreamHeaders(headers: Record<string, string>): string[] {
  const issues: string[] = []
  const seen = new Set<string>()
  for (const [name, value] of Object.entries(headers)) {
    const lower = name.toLowerCase()
    const problem = !HEADER_NAME.test(name)
      ? 'is not a valid HTTP header name'
      : seen.has(lower)
        ? 'is listed twice (header names ignore case)'
        : RESERVED_HEADERS.has(lower) || RESERVED_HEADER_PREFIXES.some(p => lower.startsWith(p))
          ? "is reserved (the gateway or the provider's SDK sets or signs it). Remove it from this upstream's headers."
          : !HEADER_VALUE.test(value) || value !== value.trim()
            ? "has an empty or invalid value: use printable ASCII with no space at either end (if it comes from a ${VAR}, check that variable's value)"
            : undefined
    seen.add(lower)
    if (problem) issues.push(`header '${name}' ${problem}`)
  }
  return issues
}
