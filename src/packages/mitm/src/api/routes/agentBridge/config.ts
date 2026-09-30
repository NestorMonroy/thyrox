/**
 * La configuración portable del AgentBridge: exportarla e importarla.
 *
 * Porte de `omniroute: src/app/api/tools/agent-bridge/config/route.ts` (MIT).
 */
import type { Database } from 'bun:sqlite'

import { AgentBridgeConfigSchema, exportConfig, importConfig } from '../../../inspector/configPortability.ts'
import { errorResponse, readJsonBody } from '../../http.ts'
import type { ApiRoute } from '../../router.ts'
import { agentBridgePath } from './basePath.ts'

export function createConfigRoutes(db: Database): ApiRoute[] {
  const path = agentBridgePath('/config')
  return [
    { method: 'GET', path, handler: () => Response.json(exportConfig(db)) },
    {
      method: 'POST',
      path,
      handler: async ({ request }) => {
        const read = await readJsonBody(request)
        const parsed = AgentBridgeConfigSchema.safeParse(read.ok ? read.body : null)
        if (!parsed.success) {
          return errorResponse({ status: 400, message: parsed.error.issues[0]?.message ?? 'Invalid AgentBridge config' })
        }
        return Response.json({ ok: true, ...importConfig(db, parsed.data) })
      },
    },
  ]
}
