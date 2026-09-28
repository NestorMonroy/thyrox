/**
 * El servidor de la API local del MITM: `Bun.serve` en `127.0.0.1`, con el
 * par de cada petición leído del socket. Es propio del paquete porque el
 * proxy de `@thyrox/provider` no puede montar estas rutas: `@thyrox/mitm` ya
 * depende de él.
 */
import { createApiHandler, type ApiRoute } from './router.ts'

export const MITM_API_HOSTNAME = '127.0.0.1'

export interface MitmApiServer {
  hostname: string
  port: number
  stop(): void
}

export function startMitmApiServer(options: { port: number; routes: readonly ApiRoute[] }): MitmApiServer {
  let server: ReturnType<typeof Bun.serve> | undefined
  const handle = createApiHandler(options.routes, {
    peerAddress: request => server?.requestIP(request)?.address ?? null,
  })
  server = Bun.serve({ hostname: MITM_API_HOSTNAME, port: options.port, fetch: handle })
  const running = server
  return {
    hostname: MITM_API_HOSTNAME,
    port: running.port ?? options.port,
    stop: () => {
      void running.stop(true)
    },
  }
}
