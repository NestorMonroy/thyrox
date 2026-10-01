/**
 * El plazo de inactividad de los sockets del MITM: un túnel que no mueve
 * datos durante ese tiempo se destruye. Sin él, los túneles colgados
 * —Wi-Fi caída, upstreams que nunca envían FIN ni RST— se acumulan hasta
 * agotar los descriptores de archivo. El defecto de 60 s es el del relay de
 * ProxyBridge, que OmniRoute sigue.
 *
 * `THYROX_MITM_IDLE_TIMEOUT_MS` lo declara; un valor que no es un número
 * positivo cae al defecto.
 *
 * Porte de `omniroute: src/mitm/socketTimeouts.ts` (MIT).
 */
import type { Socket } from 'node:net'

const DEFAULT_IDLE_TIMEOUT_MS = 60000

function parsePositiveNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export const MITM_IDLE_TIMEOUT_MS = parsePositiveNumber(
  process.env.THYROX_MITM_IDLE_TIMEOUT_MS,
  DEFAULT_IDLE_TIMEOUT_MS,
)

/** Destruye `socket` si pasa `ms` milisegundos sin entrada ni salida. */
export function applyIdleTimeout(socket: Socket, ms: number = MITM_IDLE_TIMEOUT_MS): void {
  socket.setTimeout(ms, () => {
    socket.destroy()
  })
}
