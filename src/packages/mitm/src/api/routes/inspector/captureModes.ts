/**
 * Los modos de captura del inspector: su resumen, el proxy HTTP explícito, el
 * proxy del sistema con su guarda de reversión y la intercepción TLS. El
 * estado de captura y los proxies se inyectan.
 *
 * Porte de `omniroute: src/app/api/tools/traffic-inspector/{capture-modes,
 * capture-modes/http-proxy,capture-modes/system-proxy,
 * capture-modes/tls-intercept}/route.ts` (MIT).
 */
import type { Database } from 'bun:sqlite'

import { parseEnvNumber } from '../../../envNumber.ts'
import {
  clearSystemProxy,
  getHttpProxyHandle,
  getSystemProxyState,
  isTlsInterceptEnabled,
  setHttpProxyHandle,
  setSystemProxyApplied,
  setTlsIntercept,
  type SystemProxyState,
} from '../../../inspector/captureState.ts'
import { defaultHttpProxyPort, startHttpProxyServer, type HttpProxyServerHandle } from '../../../inspector/httpProxyServer.ts'
import { apply, revert, type ApplyResult, type PreviousState } from '../../../inspector/systemProxyConfig.ts'
import {
  InspectorCaptureModeActionSchema,
  InspectorSystemProxyActionSchema,
  InspectorTlsInterceptToggleSchema,
} from '../../../schemas/inspector.ts'
import { listCustomHosts } from '../../../state/inspectorCustomHosts.ts'
import { errorResponse, parseJsonBody } from '../../http.ts'
import type { ApiRoute } from '../../router.ts'
import { inspectorPath } from './basePath.ts'

export interface HttpProxyControl {
  current(): HttpProxyServerHandle | null
  remember(handle: HttpProxyServerHandle | null): void
  start(port: number): Promise<HttpProxyServerHandle>
  defaultPort(): number
}

export interface SystemProxyControl {
  state(): Readonly<SystemProxyState>
  apply(port: number): Promise<ApplyResult>
  revert(previous: PreviousState): Promise<void>
  markApplied(port: number, previous: PreviousState, guardMinutes: number): void
  clear(): void
  defaultGuardMinutes(): number
}

export interface TlsInterceptSwitch {
  enabled(): boolean
  set(enabled: boolean): void
}

export interface CaptureModeRouteDeps {
  db: Database
  httpProxy: HttpProxyControl
  systemProxy: SystemProxyControl
  tlsIntercept: TlsInterceptSwitch
}

const DEFAULT_GUARD_MINUTES = 30

/** Los minutos tras los que el proxy del sistema se revierte solo. */
export function systemProxyGuardMinutes(env: NodeJS.ProcessEnv = process.env): number {
  return parseEnvNumber(env.THYROX_INSPECTOR_SYSTEM_PROXY_GUARD_MINUTES, DEFAULT_GUARD_MINUTES)
}

/** El estado de captura del proceso y los proxies reales. */
export function realCaptureModeRouteDeps(db: Database): CaptureModeRouteDeps {
  return {
    db,
    httpProxy: {
      current: getHttpProxyHandle,
      remember: setHttpProxyHandle,
      start: port => startHttpProxyServer(port),
      defaultPort: defaultHttpProxyPort,
    },
    systemProxy: {
      state: getSystemProxyState,
      apply,
      revert,
      markApplied: setSystemProxyApplied,
      clear: clearSystemProxy,
      defaultGuardMinutes: () => systemProxyGuardMinutes(),
    },
    tlsIntercept: { enabled: isTlsInterceptEnabled, set: setTlsIntercept },
  }
}

export function createCaptureModeRoutes(deps: CaptureModeRouteDeps): ApiRoute[] {
  const at = inspectorPath

  return [
    {
      method: 'GET',
      path: at('/capture-modes'),
      handler: () => {
        const hosts = listCustomHosts(deps.db)
        const proxy = deps.httpProxy.current()
        const system = deps.systemProxy.state()
        return Response.json({
          agentBridge: true,
          customHosts: { count: hosts.length, enabledCount: hosts.filter(h => h.enabled).length },
          httpProxy: { running: proxy !== null, port: proxy?.port ?? null },
          systemProxy: { applied: system.applied, guardUntil: system.guardUntil, port: system.port },
          tlsIntercept: { enabled: deps.tlsIntercept.enabled() },
        })
      },
    },
    {
      method: 'POST',
      path: at('/capture-modes/http-proxy'),
      handler: async ({ request }) => {
        const body = await parseJsonBody(request, InspectorCaptureModeActionSchema)
        if (!body.ok) return body.response
        const current = deps.httpProxy.current()
        if (body.data.action === 'stop') {
          if (current) {
            await current.stop()
            deps.httpProxy.remember(null)
          }
          return Response.json({ ok: true, running: false, port: null })
        }
        if (current) return Response.json({ ok: true, running: true, port: current.port })
        const port = deps.httpProxy.defaultPort()
        try {
          const started = await deps.httpProxy.start(port)
          deps.httpProxy.remember(started)
          return Response.json({ ok: true, running: true, port: started.port }, { status: 201 })
        } catch (err) {
          if ((err as NodeJS.ErrnoException).code !== 'EADDRINUSE') throw err
          return errorResponse({
            status: 409,
            message: `Port ${port} is already in use`,
            details: { code: 'EADDRINUSE', port },
          })
        }
      },
    },
    {
      method: 'POST',
      path: at('/capture-modes/system-proxy'),
      handler: async ({ request }) => {
        const body = await parseJsonBody(request, InspectorSystemProxyActionSchema)
        if (!body.ok) return body.response
        const { systemProxy } = deps
        if (body.data.action === 'revert') {
          const previous = systemProxy.state().previousState
          if (previous) await systemProxy.revert(previous)
          systemProxy.clear()
          return Response.json({ ok: true, applied: false })
        }
        const port = body.data.port ?? deps.httpProxy.defaultPort()
        const result = await systemProxy.apply(port)
        systemProxy.markApplied(port, result.previousState, body.data.guardMinutes ?? systemProxy.defaultGuardMinutes())
        return Response.json({
          ok: true,
          applied: true,
          port,
          platform: result.platform,
          guardUntil: systemProxy.state().guardUntil,
        })
      },
    },
    {
      method: 'POST',
      path: at('/capture-modes/tls-intercept'),
      handler: async ({ request }) => {
        const body = await parseJsonBody(request, InspectorTlsInterceptToggleSchema)
        if (!body.ok) return body.response
        deps.tlsIntercept.set(body.data.enabled)
        return Response.json({ ok: true, tlsIntercept: { enabled: deps.tlsIntercept.enabled() } })
      },
    },
  ]
}
