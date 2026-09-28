/**
 * La API local del MITM compuesta y en marcha: todos los grupos de rutas con
 * sus dependencias reales sobre una base y un búfer dados, el canal en vivo
 * sobre ese búfer, y el destino de ingesta publicado al gestor para que el
 * servidor MITM que lance después envíe ahí lo que captura.
 */
import type { Database } from 'bun:sqlite'

import type { TrafficBuffer } from '../inspector/buffer.ts'
import { setInspectorIngest } from '../manager.ts'
import { createAgentDnsRoutes, realAgentDnsRouteDeps } from './routes/agentBridge/agentDns.ts'
import { createAgentRoutes, realAgentRouteDeps } from './routes/agentBridge/agents.ts'
import { createBypassRoutes } from './routes/agentBridge/bypass.ts'
import { createCertRoutes, realCertRouteDeps } from './routes/agentBridge/cert.ts'
import { createConfigRoutes } from './routes/agentBridge/config.ts'
import { createDiagnoseRoutes, realDiagnoseRouteDeps } from './routes/agentBridge/diagnose.ts'
import { createRepairRoutes, realRepairRouteDeps } from './routes/agentBridge/repair.ts'
import { createServerRoutes, realServerRouteDeps } from './routes/agentBridge/server.ts'
import { createStateRoutes, realStateRouteDeps } from './routes/agentBridge/state.ts'
import { createTproxyRoutes, realTproxyCapture } from './routes/agentBridge/tproxy.ts'
import { createUpstreamCaRoutes, realUpstreamCaStore } from './routes/agentBridge/upstreamCa.ts'
import { createCaptureModeRoutes, realCaptureModeRouteDeps } from './routes/inspector/captureModes.ts'
import { createHostRoutes, realHostRouteDeps } from './routes/inspector/hosts.ts'
import { createIngestRoutes, resolveIngestToken } from './routes/inspector/ingest.ts'
import { createRequestRoutes, realRequestRouteDeps } from './routes/inspector/requests.ts'
import { createSessionRoutes } from './routes/inspector/sessions.ts'
import { createAntigravityCliRoutes, realAntigravityCliRouteDeps } from './routes/settings/antigravityCli.ts'
import { createMitmAliasRoutes } from './routes/settings/mitmAliases.ts'
import { createSettingsRoutes, realSettingsRouteDeps } from './routes/settings/mitmSettings.ts'
import type { ApiRoute } from './router.ts'
import { MITM_API_HOSTNAME, startMitmApiServer } from './server.ts'

export interface MitmApiRouteOptions {
  traffic: TrafficBuffer
  ingestToken: string
}

/** Un método y una ruta montados dos veces: el enrutador atendería sólo el primero, en silencio. */
export function assertUniqueRoutes(routes: readonly ApiRoute[]): void {
  const seen = new Set<string>()
  for (const route of routes) {
    const key = `${route.method} ${route.path}`
    if (seen.has(key)) throw new Error(`Route mounted twice: ${key}`)
    seen.add(key)
  }
}

export function mitmApiRoutes(db: Database, options: MitmApiRouteOptions): ApiRoute[] {
  const { traffic, ingestToken } = options
  const routes = [
    ...createStateRoutes(realStateRouteDeps(db)),
    ...createAgentRoutes({ ...realAgentRouteDeps(db), traffic }),
    ...createBypassRoutes(db),
    ...createConfigRoutes(db),
    ...createServerRoutes(realServerRouteDeps),
    ...createCertRoutes(realCertRouteDeps),
    ...createAgentDnsRoutes(realAgentDnsRouteDeps(db)),
    ...createRepairRoutes(realRepairRouteDeps),
    ...createDiagnoseRoutes(realDiagnoseRouteDeps(db)),
    ...createUpstreamCaRoutes(realUpstreamCaStore),
    ...createTproxyRoutes(realTproxyCapture),
    ...createRequestRoutes({ ...realRequestRouteDeps, traffic }),
    ...createSessionRoutes(db),
    ...createHostRoutes(realHostRouteDeps(db)),
    ...createCaptureModeRoutes(realCaptureModeRouteDeps(db)),
    ...createIngestRoutes({ traffic, ingestToken: () => ingestToken }),
    ...createSettingsRoutes(realSettingsRouteDeps),
    ...createAntigravityCliRoutes(realAntigravityCliRouteDeps),
    ...createMitmAliasRoutes(db),
  ]
  assertUniqueRoutes(routes)
  return routes
}

export interface MitmApiOptions {
  /** 0 elige uno libre. */
  port: number
  db: Database
  traffic: TrafficBuffer
}

export interface RunningMitmApi {
  url: string
  ingestToken: string
  /** Para el servidor y retira el destino de ingesta. */
  stop(): void
}

export function startMitmApi(options: MitmApiOptions): RunningMitmApi {
  const ingestToken = resolveIngestToken()
  const server = startMitmApiServer({
    port: options.port,
    routes: mitmApiRoutes(options.db, { traffic: options.traffic, ingestToken }),
    liveStream: options.traffic,
  })
  const url = `http://${MITM_API_HOSTNAME}:${server.port}`
  setInspectorIngest({ baseUrl: url, token: ingestToken })
  return {
    url,
    ingestToken,
    stop: () => {
      server.stop()
      setInspectorIngest(null)
    },
  }
}
