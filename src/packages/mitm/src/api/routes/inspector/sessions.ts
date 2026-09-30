/**
 * Las sesiones grabadas del inspector: listarlas y crearlas, una con sus
 * peticiones, pararla o renombrarla, borrarla, anexarle una petición y
 * exportarla como HAR.
 *
 * Porte de `omniroute: src/app/api/tools/traffic-inspector/{sessions,
 * sessions/[id],sessions/[id]/requests,sessions/[id]/export.har}/route.ts` (MIT).
 */
import type { Database } from 'bun:sqlite'

import { toHar } from '../../../inspector/harExport.ts'
import {
  InspectorSessionPatchSchema,
  InspectorSessionRequestAppendSchema,
  InspectorSessionStartSchema,
} from '../../../schemas/inspector.ts'
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
} from '../../../state/inspectorSessions.ts'
import { errorResponse, parseJsonBody, parseOptionalJsonBody } from '../../http.ts'
import type { ApiRoute } from '../../router.ts'
import { inspectorPath } from './basePath.ts'
import { harAttachment } from './har.ts'

function sessionNotFound(): Response {
  return errorResponse({ status: 404, message: 'Session not found' })
}

/** El cuerpo guardado como JSON si lo es; si no, tal cual. */
function parsedPayload(payload: string): unknown {
  try {
    return JSON.parse(payload)
  } catch {
    return payload
  }
}

export function createSessionRoutes(db: Database): ApiRoute[] {
  return [
    {
      method: 'GET',
      path: inspectorPath('/sessions'),
      handler: () => Response.json({ sessions: listSessions(db) }),
    },
    {
      method: 'POST',
      path: inspectorPath('/sessions'),
      handler: async ({ request }) => {
        const body = await parseOptionalJsonBody(request, InspectorSessionStartSchema)
        if (!body.ok) return body.response
        return Response.json(createSession(db, { name: body.data.name }), { status: 201 })
      },
    },
    {
      method: 'GET',
      path: inspectorPath('/sessions/:id'),
      handler: ({ params }) => {
        const session = getSession(db, params.id)
        if (!session) return sessionNotFound()
        const requests = getSessionRequests(db, params.id).map(r => parsedPayload(r.payload))
        return Response.json({ session, requests })
      },
    },
    {
      method: 'PATCH',
      path: inspectorPath('/sessions/:id'),
      handler: async ({ request, params }) => {
        const body = await parseJsonBody(request, InspectorSessionPatchSchema)
        if (!body.ok) return body.response
        if (!getSession(db, params.id)) return sessionNotFound()
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
      path: inspectorPath('/sessions/:id'),
      handler: ({ params }) => {
        if (!getSession(db, params.id)) return sessionNotFound()
        deleteSession(db, params.id)
        return new Response(null, { status: 204 })
      },
    },
    {
      method: 'POST',
      path: inspectorPath('/sessions/:id/requests'),
      handler: async ({ request, params }) => {
        if (!getSession(db, params.id)) return sessionNotFound()
        const body = await parseJsonBody(request, InspectorSessionRequestAppendSchema)
        if (!body.ok) return body.response
        return Response.json({ seq: appendSessionRequest(db, params.id, body.data.payload) }, { status: 201 })
      },
    },
    {
      method: 'GET',
      path: inspectorPath('/sessions/:id/export.har'),
      handler: ({ params }) => {
        const session = getSession(db, params.id)
        // Sólo las filas que pasan el esquema de una petición llegan al HAR.
        const requests = snapshotSession(db, params.id)
        if (!session || !requests) return sessionNotFound()
        const name = (session.name ?? `session-${params.id}`).replace(/[^a-z0-9_-]/gi, '_')
        return harAttachment(toHar(requests), `${name}.har`)
      },
    },
  ]
}
