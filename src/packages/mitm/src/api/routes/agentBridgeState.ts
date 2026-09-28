/**
 * Las rutas de estado del AgentBridge: los agentes con su detección, los
 * modelos vistos en el tráfico, las asignaciones de modelo, las exclusiones,
 * la configuración portable y el estado completo que lee el tablero. Las
 * sondas del sistema (estado del servidor, certificado, DNS, sudo) se
 * inyectan: estas rutas sólo leen y componen.
 *
 * Porte de `omniroute: src/app/api/tools/agent-bridge/{agents,agents/[id],
 * agents/[id]/detect,agents/[id]/detected-models,agents/[id]/mappings,bypass,
 * config,state}/route.ts` (MIT). Divergencias declaradas:
 *
 * - `GET /agents/:id` busca el destino por su id; la referencia llama a
 *   `resolveTarget(id)`, que busca por host, así que para un id siempre
 *   respondía 404.
 * - Toda ruta por agente rehúsa con 404 un id que no es de `MITM_AGENT_IDS`.
 *   La referencia escribía filas de estado y asignaciones para cualquier id, y
 *   aceptaba en `detected-models` dos agentes (`windsurf`, `jules`) que su
 *   propio registro no declara.
 */
import type { Database } from 'bun:sqlite'
import fs from 'node:fs'

import { z } from 'zod'

import { checkCertInstalled } from '../../cert/install.ts'
import { detectAgent } from '../../detection/index.ts'
import { checkDNSEntryForAgent, isSudoPasswordRequired } from '../../dns/dnsConfig.ts'
import { AgentBridgeConfigSchema, exportConfig, importConfig } from '../../inspector/configPortability.ts'
import { globalTrafficBuffer } from '../../inspector/buffer.ts'
import type { InterceptedRequest } from '../../inspector/types.ts'
import { activeCertPath, getCachedPassword, getMitmStatus, type AgentStatus, type MitmStatus } from '../../manager.ts'
import { AgentBridgeBypassUpsertSchema, AgentBridgeMappingPutSchema } from '../../schemas/agentBridge.ts'
import {
  getAllBypassPatterns,
  getUserBypassPatterns,
  replaceUserBypassPatterns,
} from '../../state/agentBridgeBypass.ts'
import {
  getMappingsForAgent,
  setMappings,
  syncAgentBridgeMappingsToMitmAlias,
} from '../../state/agentBridgeMappings.ts'
import {
  getAgentBridgeState,
  getAllAgentBridgeStates,
  upsertAgentBridgeState,
} from '../../state/agentBridgeState.ts'
import { ALL_TARGETS } from '../../targets/index.ts'
import { MITM_AGENT_IDS, type AgentId, type DetectionResult } from '../../types.ts'

import { errorResponse, parseJsonBody, readJsonBody } from '../http.ts'
import type { ApiRoute } from '../router.ts'

export const AGENT_BRIDGE_BASE = '/api/tools/agent-bridge'

export interface CertStatus {
  certExists: boolean
  certTrusted: boolean
}

export interface AgentBridgeStateDeps {
  db: Database
  traffic: { list(): InterceptedRequest[] }
  detectAgent: (id: AgentId) => DetectionResult
  mitmStatus: () => Promise<MitmStatus>
  certStatus: () => Promise<CertStatus>
  /** Si el archivo de hosts ya redirige los hosts de ese agente. */
  dnsConfiguredFor: (agentId: string) => boolean
  hasCachedPassword: () => boolean
  sudoPasswordRequired: () => boolean
  platform: NodeJS.Platform
}

/** Las sondas reales del sistema sobre la base dada. */
export function defaultAgentBridgeStateDeps(db: Database): AgentBridgeStateDeps {
  return {
    db,
    traffic: globalTrafficBuffer,
    detectAgent,
    mitmStatus: () => getMitmStatus(),
    certStatus: async () => {
      const certPath = activeCertPath()
      const certExists = fs.existsSync(certPath)
      return { certExists, certTrusted: certExists ? await checkCertInstalled(certPath) : false }
    },
    dnsConfiguredFor: agentId => checkDNSEntryForAgent(agentId),
    hasCachedPassword: () => getCachedPassword() !== null,
    sudoPasswordRequired: isSudoPasswordRequired,
    platform: process.platform,
  }
}

const SetupPatchSchema = z.object({ setup_completed: z.boolean() })

const AGENT_IDS: ReadonlySet<string> = new Set(MITM_AGENT_IDS)

function isAgentId(id: string): id is AgentId {
  return AGENT_IDS.has(id)
}

function unknownAgent(id: string): Response {
  return errorResponse({ status: 404, message: `Unknown agent id: ${id}` })
}

/** Los modelos de origen distintos y ordenados del tráfico de ese agente. */
function detectedModels(traffic: InterceptedRequest[], agentId: AgentId) {
  const own = traffic.filter(req => req.source === 'agent-bridge' && req.agent === agentId)
  const models = new Set<string>()
  for (const req of own) if (req.sourceModel) models.add(req.sourceModel)
  return { agentId, detectedModels: [...models].sort(), requestCount: own.length }
}

/** La forma de `getAllAgentsStatus()` del gestor, con la sonda inyectada. */
function agentStatuses(deps: AgentBridgeStateDeps): AgentStatus[] {
  return ALL_TARGETS.map(t => ({
    id: t.id,
    name: t.name,
    hosts: t.hosts,
    viability: t.viability ?? 'supported',
    detection: deps.detectAgent(t.id),
  }))
}

