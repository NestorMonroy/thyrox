/**
 * Las rutas del inspector de tráfico: la lista filtrada y su HAR, una
 * petición con su anotación y su repetición contra el proxy local, las
 * sesiones grabadas y los hosts propios con su entrada de DNS. El búfer, el
 * DNS y el `fetch` se inyectan.
 *
 * Porte de `omniroute: src/app/api/tools/traffic-inspector/{requests,
 * requests/[id],requests/[id]/annotation,requests/[id]/replay,export.har,
 * sessions,sessions/[id],sessions/[id]/requests,sessions/[id]/export.har,
 * hosts,hosts/[host]}/route.ts` (MIT). Divergencias declaradas:
 *
 * - Un host propio tiene que ser un nombre de host válido. La referencia sólo
 *   exigía uno no vacío, y ese texto va tal cual a `sudo tee -a /etc/hosts`:
 *   un salto de línea en él escribía una entrada arbitraria.
 * - Un cuerpo inválido es «Invalid request body» con sus errores por campo en
 *   `details`, como en el resto de la API, y no el primer mensaje del esquema.
 * - El HAR de una sesión usa las filas que pasan el esquema de la petición
 *   (`snapshotSession`); la referencia exportaba cualquier JSON.
 * - `POST /sessions` con un cuerpo malformado es un 400; vacío sigue creando
 *   una sesión sin nombre.
 */
import type { Database } from 'bun:sqlite'

import { proxyBaseUrl } from '@thyrox/provider/proxy/proxyEndpoint'
import { sanitizeErrorMessage } from '@thyrox/provider/sanitize/errorSanitization'
import { z } from 'zod'

import { addDNSEntries, removeDNSEntries } from '../../dns/dnsConfig.ts'
import { globalTrafficBuffer, type TrafficBuffer } from '../../inspector/buffer.ts'
import { getCachedPassword } from '../../manager.ts'
import { toHar, type HarFile } from '../../inspector/harExport.ts'
import type { ListFilters } from '../../inspector/types.ts'
import {
  InspectorAnnotationPutSchema,
  InspectorCustomHostSchema,
  InspectorListQuerySchema,
  InspectorSessionPatchSchema,
  InspectorSessionRequestAppendSchema,
  InspectorSessionStartSchema,
} from '../../schemas/inspector.ts'
import { addCustomHost, listCustomHosts, removeCustomHost, toggleCustomHost } from '../../state/inspectorCustomHosts.ts'
import {
  appendSessionRequest,
  createSession,
  deleteSession,
  getSession,
  getSessionRequests,
  listSessions,
  renameSession,
  snapshotSession,
  stopSession,
} from '../../state/inspectorSessions.ts'
import { errorResponse, parseJsonBody, parseOptionalJsonBody } from '../http.ts'
import type { ApiRoute } from '../router.ts'

export const INSPECTOR_BASE = '/api/tools/traffic-inspector'

export interface InspectorRouteDeps {
  db: Database
  traffic: Pick<TrafficBuffer, 'list' | 'get' | 'update' | 'clear'>
  /** La contraseña de sudo que dejó en caché el arranque del MITM, si la hay. */
  cachedPassword: () => string | null
  dns: {
    add(hosts: string[], password: string): Promise<void>
    remove(hosts: string[], password: string): Promise<void>
  }
  /** La base del proxy local, contra la que se repite una petición. */
  proxyBaseUrl: () => string
  fetch: typeof fetch
}

/** El búfer del proceso, la caché de sudo del gestor, el DNS real y el proxy local. */
export function defaultInspectorRouteDeps(db: Database): InspectorRouteDeps {
  return {
    db,
    traffic: globalTrafficBuffer,
    cachedPassword: getCachedPassword,
    dns: {
      add: (hosts, password) => addDNSEntries(hosts, password),
      remove: (hosts, password) => removeDNSEntries(hosts, password),
    },
    proxyBaseUrl: () => proxyBaseUrl(process.env).replace(/\/+$/, ''),
    fetch,
  }
}

const NO_DNS_PASSWORD_WARNING = 'DNS routing requires the MITM proxy to be running with a cached sudo password'

/** Un nombre de host: etiquetas de 1 a 63 caracteres, sin guion en los bordes. */
const HOSTNAME = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i

const CustomHostBodySchema = InspectorCustomHostSchema.extend({
  host: z.string().regex(HOSTNAME, 'host must be a valid hostname'),
})

const HostToggleSchema = z.object({ enabled: z.boolean() })

