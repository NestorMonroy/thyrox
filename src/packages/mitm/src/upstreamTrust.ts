/**
 * La CA de un proxy corporativo en el camino hacia los proveedores: con ella
 * configurada, un `fetch` hacia el upstream confía en los certificados que ese
 * proxy firma.
 *
 * Porte de `omniroute: src/mitm/upstreamTrust.ts` (MIT), que la instala en el
 * despachador global de undici. En Bun eso no tiene efecto: su `fetch` no pasa
 * por undici, y con `setGlobalDispatcher` sigue rechazando el certificado
 * (`.claude/workbench/bun-undici-global-dispatcher-probe-*`); un porte literal
 * callaría sin confiar en nada. Aquí la CA se guarda y cada `fetch` hacia un
 * upstream la recibe como `tls.ca`, la opción que Bun sí aplica.
 */
import { existsSync, readFileSync } from 'node:fs'

let upstreamCa: string | null = null

/**
 * Carga la CA de `pemPath`. Sin ruta no hace nada. Si la ruta no existe lanza
 * un error cuyo mensaje sólo nombra la variable y la ruta, sin traza.
 */
export function configureUpstreamCa(pemPath?: string): void {
  if (!pemPath) return
  if (!existsSync(pemPath)) {
    throw new Error(`THYROX_MITM_UPSTREAM_CA_CERT path does not exist: ${pemPath}`)
  }
  upstreamCa = readFileSync(pemPath, 'utf8')
}

/** La opción de `fetch` que aplica la CA configurada; vacía si no hay ninguna. */
export function upstreamTls(): { tls?: { ca: string } } {
  return upstreamCa ? { tls: { ca: upstreamCa } } : {}
}

/** Sólo para pruebas: olvida la CA configurada. */
export function resetUpstreamCaForTest(): void {
  upstreamCa = null
}
