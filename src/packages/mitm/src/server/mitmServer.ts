/**
 * El servidor MITM del AgentBridge: termina el TLS de los hosts de destino
 * (a los que el archivo hosts apunta aquí), reenvía al proxy local las
 * peticiones de chat cuyo modelo tiene alias, y deja pasar todo lo demás al
 * host real. También atiende CONNECT: excluido o ajeno, túnel TCP sin
 * descifrar; destino, lo descifra el propio servidor.
 *
 * Porte de `omniroute: src/mitm/server.cjs` (MIT). Diferencias:
 *  - es un módulo que importa las piezas ya portadas, no un proceso CommonJS
 *    con shims; el proceso lo arranca `server/main.ts`;
 *  - con el modelo de CA raíz presenta UNA hoja con todos los hosts de
 *    destino como SAN: Bun no invoca `SNICallback`;
 *  - un CONNECT a un destino se entrega encauzándolo a una conexión nueva al
 *    propio puerto: en Bun, reemitir el socket con `emit('connection')` no
 *    inicia TLS sobre él;
 *  - el tráfico propio se reconoce por `x-thyrox-source: thyrox` y el
 *    reenviado lleva `x-thyrox-source`/`x-thyrox-agent`;
 *  - los alias salen del store del AgentBridge;
 *  - el volcado de peticiones a archivo no se porta: en la referencia lo
 *    apaga una constante fija, así que es código que nunca corre;
 *  - un error de escucha rechaza `listen` en vez de terminar el proceso, y
 *    las líneas de registro van a un escritor inyectable.
 */
import type { Database } from 'bun:sqlite'
import dns from 'node:dns'
import fs from 'node:fs'
import https from 'node:https'
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http'
import net from 'node:net'
import path from 'node:path'

import { sanitizeErrorMessage } from '@thyrox/provider/sanitize/errorSanitization'

import { applyAntigravityOverride, type MitmAliasEntry } from '../aliasConfig.ts'
import { loadOrCreateMitmCa } from '../cert/rootCa.ts'
import { issueLeafCertForHosts } from '../dynamicCert.ts'
import { applyIdleTimeout, MITM_IDLE_TIMEOUT_MS } from '../socketTimeouts.ts'
import { MITM_AGENT_IDS, type AgentId } from '../types.ts'
import { isSelfLoopDestination, parseBypassJson, routeBypass } from './bypass.ts'
import {
  getAgentRouteConfig,
  resolveForwardTarget,
  resolveForwardTargetForAgent,
  resolveMappedOverride,
} from './forwardTarget.ts'
import { buildIngestEntry, postIngestEntry } from './ingest.ts'
import { loadTargetHosts, type MitmServerConfig, targetsJsonPath } from './serverConfig.ts'

// El tope de cuerpo que se captura para el inspector; el búfer vuelve a truncar.
const INGEST_MAX_BODY = 65536
const DEFAULT_UPSTREAM_PORT = 443
const CONNECTION_ESTABLISHED = 'HTTP/1.1 200 Connection Established\r\n\r\n'

export interface MitmServerStats {
  startedAt: string | null
  totalRequests: number
  interceptedRequests: number
  activeConnections: number
  lastRequestAt: string | null
  lastInterceptAt: string | null
}

export interface MitmServerDeps {
  /** El store del AgentBridge, del que salen los alias. */
  db: Database
  /** La IP real del host, sin pasar por el archivo hosts. */
  resolveTargetIp?: (host: string) => Promise<string>
  upstreamPort?: number
  writeLine?: (line: string) => void
  fetchImpl?: typeof fetch
}

export interface MitmServerHandle {
  server: https.Server
  stats: MitmServerStats
  targetHosts: Map<string, string>
  listen(port?: number): Promise<number>
  close(): Promise<void>
}

