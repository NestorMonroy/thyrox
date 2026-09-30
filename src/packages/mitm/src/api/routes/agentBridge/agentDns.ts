/**
 * El DNS de un agente: redirigir o soltar sus hosts, y devolverlo a su
 * estado inicial (sin DNS, sin asignaciones, sin configurar). El servidor y
 * la CA son de todos los agentes y no se tocan.
 *
 * Porte de `omniroute: src/app/api/tools/agent-bridge/agents/[id]/{dns,reset}/route.ts` (MIT).
 */
import type { Database } from 'bun:sqlite'

import { z } from 'zod'

import { addDNSEntry, checkDNSEntryForAgent, flushWindowsDnsCache, removeDNSEntry } from '../../../dns/dnsConfig.ts'
import { AgentBridgeDnsActionSchema } from '../../../schemas/agentBridge.ts'
import { setMappings, syncAgentBridgeMappingsToMitmAlias } from '../../../state/agentBridgeMappings.ts'
import { getAllAgentBridgeStates, upsertAgentBridgeState } from '../../../state/agentBridgeState.ts'
import type { AgentId } from '../../../types.ts'
import { errorResponse, parseJsonBody } from '../../http.ts'
import type { ApiRoute } from '../../router.ts'
import { isAgentId } from './agentId.ts'
import { agentBridgePath } from './basePath.ts'
import { missingPasswordResponse, realSudoAccess, sudoRequest, SudoBodySchema, type SudoAccess } from '../sudoRequest.ts'

export interface AgentHostsFile {
  add(password: string, agentId: AgentId): Promise<void>
  remove(password: string, agentId: AgentId): Promise<void>
  flushWindowsCache(): void
  configuredFor(agentId: string): boolean
}

export const realAgentHostsFile: AgentHostsFile = {
  add: (password, agentId) => addDNSEntry(password, agentId),
  remove: (password, agentId) => removeDNSEntry(password, agentId),
  flushWindowsCache: flushWindowsDnsCache,
  configuredFor: agentId => checkDNSEntryForAgent(agentId),
}

export interface AgentDnsRouteDeps {
  db: Database
  platform: NodeJS.Platform
  sudo: SudoAccess
  dns: AgentHostsFile
}

export function realAgentDnsRouteDeps(db: Database): AgentDnsRouteDeps {
  return { db, platform: process.platform, sudo: realSudoAccess, dns: realAgentHostsFile }
}

const DnsBodySchema = AgentBridgeDnsActionSchema.extend({ sudoPassword: z.string().optional() })

function unknownAgent(id: string): Response {
  return errorResponse({ status: 404, message: `Unknown agent: ${id}` })
}

export function createAgentDnsRoutes(deps: AgentDnsRouteDeps): ApiRoute[] {
  const { db } = deps
  return [
    {
      method: 'POST',
      path: agentBridgePath('/agents/:id/dns'),
      handler: async ({ request, params }) => {
        const body = await parseJsonBody(request, DnsBodySchema)
        if (!body.ok) return body.response
        if (!isAgentId(params.id)) return unknownAgent(params.id)
        const sudo = sudoRequest(deps.sudo, deps.platform, body.data.sudoPassword)
        if (sudo.missing) return missingPasswordResponse()
        const { enabled } = body.data
        await (enabled ? deps.dns.add : deps.dns.remove)(sudo.password, params.id)
        sudo.rememberGiven()
        upsertAgentBridgeState(db, { agent_id: params.id, dns_enabled: enabled })
        return Response.json({ ok: true, dns_enabled: enabled })
      },
    },
    {
      method: 'POST',
      path: agentBridgePath('/agents/:id/reset'),
      handler: async ({ request, params }) => {
        const body = await parseJsonBody(request, SudoBodySchema)
        if (!body.ok) return body.response
        const agentId = params.id
        if (!isAgentId(agentId)) return unknownAgent(agentId)
        const sudo = sudoRequest(deps.sudo, deps.platform, body.data.sudoPassword)
        if (sudo.missing) return missingPasswordResponse()
        await deps.dns.remove(sudo.password, agentId)
        // Windows guarda en caché lo que el archivo de hosts ya no dice.
        deps.dns.flushWindowsCache()
        setMappings(db, agentId, [])
        syncAgentBridgeMappingsToMitmAlias(db, agentId)
        upsertAgentBridgeState(db, { agent_id: agentId, dns_enabled: false, setup_completed: false })
        sudo.rememberGiven()
        return Response.json({
          ok: true,
          agent_id: agentId,
          dns_enabled: false,
          mappingsCleared: true,
          verified: !deps.dns.configuredFor(agentId),
          // El propio ya quedó sin DNS arriba: cualquier activo es otro.
          otherAgentsStillActive: getAllAgentBridgeStates(db).some(s => s.dns_enabled),
          restartRequired: true,
        })
      },
    },
  ]
}