function mappingPairs(db: Database, agentId: string) {
  return getMappingsForAgent(db, agentId).map(m => ({ source: m.source_model, target: m.target_model }))
}

/** ¿Algún agente con el DNS activado tiene de verdad sus hosts redirigidos? */
export function anyAgentDnsConfigured(db: Database, configuredFor: (agentId: string) => boolean): boolean {
  return getAllAgentBridgeStates(db).some(s => s.dns_enabled && configuredFor(s.agent_id))
}

/**
 * El estado del servidor enriquecido con lo que el tablero necesita: la
 * confianza real del certificado aparte de su existencia, el DNS de cualquier
 * agente activado, y si hará falta pedir la contraseña de sudo.
 */
async function enrichedServerState(deps: AgentBridgeStateDeps) {
  const [status, cert] = await Promise.all([deps.mitmStatus(), deps.certStatus()])
  const dnsConfigured = anyAgentDnsConfigured(deps.db, deps.dnsConfiguredFor)
  const isWin = deps.platform === 'win32'
  const hasCachedPassword = deps.hasCachedPassword()
  return {
    ...status,
    ...cert,
    dnsConfigured,
    hasCachedPassword,
    needsSudoPassword: !isWin && !hasCachedPassword && deps.sudoPasswordRequired(),
    isWin,
  }
}

export function createAgentBridgeStateRoutes(deps: AgentBridgeStateDeps): ApiRoute[] {
  const { db } = deps
  const at = (path: string) => `${AGENT_BRIDGE_BASE}${path}`

  return [
    {
      method: 'GET',
      path: at('/agents'),
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
      path: at('/agents/:id'),
      handler: ({ params }) => {
        const target = ALL_TARGETS.find(t => t.id === params.id)
        if (!target) return errorResponse({ status: 404, message: `Agent not found: ${params.id}` })
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
      path: at('/agents/:id'),
      handler: async ({ request, params }) => {
        if (!isAgentId(params.id)) return errorResponse({ status: 404, message: `Agent not found: ${params.id}` })
        const body = await parseJsonBody(request, SetupPatchSchema)
        if (!body.ok) return body.response
        upsertAgentBridgeState(db, { agent_id: params.id, setup_completed: body.data.setup_completed })
        return Response.json({ ok: true, state: getAgentBridgeState(db, params.id) })
      },
    },
    {
      method: 'GET',
      path: at('/agents/:id/detect'),
      handler: ({ params }) =>
        isAgentId(params.id)
          ? Response.json({ agentId: params.id, ...deps.detectAgent(params.id) })
          : unknownAgent(params.id),
    },
    {
      method: 'GET',
      path: at('/agents/:id/detected-models'),
      handler: ({ params }) =>
        isAgentId(params.id) ? Response.json(detectedModels(deps.traffic.list(), params.id)) : unknownAgent(params.id),
    },
    {
      method: 'GET',
      path: at('/agents/:id/mappings'),
      handler: ({ params }) =>
        isAgentId(params.id)
          ? Response.json({ mappings: getMappingsForAgent(db, params.id) })
          : unknownAgent(params.id),
    },
    {
      method: 'PUT',
      path: at('/agents/:id/mappings'),
      handler: async ({ request, params }) => {
        if (!isAgentId(params.id)) return unknownAgent(params.id)
        const body = await parseJsonBody(request, AgentBridgeMappingPutSchema)
        if (!body.ok) return body.response
        setMappings(db, params.id, body.data.mappings)
        syncAgentBridgeMappingsToMitmAlias(db, params.id)
        return Response.json({ ok: true, mappings: getMappingsForAgent(db, params.id) })
      },
    },
    {
      method: 'GET',
      path: at('/bypass'),
      handler: () => Response.json({ patterns: getAllBypassPatterns(db) }),
    },
    {
      method: 'POST',
      path: at('/bypass'),
      handler: async ({ request }) => {
        const body = await parseJsonBody(request, AgentBridgeBypassUpsertSchema)
        if (!body.ok) return body.response
        replaceUserBypassPatterns(db, body.data.patterns)
        return Response.json({ ok: true, patterns: getAllBypassPatterns(db) })
      },
    },
    {
      method: 'DELETE',
      path: at('/bypass'),
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
    {
      method: 'GET',
      path: at('/config'),
      handler: () => Response.json(exportConfig(db)),
    },
    {
      method: 'POST',
      path: at('/config'),
      handler: async ({ request }) => {
        const read = await readJsonBody(request)
        const parsed = AgentBridgeConfigSchema.safeParse(read.ok ? read.body : null)
        if (!parsed.success) {
          return errorResponse({
            status: 400,
            message: parsed.error.issues[0]?.message ?? 'Invalid AgentBridge config',
          })
        }
        return Response.json({ ok: true, ...importConfig(db, parsed.data) })
      },
    },
    {
      method: 'GET',
      path: at('/state'),
      handler: async () => {
        const server = await enrichedServerState(deps)
        const mappings = Object.fromEntries(ALL_TARGETS.map(t => [t.id, mappingPairs(db, t.id)]))
        return Response.json({
          // `server` y `agents` son las claves de siempre; `serverState` y el
          // resto son las que lee el tablero.
          server,
          agents: agentStatuses(deps),
          serverState: server,
          agentStates: getAllAgentBridgeStates(db),
          bypassPatterns: getAllBypassPatterns(db).map(b => b.pattern),
          mappings,
        })
      },
    },
  ]
}