/** Resuelve contra 8.8.8.8, para no recibir la IP local que el archivo hosts impone. */
function createPublicResolver(): (host: string) => Promise<string> {
  const cache = new Map<string, string>()
  return async host => {
    const cached = cache.get(host)
    if (cached) return cached
    const resolver = new dns.promises.Resolver()
    resolver.setServers(['8.8.8.8'])
    const [address] = await resolver.resolve4(host)
    if (!address) throw new Error(`no IPv4 address for ${host}`)
    cache.set(host, address)
    return address
  }
}

function hostOf(req: IncomingMessage): string {
  return String(req.headers.host || '').split(':')[0]!.toLowerCase()
}

function headersToObject(headers: IncomingHttpHeaders | Headers): Record<string, string> {
  const out: Record<string, string> = {}
  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      out[key] = value
    })
    return out
  }
  for (const [key, value] of Object.entries(headers)) {
    if (value == null) continue
    out[key] = Array.isArray(value) ? value.join(', ') : String(value)
  }
  return out
}

function collectBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

/** El modelo pedido: el `model` del cuerpo JSON, o el de una URL `/models/<m>:`. */
export function extractModel(body: Buffer, url: string | undefined): string | null {
  try {
    const parsed = JSON.parse(body.toString()) as { model?: unknown } | null
    if (parsed && typeof parsed.model === 'string' && parsed.model) return parsed.model
  } catch {
    // Un cuerpo que no es JSON no declara modelo.
  }
  const match = url?.match(/\/models\/([^/:]+)(?::|\/)/)
  return match?.[1] ?? null
}

function knownAgent(agentId: string): AgentId | undefined {
  return (MITM_AGENT_IDS as readonly string[]).includes(agentId) ? (agentId as AgentId) : undefined
}

function parseConnectAuthority(authority: string): { host: string; port: number } {
  const idx = authority.lastIndexOf(':')
  if (idx === -1) return { host: authority.toLowerCase(), port: 443 }
  const port = Number.parseInt(authority.slice(idx + 1), 10)
  return {
    host: authority.slice(0, idx).toLowerCase(),
    port: Number.isInteger(port) && port > 0 && port <= 65535 ? port : 443,
  }
}

/** Un túnel TCP en los dos sentidos, que se recoge al quedar inactivo o al cerrarse un lado. */
function pipeTunnel(clientSocket: net.Socket, targetSocket: net.Socket, head: Buffer): void {
  clientSocket.write(CONNECTION_ESTABLISHED)
  if (head.length > 0) targetSocket.write(head)
  targetSocket.pipe(clientSocket)
  clientSocket.pipe(targetSocket)
  const destroyBoth = () => {
    clientSocket.destroy()
    targetSocket.destroy()
  }
  clientSocket.setTimeout(MITM_IDLE_TIMEOUT_MS, destroyBoth)
  targetSocket.setTimeout(MITM_IDLE_TIMEOUT_MS, destroyBoth)
}

