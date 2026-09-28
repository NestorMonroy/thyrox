/**
 * El gancho del inspector que los handlers llaman en cada petición
 * interceptada: abre la entrada en el búfer, la cierra con la respuesta o la
 * marca como fallida, para que los handlers no conozcan el inspector.
 *
 * Porte de `omniroute: src/mitm/inspector/agentBridgeHook.ts` (MIT). La
 * referencia lee de una base global si el host es personalizado y carga la
 * atribución de proceso con un import dinámico; aquí `createAgentBridgeHook`
 * recibe esa consulta y el búfer, e `installAgentBridgeHook` lo instala en los
 * handlers con la base del estado del AgentBridge.
 */
import type { Database } from 'bun:sqlite'
import { randomUUID } from 'node:crypto'
import type { IncomingMessage } from 'node:http'

import { sanitizeErrorMessage } from '@thyrox/provider/sanitize/errorSanitization'

import { type AgentBridgeHook, type CompletionData, setAgentBridgeHook } from '../handlers/base.ts'
import { maskSecret } from '../maskSecrets.ts'
import { sanitizeHeaders } from '../sanitizeHeaders.ts'
import { isCustomHost } from '../state/inspectorCustomHosts.ts'
import type { AgentId } from '../types.ts'
import { globalTrafficBuffer, type TrafficBuffer } from './buffer.ts'
import { attributeProcess, type ProcessInfo } from './processAttribution.ts'
import type { InterceptedRequest } from './types.ts'

export interface RecordRequestStartOpts {
  req: IncomingMessage
  body: Buffer
  agentId: AgentId
  mappedModel: string
  sourceModel?: string | null
  sessionId?: string
}

export type RecordRequestCompleteOpts = CompletionData

export interface AgentBridgeHookDeps {
  /** ¿El host es uno de los personalizados y activos del inspector? */
  isCustomHost: (host: string) => boolean
  buffer: TrafficBuffer
  attributeProcess?: (localPort: number) => ProcessInfo | null
}

export interface InspectorAgentBridgeHook extends Required<AgentBridgeHook> {
  recordRequestStart: (opts: RecordRequestStartOpts) => Promise<InterceptedRequest>
}

export function createAgentBridgeHook(deps: AgentBridgeHookDeps): InspectorAgentBridgeHook {
  const attribute = deps.attributeProcess ?? attributeProcess
  return {
    async recordRequestStart(opts) {
      const requestBody = opts.body.length > 0 ? maskSecret(opts.body.toString('utf8')) : null
      // Un host personalizado llega por el mismo camino que un agente (su DNS
      // también apunta al MITM); lo distingue la consulta, y entonces no lleva
      // agente para que el filtro «Custom» lo encuentre.
      const host = opts.req.headers.host ?? ''
      const customHost = deps.isCustomHost(host)
      const intercepted: InterceptedRequest = {
        id: randomUUID(),
        source: customHost ? 'custom-host' : 'agent-bridge',
        agent: customHost ? undefined : opts.agentId,
        timestamp: new Date().toISOString(),
        method: opts.req.method ?? 'GET',
        host,
        path: opts.req.url ?? '/',
        requestHeaders: sanitizeHeaders(opts.req.headers),
        requestBody,
        requestSize: opts.body.length,
        responseHeaders: {},
        responseBody: null,
        responseSize: 0,
        status: 'in-flight',
        sourceModel: opts.sourceModel ?? null,
        mappedModel: opts.mappedModel,
      }
      if (opts.sessionId) intercepted.sessionId = opts.sessionId

      // El puerto remoto del socket entrante es el puerto efímero local del
      // proceso cliente. La atribución nunca bloquea la captura.
      try {
        const remotePort = opts.req.socket?.remotePort
        if (typeof remotePort === 'number') {
          const info = attribute(remotePort)
          if (info) {
            intercepted.pid = info.pid
            intercepted.processName = info.processName
          }
        }
      } catch {
        // La atribución es opcional.
      }

      deps.buffer.push(intercepted)
      return intercepted
    },

    recordRequestComplete(intercepted, opts) {
      intercepted.status = opts.status
      // Las cabeceras de la respuesta también pueden llevar secretos
      // (`Set-Cookie`, `Authorization`), igual que las de la petición.
      intercepted.responseHeaders = sanitizeHeaders(opts.responseHeaders)
      intercepted.responseBody = opts.responseBody != null ? maskSecret(opts.responseBody) : null
      intercepted.responseSize = opts.responseSize
      intercepted.proxyLatencyMs = opts.proxyLatencyMs
      intercepted.upstreamLatencyMs = opts.upstreamLatencyMs
      intercepted.totalLatencyMs = opts.proxyLatencyMs + opts.upstreamLatencyMs
      deps.buffer.update(intercepted.id, intercepted)
    },

    /** El error se sanea: ni una traza ni una ruta absoluta llegan al panel. */
    recordRequestError(intercepted, err) {
      intercepted.status = 'error'
      intercepted.error = sanitizeErrorMessage(err)
      deps.buffer.update(intercepted.id, intercepted)
    },
  }
}

/** Instala en los handlers el gancho sobre el búfer del proceso y esta base. */
export function installAgentBridgeHook(db: Database): InspectorAgentBridgeHook {
  const hook = createAgentBridgeHook({
    isCustomHost: host => isCustomHost(db, host),
    buffer: globalTrafficBuffer,
  })
  setAgentBridgeHook(hook)
  return hook
}
