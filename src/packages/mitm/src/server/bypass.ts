/**
 * Las decisiones de conexión del servidor MITM: excluir, descifrar o pasar
 * en túnel; la guarda contra reentrar en el propio servidor; la lectura de
 * `bypass.json` y el nivel de detalle del registro.
 *
 * Porte de `omniroute: src/mitm/_internal/bypass.cjs` (MIT). Ese shim existía
 * porque el servidor de la referencia es un proceso CommonJS que no puede
 * importar TypeScript; el de thyrox sí, así que la exclusión reutiliza
 * `shouldBypass` de `passthrough.ts` en vez de duplicar sus patrones.
 */
import { shouldBypass } from '../passthrough.ts'

export type BypassRoute = 'bypass' | 'target' | 'passthrough'

type HostSet = { has(host: string): boolean } | readonly string[]

/**
 * Qué hacer con la conexión: exclusión > destino > paso directo. El conjunto
 * de destinos es el del servidor, que se amplía con `targets.json`.
 */
export function routeBypass(hostname: string, targetHosts: HostSet, userBypassPatterns: string[]): BypassRoute {
  if (!hostname) return 'passthrough'
  const h = hostname.toLowerCase()
  if (shouldBypass(h, userBypassPatterns)) return 'bypass'
  const isTarget = Array.isArray(targetHosts)
    ? (targetHosts as readonly string[]).includes(h)
    : (targetHosts as { has(host: string): boolean }).has(h)
  return isTarget ? 'target' : 'passthrough'
}

/**
 * Los patrones de `bypass.json`, en minúsculas. Sin E/S: el servidor lee el
 * archivo de su ruta ya resuelta. Un contenido ausente o malformado es una
 * lista vacía, porque el proxy tiene que funcionar sin personalización.
 */
export function parseBypassJson(raw: string): string[] {
  if (typeof raw !== 'string' || raw.length === 0) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    const patterns = (parsed as { patterns?: unknown } | null)?.patterns
    if (!Array.isArray(patterns)) return []
    return patterns.filter((p): p is string => typeof p === 'string' && p.length > 0).map(p => p.toLowerCase())
  } catch {
    return []
  }
}

export function isLoopbackIp(ip: string): boolean {
  if (typeof ip !== 'string') return false
  if (ip === '::1' || ip === '::ffff:127.0.0.1') return true
  return /^127\./.test(ip)
}

/**
 * ¿Marcar a ese destino reentraría en este mismo servidor? Una dirección de
 * bucle local en el puerto propio sería un bucle infinito que agota los
 * descriptores. Es la guarda estructural; la principal es la cabecera de
 * origen que el servidor añade a lo que reenvía.
 */
export function isSelfLoopDestination(targetIp: string, destPort: number, localPort: number): boolean {
  return isLoopbackIp(targetIp) && Number(destPort) === Number(localPort)
}

/** El nivel de detalle del registro de decisiones: 1 por defecto, 0 lo silencia. */
export function parseVerboseLevel(envValue: string | undefined): number {
  const n = Number.parseInt(envValue ?? '', 10)
  return Number.isInteger(n) && n >= 0 ? n : 1
}
