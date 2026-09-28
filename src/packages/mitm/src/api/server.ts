/**
 * El servidor de la API local del MITM: `Bun.serve` en `127.0.0.1`, con el
 * par de cada petición leído del socket. Es propio del paquete porque el
 * proxy de `@thyrox/provider` no puede montar estas rutas: `@thyrox/mitm` ya
 * depende de él.
 */
import { errorResponse } from './http.ts'
import { LIVE_STREAM_PATH, liveStreamHandlers, type LiveStreamSocketData, type LiveStreamSource } from './liveStream.ts'
import { isLocalRequest } from './locality.ts'
import { createApiHandler, localOnlyRejection, type ApiRoute } from './router.ts'

export const MITM_API_HOSTNAME = '127.0.0.1'

export interface MitmApiServer {
  hostname: string
  port: number
  stop(): void
}

export interface MitmApiServerOptions {
  port: number
  routes: readonly ApiRoute[]
  /** El canal en vivo del inspector; sin él, su ruta es una desconocida más. */
  liveStream?: LiveStreamSource
}

export function startMitmApiServer(options: MitmApiServerOptions): MitmApiServer {
  let server: ReturnType<typeof Bun.serve<LiveStreamSocketData>> | undefined
  const peerAddress = (request: Request) => server?.requestIP(request)?.address ?? null
  const handle = createApiHandler(options.routes, { peerAddress })
  const liveStream = options.liveStream

  // El websocket se negocia antes del enrutador, que sólo sabe devolver
  // respuestas; la guarda de loopback es la misma.
  const upgradeLiveStream = (request: Request): Response | undefined => {
    if (!isLocalRequest(request, peerAddress(request))) return localOnlyRejection()
    if (request.headers.get('upgrade')?.toLowerCase() !== 'websocket') {
      return errorResponse({ status: 426, message: 'Upgrade Required', headers: { upgrade: 'websocket' } })
    }
    if (server?.upgrade(request, { data: {} })) return undefined
    return errorResponse({ status: 400, message: 'WebSocket upgrade failed' })
  }

  server = Bun.serve<LiveStreamSocketData>({
    hostname: MITM_API_HOSTNAME,
    port: options.port,
    fetch: request =>
      liveStream && new URL(request.url).pathname === LIVE_STREAM_PATH ? upgradeLiveStream(request) : handle(request),
    websocket: liveStreamHandlers(liveStream ?? { subscribe: () => () => {} }),
  })
  const running = server
  return {
    hostname: MITM_API_HOSTNAME,
    port: running.port ?? options.port,
    stop: () => {
      void running.stop(true)
    },
  }
}
