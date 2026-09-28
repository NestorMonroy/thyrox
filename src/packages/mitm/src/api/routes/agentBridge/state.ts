/**
 * `GET /state`: el estado completo que lee el tablero. El servidor con la
 * confianza real del certificado aparte de su existencia, el DNS de
 * cualquier agente activado y si hará falta pedir la contraseña de sudo; los
 * agentes, su estado guardado, las exclusiones y las asignaciones de todos.
 *
 * Porte de `omniroute: src/app/api/tools/agent-bridge/state/route.ts` (MIT).
 */
import type { Database } from 'bun:sqlite'

import { detectAgent } from '../../../detection/index.ts'
import { isSudoPasswordRequired } from '../../../dns/dnsConfig.ts'
import { getCachedPassword, type AgentStatus } from '../../../manager.ts'
import { getAllBypassPatterns } from '../../../state/agentBridgeBypass.ts'
import { getMappingsForAgent } from '../../../state/agentBridgeMappings.ts'
import { getAllAgentBridgeStates } from '../../../state/agentBridgeState.ts'
import { ALL_TARGETS } from '../../../targets/index.ts'
import type { AgentId, DetectionResult } from '../../../types.ts'
import type { ApiRoute } from '../../router.ts'
import { realAgentHostsFile, type AgentHostsFile } from './agentDns.ts'
import { agentBridgePath } from './basePath.ts'
import { realCertStore, type CertStore } from './certStore.ts'
import { anyAgentDnsConfigured } from './dnsStatus.ts'
import { realMitmServerControl, type MitmServerControl } from './serverControl.ts'

export interface StateRouteDeps {
  db: Database
  platform: NodeJS.Platform
  server: Pick<MitmServerControl, 'status'>
  cert: Pick<CertStore, 'active' | 'exists' | 'trusted'>
  dns: Pick<AgentHostsFile, 'configuredFor'>
  detectAgent: (id: AgentId) => DetectionResult
  hasCachedPassword: () => boolean
  /** Si el sistema pedirá contraseña para elevar, sin mirar la guardada. */
  sudoPasswordRequired: () => boolean
}

export function realStateRouteDeps(db: Database): StateRouteDeps {
  return {
    db,
    platform: process.platform,
    server: realMitmServerControl,
    cert: realCertStore,
    dns: realAgentHostsFile,
    detectAgent,
    hasCachedPassword: () => getCachedPassword() !== null,
    sudoPasswordRequired: isSudoPasswordRequired,
  }
}

function agentStatuses(detect: (id: AgentId) => DetectionResult): AgentStatus[] {
  return ALL_TARGETS.map(t => ({
    id: t.id,
    name: t.name,
    hosts: t.hosts,
    viability: t.viability ?? 'supported',
    detection: detect(t.id),
  }))
}

async function serverState(deps: StateRouteDeps) {
  const status = await deps.server.status()
  const { certPath } = deps.cert.active()
  const certExists = deps.cert.exists(certPath)
  const isWin = deps.platform === 'win32'
  const hasCachedPassword = deps.hasCachedPassword()
  return {
    ...status,
    // Existir no es ser de confianza: se miden por separado.
    certExists,
    certTrusted: certExists ? await deps.cert.trusted(certPath) : false,
    dnsConfigured: anyAgentDnsConfigured(deps.db, deps.dns.configuredFor),
    hasCachedPassword,
    needsSudoPassword: !isWin && !hasCachedPassword && deps.sudoPasswordRequired(),
    isWin,
  }
}

export function createStateRoutes(deps: StateRouteDeps): ApiRoute[] {
  const { db } = deps
  return [
    {
      method: 'GET',
      path: agentBridgePath('/state'),
      handler: async () => {
        const server = await serverState(deps)
        const mappings = Object.fromEntries(
          ALL_TARGETS.map(t => [
            t.id,
            getMappingsForAgent(db, t.id).map(m => ({ source: m.source_model, target: m.target_model })),
          ]),
        )
        return Response.json({
          // `server` y `agents` son las claves de siempre; el resto, las que lee el tablero.
          server,
          agents: agentStatuses(deps.detectAgent),
          serverState: server,
          agentStates: getAllAgentBridgeStates(db),
          bypassPatterns: getAllBypassPatterns(db).map(b => b.pattern),
          mappings,
        })
      },
    },
  ]
}
