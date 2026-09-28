/**
 * Nombres de cabecera que nunca se reenvían a un upstream: el host, las de
 * salto a salto (RFC 7230 §6.1) y las que revelan la IP de origen del
 * cliente.
 *
 * Porte de `omniroute: src/shared/constants/upstreamHeaders.ts` (MIT).
 */
const FORBIDDEN = new Set(
  [
    'host',
    'connection',
    'content-length',
    'keep-alive',
    'proxy-connection',
    // Pertenecen a la conexión entre el cliente y el proxy, nunca a la
    // petición al proveedor: reenviar `proxy-authorization` le entregaría esa
    // credencial.
    'proxy-authenticate',
    'proxy-authorization',
    'transfer-encoding',
    'te',
    'trailer',
    'upgrade',
    // Revelarían (o falsearían) la IP de origen ante el proveedor.
    'x-forwarded-for',
    'x-forwarded-host',
    'x-forwarded-proto',
    'x-forwarded-port',
    'x-forwarded-server',
    'x-real-ip',
    'cf-connecting-ip',
    'true-client-ip',
    'client-ip',
    'forwarded',
    'via',
  ].map(s => s.toLowerCase()),
)

export function isForbiddenUpstreamHeaderName(name: string): boolean {
  return FORBIDDEN.has(String(name).trim().toLowerCase())
}
