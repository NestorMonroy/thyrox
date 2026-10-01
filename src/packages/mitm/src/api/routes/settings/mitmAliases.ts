/**
 * Los alias de modelo por herramienta, con su esfuerzo de razonamiento
 * validado. Sólo se guardan para un agente que el MITM conoce.
 *
 * Porte de `omniroute: src/app/api/cli-tools/antigravity-mitm/alias/route.ts` (MIT).
 */
import type { Database } from 'bun:sqlite'

import { z } from 'zod'

import { hasInvalidReasoningEffort, normalizeAliasMappings } from '../../../aliasConfig.ts'
import { getAllMitmAliases, getMitmAlias, setMitmAliasAll } from '../../../state/mitmAlias.ts'
import { MITM_AGENT_IDS } from '../../../types.ts'
import { errorResponse, parseJsonBody } from '../../http.ts'
import type { ApiRoute } from '../../router.ts'
import { ANTIGRAVITY_MITM_BASE } from './antigravityCli.ts'

const MITM_ALIAS_PATH = `${ANTIGRAVITY_MITM_BASE}/alias`

const AliasEntrySchema = z.object({ model: z.string().optional(), reasoningEffort: z.string().optional() })

const AliasUpdateSchema = z.object({
  tool: z.string().trim().min(1),
  mappings: z.record(z.string(), z.union([z.string(), AliasEntrySchema]).optional()),
})

const AGENT_IDS: ReadonlySet<string> = new Set(MITM_AGENT_IDS)

export function createMitmAliasRoutes(db: Database): ApiRoute[] {
  return [
    {
      method: 'GET',
      path: MITM_ALIAS_PATH,
      handler: ({ url }) => {
        const tool = url.searchParams.get('tool')
        // Sólo la vista de una herramienta tiene la forma plana que se normaliza.
        return Response.json({ aliases: tool ? normalizeAliasMappings(getMitmAlias(db, tool)) : getAllMitmAliases(db) })
      },
    },
    {
      method: 'PUT',
      path: MITM_ALIAS_PATH,
      handler: async ({ request }) => {
        const body = await parseJsonBody(request, AliasUpdateSchema)
        if (!body.ok) return body.response
        const { tool, mappings } = body.data
        if (!AGENT_IDS.has(tool)) return errorResponse({ status: 404, message: `Unknown agent: ${tool}` })
        if (hasInvalidReasoningEffort(mappings)) return errorResponse({ status: 400, message: 'Invalid reasoning effort' })
        const aliases = normalizeAliasMappings(mappings)
        setMitmAliasAll(db, tool, aliases)
        return Response.json({ success: true, aliases })
      },
    },
  ]
}
