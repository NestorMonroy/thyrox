/**
 * Los modos de captura del inspector y su punto de ingesta: el resumen de
 * modos, el proxy HTTP explícito, el proxy del sistema con su guarda, la
 * intercepción TLS, y la ingesta por la que el servidor MITM —otro proceso—
 * publica lo que captura. El estado de captura y los proxies se inyectan.
 *
 * Porte de `omniroute: src/app/api/tools/traffic-inspector/{capture-modes,
 * capture-modes/http-proxy,capture-modes/system-proxy,
 * capture-modes/tls-intercept,internal/ingest}/route.ts` (MIT). La ingesta
 * tiene dos cerrojos, como en la referencia: el de loopback del enrutador y
 * el token, para que otro proceso local no llene el búfer.
 */
import type { Database } from 'bun:sqlite'
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto'

import { z } from 'zod'


import { parseEnvNumber } from '../../envNumber.ts'
import type { TrafficBuffer } from '../../inspector/buffer.ts'
import {
  clearSystemProxy,
  getHttpProxyHandle,
  getSystemProxyState,
  isTlsInterceptEnabled,
  setHttpProxyHandle,
  setSystemProxyApplied,
  setTlsIntercept,
  type SystemProxyState,
} from '../../inspector/captureState.ts'
import { defaultHttpProxyPort, startHttpProxyServer, type HttpProxyServerHandle } from '../../inspector/httpProxyServer.ts'
import { apply, revert, type ApplyResult, type PreviousState } from '../../inspector/systemProxyConfig.ts'
import { InterceptedRequestSchema, type InterceptedRequest } from '../../inspector/types.ts'
import { maskSecret } from '../../maskSecrets.ts'
import { sanitizeHeaders } from '../../sanitizeHeaders.ts'
import {
  InspectorCaptureModeActionSchema,
  InspectorSystemProxyActionSchema,
  InspectorTlsInterceptToggleSchema,
} from '../../schemas/inspector.ts'
import { listCustomHosts } from '../../state/inspectorCustomHosts.ts'
import { errorResponse, parseJsonBody } from '../http.ts'
import type { ApiRoute } from '../router.ts'
import { INSPECTOR_BASE } from './inspector.ts'

export interface InspectorCaptureDeps {
  db: Database
  traffic: Pick<TrafficBuffer, 'push'>
  ingestToken: () => string
  httpProxy: {
    current(): HttpProxyServerHandle | null
    remember(handle: HttpProxyServerHandle | null): void
    start(port: number): Promise<HttpProxyServerHandle>
    defaultPort(): number
  }
  systemProxy: {
    state(): Readonly<SystemProxyState>
    apply(port: number): Promise<ApplyResult>
    revert(previous: PreviousState): Promise<void>
    markApplied(port: number, previous: PreviousState, guardMinutes: number): void
    clear(): void
    defaultGuardMinutes(): number
  }
  tlsIntercept: {
    enabled(): boolean
    set(enabled: boolean): void
  }
}

const MIN_INGEST_TOKEN_LENGTH = 16
const DEFAULT_GUARD_MINUTES = 30

/**
 * El token de ingesta: el del entorno si tiene al menos 16 caracteres; si no,
 * uno generado. Quien lanza el servidor MITM se lo pasa en el mismo entorno.
 */
export function resolveIngestToken(env: NodeJS.ProcessEnv = process.env): string {
  const declared = env.THYROX_INSPECTOR_INTERNAL_INGEST_TOKEN
  return declared && declared.length >= MIN_INGEST_TOKEN_LENGTH ? declared : randomUUID().replace(/-/g, '')
}

/** Los minutos tras los que el proxy del sistema se revierte solo. */
export function systemProxyGuardMinutes(env: NodeJS.ProcessEnv = process.env): number {
  return parseEnvNumber(env.THYROX_INSPECTOR_SYSTEM_PROXY_GUARD_MINUTES, DEFAULT_GUARD_MINUTES)
}

/** Comparación en tiempo constante sobre los resúmenes, que igualan la longitud. */
function tokenMatches(received: string, expected: string): boolean {
  if (!received || !expected) return false
  const digest = (value: string) => createHash('sha256').update(value).digest()
  return timingSafeEqual(digest(received), digest(expected))
}

/** El estado de captura del proceso y los proxies reales; el token se fija una vez. */
export function defaultInspectorCaptureDeps(db: Database, traffic: Pick<TrafficBuffer, 'push'>): InspectorCaptureDeps {
  const token = resolveIngestToken()
  return {
    db,
    traffic,
    ingestToken: () => token,
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

/** Lo mínimo que tiene que traer una entrada; el resto toma su valor por defecto. */
const IngestBodySchema = InterceptedRequestSchema.partial().required({
  id: true,
  timestamp: true,
  method: true,
  host: true,
  path: true,
  source: true,
  requestHeaders: true,
  requestSize: true,
  responseHeaders: true,
  responseSize: true,
  status: true,
})

/** La entrada lista para el búfer: cabeceras saneadas y cuerpos con los secretos enmascarados. */
function sanitizedEntry(data: z.infer<typeof IngestBodySchema>): InterceptedRequest {
  return {
    ...data,
    agent: data.agent as InterceptedRequest['agent'],
    requestHeaders: sanitizeHeaders(data.requestHeaders),
    responseHeaders: sanitizeHeaders(data.responseHeaders),
    requestBody: data.requestBody != null ? maskSecret(data.requestBody) : null,
    responseBody: data.responseBody != null ? maskSecret(data.responseBody) : null,
  } as InterceptedRequest
}

export function createInspectorCaptureRoutes(deps: InspectorCaptureDeps): ApiRoute[] {
  const at = (route: string) => `${INSPECTOR_BASE}${route}`

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
    {
      method: 'POST',
      path: at('/internal/ingest'),
      handler: async ({ request }) => {
        const auth = request.headers.get('authorization') ?? ''
        const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : ''
        if (!tokenMatches(token, deps.ingestToken())) {
          return errorResponse({ status: 403, message: 'Invalid or missing ingest token' })
        }
        const body = await parseJsonBody(request, IngestBodySchema)
        if (!body.ok) return body.response
        const entry = sanitizedEntry(body.data)
        deps.traffic.push(entry)
        return Response.json({ ok: true, id: entry.id })
      },
    },
  ]
}
