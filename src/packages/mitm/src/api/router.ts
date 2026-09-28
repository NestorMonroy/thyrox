/**
 * El enrutador de la API local del MITM: una tabla de rutas con parámetros
 * (`/agents/:id/dns`), la guarda LOCAL_ONLY antes que nada, 404 frente a 405,
 * y un error inesperado siempre como 500 saneado.
 *
 * Porte del contrato de `omniroute: src/server/authz/policies/management.ts`
 * (la respuesta `403 LOCAL_ONLY`) sobre rutas que en la referencia son de
 * Next.js; aquí no hay framework, así que la tabla es explícita.
 */
import { randomUUID } from 'node:crypto'

import { errorFromUnknown, errorResponse } from './http.ts'
import { isLocalRequest } from './locality.ts'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface RouteContext {
  request: Request
  url: URL
  params: Record<string, string>
}

export interface ApiRoute {
  method: HttpMethod
  /** Segmentos literales y `:nombre` para un parámetro. */
  path: string
  handler: (ctx: RouteContext) => Response | Promise<Response>
}

export interface ApiHandlerOptions {
  /** La IP real del par; `null` si no se conoce, y entonces se rehúsa. */
  peerAddress: (request: Request) => string | null
}

function localOnlyRejection(): Response {
  return Response.json(
    { error: { code: 'LOCAL_ONLY', message: 'This endpoint requires localhost access', correlation_id: randomUUID() } },
    { status: 403 },
  )
}

/** Los parámetros si `path` casa con el patrón; `null` si no. */
function matchPath(pattern: string, path: string): Record<string, string> | null {
  const want = pattern.split('/')
  const got = path.split('/')
  if (want.length !== got.length) return null
  const params: Record<string, string> = {}
  for (let i = 0; i < want.length; i++) {
    const segment = want[i]!
    if (segment.startsWith(':')) {
      if (!got[i]) return null
      params[segment.slice(1)] = decodeURIComponent(got[i]!)
    } else if (segment !== got[i]) {
      return null
    }
  }
  return params
}

export function createApiHandler(
  routes: readonly ApiRoute[],
  options: ApiHandlerOptions,
): (request: Request) => Promise<Response> {
  return async request => {
    if (!isLocalRequest(request, options.peerAddress(request))) return localOnlyRejection()
    const url = new URL(request.url)
    const allowed: HttpMethod[] = []
    for (const route of routes) {
      let params: Record<string, string> | null
      try {
        params = matchPath(route.path, url.pathname)
      } catch {
        return errorResponse({ status: 400, message: 'Malformed path parameter' })
      }
      if (!params) continue
      if (route.method !== request.method) {
        allowed.push(route.method)
        continue
      }
      try {
        return await route.handler({ request, url, params })
      } catch (err) {
        return errorFromUnknown(err)
      }
    }
    if (allowed.length > 0) {
      return errorResponse({ status: 405, message: 'Method not allowed', headers: { allow: allowed.join(', ') } })
    }
    return errorResponse({ status: 404, message: 'Not found' })
  }
}