function notFound(what: string): Response {
  return errorResponse({ status: 404, message: `${what} not found` })
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

function harAttachment(har: HarFile, filename: string): Response {
  return new Response(JSON.stringify(har, null, 2), {
    headers: {
      'content-type': 'application/json',
      'content-disposition': `attachment; filename="${filename}"`,
      'cache-control': 'no-store',
    },
  })
}

/** El cuerpo guardado como JSON si lo es; si no, tal cual. */
function parsedPayload(payload: string): unknown {
  try {
    return JSON.parse(payload)
  } catch {
    return payload
  }
}

/** Un 204 con el aviso de DNS en una cabecera, si lo hay. */
function noContent(dnsWarning?: string): Response {
  return new Response(null, { status: 204, headers: dnsWarning ? { 'x-dns-warning': dnsWarning } : undefined })
}

export function createInspectorRoutes(deps: InspectorRouteDeps): ApiRoute[] {
  const { db, traffic } = deps
  const at = (route: string) => `${INSPECTOR_BASE}${route}`

  return [
    {
      method: 'GET',
      path: at('/requests'),
      handler: ({ url }) => {
        const query = listFilters(url)
        if (!query.ok) return query.response
        const requests = traffic.list(query.filters)
        return Response.json({ requests, total: requests.length })
      },
    },
    {
      method: 'DELETE',
      path: at('/requests'),
      handler: () => {
        traffic.clear()
        return noContent()
      },
    },
    {
      method: 'GET',
      path: at('/requests/:id'),
      handler: ({ params }) => {
        const entry = traffic.get(params.id)
        return entry ? Response.json(entry) : notFound('Request')
      },
    },
    {
      method: 'PUT',
      path: at('/requests/:id/annotation'),
      handler: async ({ request, params }) => {
        const body = await parseJsonBody(request, InspectorAnnotationPutSchema)
        if (!body.ok) return body.response
        const entry = traffic.get(params.id)
        if (!entry) return notFound('Request')
        const updated = { ...entry, annotation: body.data.annotation }
        traffic.update(params.id, updated)
        return Response.json(updated)
      },
    },
    {
      method: 'POST',
      path: at('/requests/:id/replay'),
      handler: async ({ params }) => {
        const entry = traffic.get(params.id)
        if (!entry) return notFound('Request')
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
      path: at('/export.har'),
      handler: ({ url }) => {
        const query = listFilters(url)
        return query.ok ? harAttachment(toHar(traffic.list(query.filters)), 'traffic.har') : query.response
      },
    },
    {
      method: 'GET',
      path: at('/sessions'),
      handler: () => Response.json({ sessions: listSessions(db) }),
    },
    {
      method: 'POST',
      path: at('/sessions'),
      handler: async ({ request }) => {
        const body = await parseOptionalJsonBody(request, InspectorSessionStartSchema)
        if (!body.ok) return body.response
        return Response.json(createSession(db, { name: body.data.name }), { status: 201 })
      },
    },
    {
      method: 'GET',
      path: at('/sessions/:id'),
      handler: ({ params }) => {
        const session = getSession(db, params.id)
        if (!session) return notFound('Session')
        const requests = getSessionRequests(db, params.id).map(r => parsedPayload(r.payload))
        return Response.json({ session, requests })
      },
    },
    {
      method: 'PATCH',
      path: at('/sessions/:id'),
      handler: async ({ request, params }) => {
        const body = await parseJsonBody(request, InspectorSessionPatchSchema)
        if (!body.ok) return body.response
        if (!getSession(db, params.id)) return notFound('Session')
        if (body.data.action === 'stop') {
          stopSession(db, params.id)
        } else {
          if (!body.data.name) return errorResponse({ status: 400, message: 'name is required for rename action' })
          renameSession(db, params.id, body.data.name)
        }
        return Response.json(getSession(db, params.id))
      },
    },
    {
      method: 'DELETE',
      path: at('/sessions/:id'),
      handler: ({ params }) => {
        if (!getSession(db, params.id)) return notFound('Session')
        deleteSession(db, params.id)
        return noContent()
      },
    },
    {
      method: 'POST',
      path: at('/sessions/:id/requests'),
      handler: async ({ request, params }) => {
        if (!getSession(db, params.id)) return notFound('Session')
        const body = await parseJsonBody(request, InspectorSessionRequestAppendSchema)
        if (!body.ok) return body.response
        return Response.json({ seq: appendSessionRequest(db, params.id, body.data.payload) }, { status: 201 })
      },
    },
    {
      method: 'GET',
      path: at('/sessions/:id/export.har'),
      handler: ({ params }) => {
        const session = getSession(db, params.id)
        const requests = snapshotSession(db, params.id)
        if (!session || !requests) return notFound('Session')
        const name = (session.name ?? `session-${params.id}`).replace(/[^a-z0-9_-]/gi, '_')
        return harAttachment(toHar(requests), `${name}.har`)
      },
    },
    {
      method: 'GET',
      path: at('/hosts'),
      handler: () => Response.json({ hosts: listCustomHosts(db) }),
    },
    {
      method: 'POST',
      path: at('/hosts'),
      handler: async ({ request }) => {
        const body = await parseJsonBody(request, CustomHostBodySchema)
        if (!body.ok) return body.response
        const { host, kind, label } = body.data
        addCustomHost(db, host, kind, label ?? undefined)
        const password = deps.cachedPassword()
        if (!password) return Response.json({ ok: true, host, warning: NO_DNS_PASSWORD_WARNING }, { status: 201 })
        try {
          await deps.dns.add([host], password)
        } catch (err) {
          const warning = `DNS routing entry could not be added: ${sanitizeErrorMessage(String(err))}`
          return Response.json({ ok: true, host, warning }, { status: 201 })
        }
        return Response.json({ ok: true, host }, { status: 201 })
      },
    },
    {
      method: 'PATCH',
      path: at('/hosts/:host'),
      handler: async ({ request, params }) => {
        const body = await parseJsonBody(request, HostToggleSchema)
        if (!body.ok) return body.response
        toggleCustomHost(db, params.host, body.data.enabled)
        const updated = listCustomHosts(db).find(h => h.host === params.host)
        return updated ? Response.json(updated) : notFound('Host')
      },
    },
    {
      method: 'DELETE',
      path: at('/hosts/:host'),
      handler: async ({ params }) => {
        removeCustomHost(db, params.host)
        const password = deps.cachedPassword()
        if (!password) return noContent(NO_DNS_PASSWORD_WARNING)
        try {
          await deps.dns.remove([params.host], password)
        } catch {
          return noContent(
            // Una cabecera sólo admite ASCII: sin raya larga.
            `DNS entry for ${params.host} could not be removed - restart the proxy or remove manually`,
          )
        }
        return noContent()
      },
    },
  ]
}
