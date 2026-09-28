/**
 * El canal en vivo del inspector: un websocket que abre con el estado entero
 * del búfer (`snapshot`) y luego emite cada cambio (`new`, `update`,
 * `clear`). Cerrar el socket suelta la suscripción.
 *
 * Porte de `omniroute: src/app/api/tools/traffic-inspector/ws/route.ts`
 * (MIT). La referencia escribía a mano la respuesta 101 y las tramas sobre el
 * socket crudo de Next.js, con su latido; aquí los websockets son de
 * `Bun.serve`, que hace el protocolo, las tramas y los pings.
 */
import type { ServerWebSocket } from 'bun'

import type { WsEvent } from '../inspector/types.ts'
import { INSPECTOR_BASE } from './routes/inspector.ts'

export const LIVE_STREAM_PATH = `${INSPECTOR_BASE}/ws`

/** Lo que alimenta el canal: el búfer de tráfico cumple esta forma. */
export interface LiveStreamSource {
  subscribe(listener: (event: WsEvent) => void): () => void
}

export interface LiveStreamSocketData {
  unsubscribe?: () => void
}

/** Los manejadores de `Bun.serve` que conectan cada socket con la fuente. */
export function liveStreamHandlers(source: LiveStreamSource) {
  return {
    open(ws: ServerWebSocket<LiveStreamSocketData>) {
      ws.data.unsubscribe = source.subscribe(event => {
        ws.send(JSON.stringify(event))
      })
    },
    close(ws: ServerWebSocket<LiveStreamSocketData>) {
      ws.data.unsubscribe?.()
      ws.data.unsubscribe = undefined
    },
    // El cliente sólo escucha: lo que envíe se ignora.
    message() {},
  }
}
