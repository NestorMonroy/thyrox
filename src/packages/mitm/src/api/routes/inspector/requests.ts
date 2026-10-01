/**
 * Las peticiones capturadas: la lista filtrada y vaciarla, una con su
 * anotación, repetirla contra el proxy local y exportar la lista como HAR.
 *
 * Porte de `omniroute: src/app/api/tools/traffic-inspector/{requests,
 * requests/[id],requests/[id]/annotation,requests/[id]/replay,export.har}/route.ts` (MIT).
 */
import { proxyBaseUrl } from '@thyrox/provider/proxy/proxyEndpoint'
import { sanitizeErrorMessage } from '@thyrox/provider/sanitize/errorSanitization'
import { z } from 'zod'

import { globalTrafficBuffer, type TrafficBuffer } from '../../../inspector/buffer.ts'
import { toHar } from '../../../inspector/harExport.ts'
import type { ListFilters } from '../../../inspector/types.ts'
import { InspectorAnnotationPutSchema, InspectorListQuerySchema } from '../../../schemas/inspector.ts'
import { errorResponse, parseJsonBody } from '../../http.ts'
import type { ApiRoute } from '../../router.ts'
import { inspectorPath } from './basePath.ts'
import { harAttachment } from './har.ts'

export interface RequestRouteDeps {
  traffic: Pick<TrafficBuffer, 'list' | 'get' | 'update' | 'clear'>
  /** La base del proxy local, contra la que se repite una petición. */
  proxyBaseUrl: () => string
  fetch: typeof fetch
}

export const realRequestRouteDeps: RequestRouteDeps = {
  traffic: globalTrafficBuffer,
  proxyBaseUrl: () => proxyBaseUrl(process.env).replace(/\/+$/, ''),
  fetch,
}

function requestNotFound(): Response {
  return errorResponse({ status: 404, message: 'Request not found' })
}

/** Los filtros de la consulta, o el 400 si no pasan el esquema. */
function listFilters(url: URL): { ok: true; filters: ListFilters } | { ok: false; response: Response } {
  const parsed = InspectorListQuerySchema.safeParse(Object.fromEntries(url.searchParams))
  if (!parsed.success) {
    return {
      ok: false,
      response: errorResponse({ status: 400, message: 'Invalid query', details: z.flattenError(parsed.error) }),
    }
  }
  return { ok: true, filters: { ...parsed.data, agent: parsed.data.agent as ListFilters['agent'] } }
}

export function createRequestRoutes(deps: RequestRouteDeps): ApiRoute[] {
  const { traffic } = deps
  return [
    {
      method: 'GET',
      path: inspectorPath('/requests'),
      handler: ({ url }) => {
        const query = listFilters(url)
        if (!query.ok) return query.response
        const requests = traffic.list(query.filters)
        return Response.json({ requests, total: requests.length })
      },
    },
    {
      method: 'DELETE',
      path: inspectorPath('/requests'),
      handler: () => {
        traffic.clear()
        return new Response(null, { status: 204 })
      },
    },
    {
      method: 'GET',
      path: inspectorPath('/requests/:id'),
      handler: ({ params }) => {
        const entry = traffic.get(params.id)
        return entry ? Response.json(entry) : requestNotFound()
      },
    },
    {
      method: 'PUT',
      path: inspectorPath('/requests/:id/annotation'),
      handler: async ({ request, params }) => {
        const body = await parseJsonBody(request, InspectorAnnotationPutSchema)
        if (!body.ok) return body.response
        const entry = traffic.get(params.id)
        if (!entry) return requestNotFound()
        const updated = { ...entry, annotation: body.data.annotation }
        traffic.update(params.id, updated)
        return Response.json(updated)
      },
    },
    {
      method: 'POST',
      path: inspectorPath('/requests/:id/replay'),
      handler: async ({ params }) => {
        const entry = traffic.get(params.id)
        if (!entry) return requestNotFound()
        const headers: Record<string, string> = {
          'content-type': 'application/json',
          'x-thyrox-source': 'inspector-replay',
        }
        // Una autorización enmascarada no sirve de nada: se repite sin ella.
        const auth = entry.requestHeaders.authorization ?? entry.requestHeaders.Authorization
        if (auth && !auth.includes('***')) headers.authorization = auth
        try {
          const upstream = await deps.fetch(`${deps.proxyBaseUrl()}${entry.path}`, {
            method: entry.method,
            headers,
            body: entry.requestBody ?? undefined,
          })
          return new Response(await upstream.text(), {
            status: upstream.status,
            headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
          })
        } catch (err) {
          return errorResponse({ status: 502, message: sanitizeErrorMessage(String(err)) || 'Replay failed' })
        }
      },
    },
    {
      method: 'GET',
      path: inspectorPath('/export.har'),
      handler: ({ url }) => {
        const query = listFilters(url)
        return query.ok ? harAttachment(toHar(traffic.list(query.filters)), 'traffic.har') : query.response
      },
    },
  ]
}
