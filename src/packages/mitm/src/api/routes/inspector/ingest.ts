/**
 * La ingesta del inspector: el punto por el que el servidor MITM —otro
 * proceso— publica lo que captura. Exige el token compartido además del
 * cerrojo de loopback del enrutador, para que otro proceso local no llene el
 * búfer; lo recibido entra saneado.
 *
 * Porte de `omniroute: src/app/api/tools/traffic-inspector/internal/ingest/route.ts` (MIT).
 */
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto'

import type { z } from 'zod'

import type { TrafficBuffer } from '../../../inspector/buffer.ts'
import { InterceptedRequestSchema, type InterceptedRequest } from '../../../inspector/types.ts'
import { maskSecret } from '../../../maskSecrets.ts'
import { sanitizeHeaders } from '../../../sanitizeHeaders.ts'
import { errorResponse, parseJsonBody } from '../../http.ts'
import type { ApiRoute } from '../../router.ts'
import { inspectorPath } from './basePath.ts'

export interface IngestRouteDeps {
  traffic: Pick<TrafficBuffer, 'push'>
  ingestToken: () => string
}

const MIN_INGEST_TOKEN_LENGTH = 16

/**
 * El token de ingesta: el del entorno si tiene al menos 16 caracteres; si no,
 * uno generado. Quien lanza el servidor MITM se lo pasa en el mismo entorno.
 */
export function resolveIngestToken(env: NodeJS.ProcessEnv = process.env): string {
  const declared = env.THYROX_INSPECTOR_INTERNAL_INGEST_TOKEN
  return declared && declared.length >= MIN_INGEST_TOKEN_LENGTH ? declared : randomUUID().replace(/-/g, '')
}

/** Comparación en tiempo constante sobre los resúmenes, que igualan la longitud. */
function tokenMatches(received: string, expected: string): boolean {
  if (!received || !expected) return false
  const digest = (value: string) => createHash('sha256').update(value).digest()
  return timingSafeEqual(digest(received), digest(expected))
}

function bearerToken(request: Request): string {
  const auth = request.headers.get('authorization') ?? ''
  return auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : ''
}

/** Lo mínimo que tiene que traer una entrada; el resto toma su valor por defecto. */
const IngestBodySchema = InterceptedRequestSchema.partial().required({
  id: true,
  timestamp: true,
  method: true,
  host: true,
  path: true,
  source: true,
  requestHeaders: true,
  requestSize: true,
  responseHeaders: true,
  responseSize: true,
  status: true,
})

/** La entrada lista para el búfer: cabeceras saneadas y cuerpos con los secretos enmascarados. */
function sanitizedEntry(data: z.infer<typeof IngestBodySchema>): InterceptedRequest {
  return {
    ...data,
    agent: data.agent as InterceptedRequest['agent'],
    requestHeaders: sanitizeHeaders(data.requestHeaders),
    responseHeaders: sanitizeHeaders(data.responseHeaders),
    requestBody: data.requestBody != null ? maskSecret(data.requestBody) : null,
    responseBody: data.responseBody != null ? maskSecret(data.responseBody) : null,
  } as InterceptedRequest
}

export function createIngestRoutes(deps: IngestRouteDeps): ApiRoute[] {
  return [
    {
      method: 'POST',
      path: inspectorPath('/internal/ingest'),
      handler: async ({ request }) => {
        if (!tokenMatches(bearerToken(request), deps.ingestToken())) {
          return errorResponse({ status: 403, message: 'Invalid or missing ingest token' })
        }
        const body = await parseJsonBody(request, IngestBodySchema)
        if (!body.ok) return body.response
        const entry = sanitizedEntry(body.data)
        deps.traffic.push(entry)
        return Response.json({ ok: true, id: entry.id })
      },
    },
  ]
}