export async function createMitmServer(config: MitmServerConfig, deps: MitmServerDeps): Promise<MitmServerHandle> {
  const writeLine = deps.writeLine ?? (line => process.stdout.write(`${line}\n`))
  const vlog = (level: number, message: string) => {
    if (config.verbose >= level) writeLine(message)
  }
  const resolveTargetIp = deps.resolveTargetIp ?? createPublicResolver()
  const upstreamPort = deps.upstreamPort ?? DEFAULT_UPSTREAM_PORT
  const fetchImpl = deps.fetchImpl ?? fetch
  const routerMessagesUrl = `${config.routerBaseUrl}/v1/messages`

  const targetHosts = loadTargetHosts(targetsJsonPath(config.dataDir))
  let userBypassPatterns: string[] = []
  try {
    userBypassPatterns = parseBypassJson(fs.readFileSync(path.join(config.dataDir, 'bypass.json'), 'utf-8'))
  } catch {
    // Sin bypass.json, sólo los patrones por defecto.
  }

  const stats: MitmServerStats = {
    startedAt: null,
    totalRequests: 0,
    interceptedRequests: 0,
    activeConnections: 0,
    lastRequestAt: null,
    lastInterceptAt: null,
  }
  const statsFile = path.join(config.dataDir, 'stats.json')
  const writeStats = () => {
    try {
      fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2))
    } catch {
      // Las estadísticas no pueden afectar al tráfico.
    }
  }

  let tlsOptions: https.ServerOptions
  if (config.certMode === 'root-ca') {
    const ca = await loadOrCreateMitmCa(config.dataDir)
    const leaf = await issueLeafCertForHosts([...targetHosts.keys()], { key: ca.key, cert: ca.cert })
    tlsOptions = { key: leaf.key, cert: leaf.cert }
  } else {
    tlsOptions = {
      key: fs.readFileSync(path.join(config.dataDir, 'server.key')),
      cert: fs.readFileSync(path.join(config.dataDir, 'server.crt')),
    }
  }

  let boundPort = config.localPort

  async function passthrough(req: IncomingMessage, res: ServerResponse, body: Buffer): Promise<void> {
    const targetHost = hostOf(req)
    let targetIp: string
    try {
      targetIp = await resolveTargetIp(targetHost)
    } catch (err) {
      writeLine(`[MITM] Passthrough error: ${sanitizeErrorMessage(err)}`)
      if (!res.headersSent) res.writeHead(502)
      res.end('Bad Gateway')
      return
    }
    // Guarda estructural: si el host resuelve a este mismo servidor, reenviar
    // volvería a entrar aquí sin fin.
    if (isSelfLoopDestination(targetIp, upstreamPort, boundPort)) {
      writeLine(`[MITM] Loop guard: ${targetHost} resolves to self (${targetIp}:${boundPort}) — refusing to forward`)
      if (!res.headersSent) res.writeHead(508)
      res.end('Loop Detected')
      return
    }
    const forwardReq = https.request(
      {
        hostname: targetIp,
        port: upstreamPort,
        path: req.url,
        method: req.method,
        headers: { ...req.headers, host: targetHost },
        servername: targetHost,
        rejectUnauthorized: !config.disableTlsVerify,
      },
      forwardRes => {
        res.writeHead(forwardRes.statusCode ?? 502, forwardRes.headers)
        forwardRes.pipe(res)
      },
    )
    forwardReq.on('error', err => {
      writeLine(`[MITM] Passthrough error: ${sanitizeErrorMessage(err)}`)
      if (!res.headersSent) res.writeHead(502)
      res.end('Bad Gateway')
    })
    if (body.length > 0) forwardReq.write(body)
    forwardReq.end()
  }

  function captureToInspector(o: {
    req: IncomingMessage
    body: Buffer
    agentId: string
    sourceModel: string | null
    mappedModel: string | null
    status: number | 'in-flight' | 'error'
    respHeaders: Record<string, string>
    respBody: string | null
    respSize: number
    error?: string
    proxyLatencyMs: number
    upstreamLatencyMs: number
  }): void {
    if (!config.ingestToken) return
    try {
      const entry = buildIngestEntry({
        method: o.req.method,
        host: o.req.headers.host || '',
        path: o.req.url || '/',
        agentId: knownAgent(o.agentId),
        sourceModel: o.sourceModel,
        mappedModel: o.mappedModel ?? undefined,
        requestHeaders: headersToObject(o.req.headers),
        requestBody: o.body.length > 0 ? o.body.toString('utf8').slice(0, INGEST_MAX_BODY) : null,
        requestSize: o.body.length,
        status: o.status,
        responseHeaders: o.respHeaders,
        responseBody: o.respBody,
        responseSize: o.respSize,
        error: o.error,
        proxyLatencyMs: o.proxyLatencyMs,
        upstreamLatencyMs: o.upstreamLatencyMs,
      })
      void postIngestEntry(config.ingestBaseUrl, config.ingestToken, entry, fetchImpl)
    } catch {
      // La captura es de mejor esfuerzo: nunca rompe el tráfico.
    }
  }

  async function intercept(
    req: IncomingMessage,
    res: ServerResponse,
    body: Buffer,
    override: MitmAliasEntry,
    sourceModel: string | null,
  ): Promise<void> {
    const agentId = targetHosts.get(hostOf(req)) || 'unknown'
    const startedAt = Date.now()
    let upstreamStartedAt = startedAt
    let status: number | 'error' = 'error'
    let respHeaders: Record<string, string> = {}
    let respBody = ''
    let respSize = 0
    let captureError: string | undefined
    try {
      const payload = applyAntigravityOverride(JSON.parse(body.toString()) as Record<string, unknown>, override)
      const forward = resolveForwardTargetForAgent({
        routerBaseUrl: config.routerBaseUrl,
        routerMessagesUrl,
        body: payload,
        agentId,
        fallbackResolver: resolveForwardTarget,
      })
      vlog(1, `[MITM] → forward ${forward.format} ${forward.url}`)
      upstreamStartedAt = Date.now()
      // Un agente que cierra no debe mantener viva la lectura del upstream.
      const upstreamAbort = new AbortController()
      let downstreamClosed = false
      const onDownstreamClose = () => {
        downstreamClosed = true
        upstreamAbort.abort()
      }
      res.once('close', onDownstreamClose)
      let reader: ReadableStreamDefaultReader<Uint8Array> | null = null
      try {
        const response = await fetchImpl(forward.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
            'x-thyrox-source': 'agent-bridge',
            'x-thyrox-agent': agentId,
          },
          body: JSON.stringify(payload),
          signal: upstreamAbort.signal,
        })
        status = response.status
        respHeaders = headersToObject(response.headers)
        if (!response.ok) {
          const errText = await response.text().catch(() => '')
          respBody = errText.slice(0, INGEST_MAX_BODY)
          respSize = Buffer.byteLength(errText)
          throw new Error(`proxy ${response.status}: ${errText}`)
        }
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        })
        if (!response.body) {
          res.end()
          return
        }
        reader = response.body.getReader()
        const decoder = new TextDecoder()
        while (!downstreamClosed) {
          const { done, value } = await reader.read()
          if (done) {
            res.end()
            break
          }
          const text = decoder.decode(value, { stream: true })
          if (respBody.length < INGEST_MAX_BODY) respBody += text
          respSize += value.length
          if (downstreamClosed || res.destroyed) break
          res.write(text)
        }
      } finally {
        res.off('close', onDownstreamClose)
        if (reader) {
          await reader.cancel().catch(() => {})
          reader.releaseLock()
        }
      }
    } catch (error) {
      captureError = sanitizeErrorMessage(error)
      writeLine(`[MITM] ${captureError}`)
      if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: { message: captureError, type: 'mitm_error' } }))
    } finally {
      captureToInspector({
        req,
        body,
        agentId,
        sourceModel,
        mappedModel: override.model || sourceModel,
        status,
        respHeaders,
        respBody,
        respSize,
        error: captureError,
        proxyLatencyMs: Math.max(0, upstreamStartedAt - startedAt),
        upstreamLatencyMs: Math.max(0, Date.now() - upstreamStartedAt),
      })
    }
  }

  const server = https.createServer(tlsOptions, async (req, res) => {
    stats.totalRequests++
    stats.lastRequestAt = new Date().toISOString()
    writeStats()

    const body = await collectBody(req)
    const host = hostOf(req)
    const model = body.length > 0 ? extractModel(body, req.url) : null
    vlog(1, `[MITM] ${req.method} ${host}${req.url} | body: ${body.length}B | model: ${model || 'N/A'}`)

    if (req.headers['x-thyrox-source'] === 'thyrox') {
      vlog(1, '[MITM] → PASSTHROUGH (own traffic)')
      return passthrough(req, res, body)
    }
    const agentId = targetHosts.get(host)
    if (!agentId) {
      vlog(1, `[MITM] → PASSTHROUGH (host ${host} not in target list)`)
      return passthrough(req, res, body)
    }
    const routeConfig = getAgentRouteConfig(agentId)
    if (!routeConfig.chatUrlPatterns.some(p => (req.url ?? '').includes(p))) {
      vlog(1, `[MITM] → PASSTHROUGH (URL ${req.url} does not match chat patterns)`)
      return passthrough(req, res, body)
    }

    // Se captura antes de mirar el alias: el inspector tiene que ver el
    // tráfico aunque aún no haya alias, que es de donde se crean.
    captureToInspector({
      req,
      body,
      agentId,
      sourceModel: model,
      mappedModel: model,
      status: 'in-flight',
      respHeaders: {},
      respBody: null,
      respSize: 0,
      proxyLatencyMs: 0,
      upstreamLatencyMs: 0,
    })

    const override = model ? resolveMappedOverride(deps.db, model, agentId) : null
    if (!override) {
      vlog(1, `[MITM] → PASSTHROUGH (model "${model}" has no MITM alias mapping)`)
      return passthrough(req, res, body)
    }
    stats.interceptedRequests++
    stats.lastInterceptAt = new Date().toISOString()
    writeStats()
    vlog(
      1,
      `[MITM] INTERCEPTED ${agentId} ${model} → ${override.model || model}` +
        (override.reasoningEffort ? ` (reasoningEffort=${override.reasoningEffort})` : ''),
    )
    return intercept(req, res, body, override, model)
  })

  // CONNECT de un cliente que usa el servidor como proxy explícito.
  server.on('connect', (req: IncomingMessage, clientSocket: net.Socket, head: Buffer) => {
    const authority = String(req.url || '')
    const { host, port } = parseConnectAuthority(authority)
    const decision = routeBypass(host, targetHosts, userBypassPatterns)
    // Un destino se descifra aquí mismo: el túnel va a una conexión nueva al
    // propio puerto, que termina TLS como cualquier otra.
    const [dialHost, dialPort, label] =
      decision === 'target' ? ['127.0.0.1', boundPort, 'TARGET (TLS terminate locally)'] : [host, port, `${decision.toUpperCase()} (TCP tunnel)`]
    vlog(1, `[MITM] CONNECT ${host}:${port} → ${label}`)
    const targetSocket = net.connect(dialPort, dialHost, () => pipeTunnel(clientSocket, targetSocket, head))
    const onError = (side: string) => (err: Error) => {
      writeLine(`[MITM] ${decision} TCP forward ${side} error: ${sanitizeErrorMessage(err)}`)
      clientSocket.destroy()
      targetSocket.destroy()
    }
    targetSocket.on('error', onError('upstream'))
    clientSocket.on('error', onError('client'))
    clientSocket.on('close', () => targetSocket.destroy())
    targetSocket.on('close', () => clientSocket.destroy())
  })

  // Acota la vida de cada petición y recoge los sockets inactivos.
  server.requestTimeout = MITM_IDLE_TIMEOUT_MS * 5
  server.headersTimeout = MITM_IDLE_TIMEOUT_MS
  server.keepAliveTimeout = MITM_IDLE_TIMEOUT_MS
  server.on('connection', (socket: net.Socket) => {
    applyIdleTimeout(socket)
    stats.activeConnections++
    writeStats()
    socket.on('close', () => {
      stats.activeConnections = Math.max(0, stats.activeConnections - 1)
      writeStats()
    })
  })

  return {
    server,
    stats,
    targetHosts,
    listen(port = config.localPort) {
      return new Promise((resolve, reject) => {
        const onError = (error: NodeJS.ErrnoException) => reject(error)
        server.once('error', onError)
        server.listen(port, () => {
          server.off('error', onError)
          boundPort = (server.address() as net.AddressInfo).port
          stats.startedAt = new Date().toISOString()
          writeStats()
          writeLine(`[MITM] ready on :${boundPort} → ${config.routerBaseUrl}`)
          resolve(boundPort)
        })
      })
    },
    close() {
      return new Promise(resolve => {
        server.closeAllConnections?.()
        server.close(() => resolve())
      })
    },
  }
}
