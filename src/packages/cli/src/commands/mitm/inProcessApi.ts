/**
 * La API local del MITM resuelta en proceso: las mismas rutas que sirve
 * `thyrox mitm serve`, sobre el store, sin levantar un servidor. Los verbos de
 * la CLI heredan así su validación y su semántica en vez de reescribirlas.
 */
import type { Database } from 'bun:sqlite'

import { mitmApiRoutes } from '@thyrox/mitm/api/mitmApi'
import { createApiHandler } from '@thyrox/mitm/api/router'
import type { TrafficBuffer } from '@thyrox/mitm/inspector/buffer'

export interface ApiRequest {
  method: string
  path: string
  body?: unknown
}

export type MitmApiCall = (request: ApiRequest) => Promise<Response>

const LOOPBACK = '127.0.0.1'

/** Sin token de ingesta: en proceso nadie publica capturas, y la ruta las rehúsa. */
export function inProcessApi(db: Database, traffic: TrafficBuffer): MitmApiCall {
  const handle = createApiHandler(mitmApiRoutes(db, { traffic, ingestToken: '' }), { peerAddress: () => LOOPBACK })
  return ({ method, path, body }) =>
    handle(
      new Request(`http://${LOOPBACK}${path}`, {
        method,
        headers: { host: LOOPBACK, 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    )
}
