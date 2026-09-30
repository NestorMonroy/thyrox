/**
 * Los patrones de host que el MITM deja pasar sin descifrar: listarlos,
 * reemplazar los del usuario y quitar uno. Los de fábrica no se tocan.
 *
 * Porte de `omniroute: src/app/api/tools/agent-bridge/bypass/route.ts` (MIT).
 */
import type { Database } from 'bun:sqlite'

import { AgentBridgeBypassUpsertSchema } from '../../../schemas/agentBridge.ts'
import {
  getAllBypassPatterns,
  getUserBypassPatterns,
  replaceUserBypassPatterns,
} from '../../../state/agentBridgeBypass.ts'
import { errorResponse, parseJsonBody } from '../../http.ts'
import type { ApiRoute } from '../../router.ts'
import { agentBridgePath } from './basePath.ts'

export function createBypassRoutes(db: Database): ApiRoute[] {
  const path = agentBridgePath('/bypass')
  return [
    { method: 'GET', path, handler: () => Response.json({ patterns: getAllBypassPatterns(db) }) },
    {
      method: 'POST',
      path,
      handler: async ({ request }) => {
        const body = await parseJsonBody(request, AgentBridgeBypassUpsertSchema)
        if (!body.ok) return body.response
        replaceUserBypassPatterns(db, body.data.patterns)
        return Response.json({ ok: true, patterns: getAllBypassPatterns(db) })
      },
    },
    {
      method: 'DELETE',
      path,
      handler: ({ url }) => {
        const pattern = url.searchParams.get('pattern')
        if (!pattern) return errorResponse({ status: 400, message: 'Missing query param: pattern' })
        replaceUserBypassPatterns(
          db,
          getUserBypassPatterns(db).filter(p => p !== pattern),
        )
        return Response.json({ ok: true, patterns: getAllBypassPatterns(db) })
      },
    },
  ]
}
