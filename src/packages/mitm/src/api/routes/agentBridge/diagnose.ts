/**
 * `GET /diagnose`: por qué no se captura nada. Comprueba de forma
 * independiente servidor en marcha, puerto que acepta, certificado generado y
 * de confianza, y hosts redirigidos, y da un veredicto con qué hacer por cada
 * fallo.
 *
 * Porte de `omniroute: src/app/api/tools/agent-bridge/diagnose/route.ts` (MIT).
 */
import type { Database } from 'bun:sqlite'
import net from 'node:net'

import { summarizeDiagnostics } from '../../../inspector/diagnostics.ts'
import { errorResponse } from '../../http.ts'
import type { ApiRoute } from '../../router.ts'
import { isAgentId } from './agentId.ts'
import { agentBridgePath } from './basePath.ts'
import { realCertStore, type CertStore } from './certStore.ts'
import { anyAgentDnsConfigured } from './dnsStatus.ts'
import { realMitmServerControl, type MitmServerControl } from './serverControl.ts'
import { realAgentHostsFile, type AgentHostsFile } from './agentDns.ts'

export interface DiagnoseRouteDeps {
  db: Database
  server: Pick<MitmServerControl, 'status'>
  cert: Pick<CertStore, 'active' | 'exists' | 'trusted'>
  dns: Pick<AgentHostsFile, 'configuredFor'>
  mitmPort(): number
  acceptsConnections(port: number): Promise<boolean>
}

const DEFAULT_MITM_PORT = 443
const CONNECT_TIMEOUT_MS = 1500

/** Si el puerto local acepta una conexión TCP antes del plazo. */
function acceptsConnections(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const socket = net.connect({ port, host: '127.0.0.1' })
    const done = (ok: boolean) => {
      socket.destroy()
      resolve(ok)
    }
    socket.setTimeout(CONNECT_TIMEOUT_MS, () => done(false))
    socket.once('connect', () => done(true))
    socket.once('error', () => done(false))
  })
}

export function realDiagnoseRouteDeps(db: Database): DiagnoseRouteDeps {
  return {
    db,
    server: realMitmServerControl,
    cert: realCertStore,
    dns: realAgentHostsFile,
    mitmPort: () => {
      const port = Number(process.env.THYROX_MITM_LOCAL_PORT)
      return port > 0 ? port : DEFAULT_MITM_PORT
    },
    acceptsConnections,
  }
}

export function createDiagnoseRoutes(deps: DiagnoseRouteDeps): ApiRoute[] {
  return [
    {
      method: 'GET',
      path: agentBridgePath('/diagnose'),
      handler: async ({ url }) => {
        const agentId = url.searchParams.get('agentId') ?? undefined
        if (agentId !== undefined && !isAgentId(agentId)) {
          return errorResponse({ status: 404, message: `Unknown agent: ${agentId}` })
        }
        const status = await deps.server.status(agentId)
        const { certPath } = deps.cert.active()
        const certExists = deps.cert.exists(certPath)
        const port = deps.mitmPort()
        const report = summarizeDiagnostics({
          serverRunning: status.running,
          serverReachable: status.running ? await deps.acceptsConnections(port) : false,
          certExists,
          certTrusted: certExists ? await deps.cert.trusted(certPath) : false,
          // Sin agente pedido, basta con que uno de los activados esté redirigido.
          dnsConfigured: agentId ? status.dnsConfigured : anyAgentDnsConfigured(deps.db, deps.dns.configuredFor),
        })
        return Response.json({ ...report, port })
      },
    },
  ]
}
