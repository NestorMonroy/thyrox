/**
 * Los agentes: la lista con su detección, uno con su estado guardado, marcar
 * su configuración como completa, los modelos que se le han visto en el
 * tráfico y sus asignaciones de modelo.
 *
 * Porte de `omniroute: src/app/api/tools/agent-bridge/{agents,agents/[id],
 * agents/[id]/detect,agents/[id]/detected-models,agents/[id]/mappings}/route.ts` (MIT).
 */
import type { Database } from 'bun:sqlite'

import { z } from 'zod'

import { detectAgent } from '../../../detection/index.ts'
import { globalTrafficBuffer } from '../../../inspector/buffer.ts'
import type { InterceptedRequest } from '../../../inspector/types.ts'
import { AgentBridgeMappingPutSchema } from '../../../schemas/agentBridge.ts'
import {
  getMappingsForAgent,
  setMappings,
  syncAgentBridgeMappingsToMitmAlias,
} from '../../../state/agentBridgeMappings.ts'
import { getAgentBridgeState, upsertAgentBridgeState } from '../../../state/agentBridgeState.ts'
import { ALL_TARGETS } from '../../../targets/index.ts'
import type { AgentId, DetectionResult } from '../../../types.ts'
import { errorResponse, parseJsonBody } from '../../http.ts'
import type { ApiRoute } from '../../router.ts'
import { isAgentId } from './agentId.ts'
import { agentBridgePath } from './basePath.ts'

export interface AgentRouteDeps {
  db: Database
  /** El tráfico capturado, del que salen los modelos vistos. */
  traffic: { list(): InterceptedRequest[] }
  detectAgent: (id: AgentId) => DetectionResult
}

export function realAgentRouteDeps(db: Database): AgentRouteDeps {
  return { db, traffic: globalTrafficBuffer, detectAgent }
}

const SetupPatchSchema = z.object({ setup_completed: z.boolean() })

function unknownAgentId(id: string): Response {
  return errorResponse({ status: 404, message: `Unknown agent id: ${id}` })
}

function agentNotFound(id: string): Response {
  return errorResponse({ status: 404, message: `Agent not found: ${id}` })
}

/** Los modelos de origen distintos y ordenados del tráfico de ese agente. */
function detectedModels(traffic: InterceptedRequest[], agentId: AgentId) {
  const own = traffic.filter(req => req.source === 'agent-bridge' && req.agent === agentId)
  const models = new Set<string>()
  for (const req of own) if (req.sourceModel) models.add(req.sourceModel)
  return { agentId, detectedModels: [...models].sort(), requestCount: own.length }
}

export function createAgentRoutes(deps: AgentRouteDeps): ApiRoute[] {
  const { db } = deps
  return [
    {
      method: 'GET',
      path: agentBridgePath('/agents'),
      handler: () =>
        Response.json({
          agents: ALL_TARGETS.map(t => ({
            id: t.id,
            name: t.name,
            hosts: t.hosts,
            viability: t.viability ?? 'supported',
            state: deps.detectAgent(t.id),
          })),
        }),
    },
    {
      method: 'GET',
      path: agentBridgePath('/agents/:id'),
      handler: ({ params }) => {
        const target = ALL_TARGETS.find(t => t.id === params.id)
        if (!target) return agentNotFound(params.id)
        return Response.json({
          // `handler` es una función: la serialización JSON ya lo omite.
          agent: target,
          detection: deps.detectAgent(target.id),
          state: getAgentBridgeState(db, target.id),
        })
      },
    },
    {
      method: 'PATCH',
      path: agentBridgePath('/agents/:id'),
      handler: async ({ request, params }) => {
        // Un id que no es de un agente no deja una fila huérfana.
        if (!isAgentId(params.id)) return agentNotFound(params.id)
        const body = await parseJsonBody(request, SetupPatchSchema)
        if (!body.ok) return body.response
        upsertAgentBridgeState(db, { agent_id: params.id, setup_completed: body.data.setup_completed })
        return Response.json({ ok: true, state: getAgentBridgeState(db, params.id) })
      },
    },
    {
      method: 'GET',
      path: agentBridgePath('/agents/:id/detect'),
      handler: ({ params }) =>
        isAgentId(params.id)
          ? Response.json({ agentId: params.id, ...deps.detectAgent(params.id) })
          : unknownAgentId(params.id),
    },
    {
      method: 'GET',
      path: agentBridgePath('/agents/:id/detected-models'),
      handler: ({ params }) =>
        isAgentId(params.id) ? Response.json(detectedModels(deps.traffic.list(), params.id)) : unknownAgentId(params.id),
    },
    {
      method: 'GET',
      path: agentBridgePath('/agents/:id/mappings'),
      handler: ({ params }) =>
        isAgentId(params.id)
          ? Response.json({ mappings: getMappingsForAgent(db, params.id) })
          : unknownAgentId(params.id),
    },
    {
      method: 'PUT',
      path: agentBridgePath('/agents/:id/mappings'),
      handler: async ({ request, params }) => {
        if (!isAgentId(params.id)) return unknownAgentId(params.id)
        const body = await parseJsonBody(request, AgentBridgeMappingPutSchema)
        if (!body.ok) return body.response
        setMappings(db, params.id, body.data.mappings)
        // El servidor MITM lee los alias, no esta tabla.
        syncAgentBridgeMappingsToMitmAlias(db, params.id)
        return Response.json({ ok: true, mappings: getMappingsForAgent(db, params.id) })
      },
    },
  ]
}
