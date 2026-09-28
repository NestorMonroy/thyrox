/**
 * Las rutas privilegiadas del AgentBridge: arranque y parada del servidor,
 * confianza del certificado, DNS por agente, reinicio de un agente,
 * reparación, diagnóstico, CA del upstream y captura TPROXY. Toda operación
 * que eleva pasa por la misma compuerta de sudo, y la contraseña dada sólo se
 * recuerda tras un éxito y fuera de Windows. Las sondas del sistema se
 * inyectan.
 *
 * Porte de `omniroute: src/app/api/tools/agent-bridge/{server,cert,
 * cert/regenerate,cert/download,agents/[id]/dns,agents/[id]/reset,repair,
 * diagnose,upstream-ca,upstream-ca/test,tproxy}/route.ts` (MIT). Divergencias
 * declaradas:
 *
 * - `sudoPassword` se valida como cadena opcional en todas: la referencia la
 *   rechazaba en `reset`, la ignoraba en silencio en `server`/`dns` y caía a
 *   la guardada en `cert`/`repair`.
 * - `cert`, `cert/download` y `server trust-cert` usan el certificado del
 *   modelo vigente (CA o hoja); la referencia fijaba `server.crt` en las dos
 *   primeras. `trust-cert` comprueba que exista, como ya hacía `POST cert`.
 * - `server regenerate-cert` fuerza el certificado nuevo, como `cert/regenerate`;
 *   sin forzar devolvía el existente.
 * - La clave del servidor hijo es la del cuerpo; sin ella el hijo hereda
 *   `THYROX_PROXY_API_KEYS` del entorno. No hay base de claves que consultar.
 * - `diagnose?agentId=` rehúsa un agente desconocido.
 */
import type { Database } from 'bun:sqlite'
import { X509Certificate } from 'node:crypto'
import fs from 'node:fs'
import net from 'node:net'

import { PRODUCT_NAME } from '@thyrox/config/product'
import { sanitizeErrorMessage } from '@thyrox/provider/sanitize/errorSanitization'
import { z } from 'zod'

import type { CertMigrationDecision } from '../../cert/migration.ts'
import {
  checkCertInstalled,
  installCaCert,
  installCertResult,
  uninstallCert,
  type CertInstallResult,
} from '../../cert/install.ts'
import { generateCert } from '../../cert/generate.ts'
import { resolveActiveCertPath } from '../../cert/activeCert.ts'
import { resolveMitmDataDir } from '../../dataDir.ts'
import { addDNSEntry, checkDNSEntryForAgent, flushWindowsDnsCache, removeDNSEntry } from '../../dns/dnsConfig.ts'
import { summarizeDiagnostics } from '../../inspector/diagnostics.ts'
import {
  getCachedPassword,
  getMitmStatus,
  repairMitm,
  resolveUpstreamCaPath,
  setCachedPassword,
  startMitm,
  stopMitm,
  writeStoredUpstreamCaPath,
  type MitmStatus,
} from '../../manager.ts'
import { AgentBridgeDnsActionSchema, AgentBridgeServerActionSchema, AgentBridgeUpstreamCaPostSchema } from '../../schemas/agentBridge.ts'
import { setMappings, syncAgentBridgeMappingsToMitmAlias } from '../../state/agentBridgeMappings.ts'
import { getAllAgentBridgeStates, upsertAgentBridgeState } from '../../state/agentBridgeState.ts'
import { isMitmSudoPasswordRequired, normalizeMitmSudoPasswordInput, resolveMitmSudoPassword } from '../../sudoGate.ts'
import { installTproxyCa, uninstallTproxyCa } from '../../tproxy/caTrust.ts'
import { getCaptureStatus, startCaptureMode, stopCaptureMode, type CaptureManagerStatus } from '../../tproxy/captureManager.ts'
import type { TproxyConfig } from '../../tproxy/commands.ts'
import { configureUpstreamCa } from '../../upstreamTrust.ts'
import { MITM_AGENT_IDS, type AgentId } from '../../types.ts'
import { errorResponse, parseJsonBody, parseOptionalJsonBody, readJsonBody } from '../http.ts'
import type { ApiRoute } from '../router.ts'
import { AGENT_BRIDGE_BASE, anyAgentDnsConfigured } from './agentBridgeState.ts'

export interface ActiveCert {
  certPath: string
  mode: CertMigrationDecision
}

export interface AgentBridgePrivilegedDeps {
  db: Database
  platform: NodeJS.Platform
  sudo: {
    cached(): string | null
    remember(password: string): void
    /** ¿Rehúsa la operación con esta contraseña ya resuelta? */
    required(password: string): boolean
  }
  server: {
    start(apiKey: string, password: string): Promise<object>
    stop(password: string): Promise<object>
    status(agentId?: string): Promise<MitmStatus>
  }
  cert: {
    active(): ActiveCert
    exists(certPath: string): boolean
    /** El PEM, que es texto. */
    read(certPath: string): string
    trusted(certPath: string): Promise<boolean>
    install(password: string, certPath: string, mode: CertMigrationDecision): Promise<CertInstallResult>
    uninstall(password: string, certPath: string): Promise<void>
    generate(force: boolean): Promise<{ cert: string; key: string }>
  }
  dns: {
    add(password: string, agentId: AgentId): Promise<void>
    remove(password: string, agentId: AgentId): Promise<void>
    flushWindowsCache(): void
    configuredFor(agentId: string): boolean
  }
  repair(password: string): Promise<{ repaired: string[] }>
  mitmPort(): number
  probeTcp(port: number): Promise<boolean>
  upstreamCa: {
    /** La vigente: la variable de entorno gana a la guardada. */
    active(): string | null
    store(caPath: string): void
    configure(caPath: string): void
  }
  tproxy: {
    status(): CaptureManagerStatus
    start(cfg: TproxyConfig, password: string): Promise<CaptureManagerStatus>
    stop(): Promise<CaptureManagerStatus>
  }
}

const DEFAULT_MITM_PORT = 443
const TCP_PROBE_TIMEOUT_MS = 1500

/** Conexión TCP al puerto del servidor; un error o el plazo es `false`. */
function probeTcp(port: number, host = '127.0.0.1'): Promise<boolean> {
  return new Promise(resolve => {
    const socket = net.connect({ port, host })
    const done = (ok: boolean) => {
      socket.destroy()
      resolve(ok)
    }
    socket.setTimeout(TCP_PROBE_TIMEOUT_MS, () => done(false))
    socket.once('connect', () => done(true))
    socket.once('error', () => done(false))
  })
}

function rootCaEnabled(): boolean {
  return process.env.THYROX_MITM_ROOT_CA_ENABLED === 'true'
}

/** Las sondas reales del sistema sobre la base dada. */
export function defaultAgentBridgePrivilegedDeps(db: Database): AgentBridgePrivilegedDeps {
  return {
    db,
    platform: process.platform,
    sudo: { cached: getCachedPassword, remember: setCachedPassword, required: isMitmSudoPasswordRequired },
    server: {
      start: (apiKey, password) => startMitm(apiKey, password),
      stop: password => stopMitm(password),
      status: agentId => getMitmStatus(agentId),
    },
    cert: {
      active: () => resolveActiveCertPath(resolveMitmDataDir(), rootCaEnabled()),
      exists: certPath => fs.existsSync(certPath),
      read: certPath => fs.readFileSync(certPath, 'utf8'),
      trusted: certPath => checkCertInstalled(certPath),
      install: (password, certPath, mode) =>
        mode === 'use-root-ca' ? installCaCert(password, certPath) : installCertResult(password, certPath),
      uninstall: (password, certPath) => uninstallCert(password, certPath),
      generate: force => generateCert({ force }),
    },
    dns: {
      add: (password, agentId) => addDNSEntry(password, agentId),
      remove: (password, agentId) => removeDNSEntry(password, agentId),
      flushWindowsCache: flushWindowsDnsCache,
      configuredFor: agentId => checkDNSEntryForAgent(agentId),
    },
    repair: password => repairMitm(password),
    mitmPort: () => {
      const port = Number(process.env.THYROX_MITM_LOCAL_PORT)
      return port > 0 ? port : DEFAULT_MITM_PORT
    },
    probeTcp: port => probeTcp(port),
    upstreamCa: {
      active: () => resolveUpstreamCaPath(),
      store: writeStoredUpstreamCaPath,
      configure: caPath => configureUpstreamCa(caPath),
    },
    tproxy: {
      status: getCaptureStatus,
      start: (cfg, password) =>
        startCaptureMode({
          cfg,
          installCa: caPem => installTproxyCa(caPem, password),
          uninstallCa: () => uninstallTproxyCa(password),
        }),
      stop: stopCaptureMode,
    },
  }
}

const SudoBodySchema = z.object({ sudoPassword: z.string().optional() })

const ServerBodySchema = AgentBridgeServerActionSchema.extend({
  sudoPassword: z.string().optional(),
  apiKey: z.string().optional(),
})

const DnsBodySchema = AgentBridgeDnsActionSchema.extend({ sudoPassword: z.string().optional() })

export const StartTproxyBodySchema = z.object({
  dport: z.number().int().min(1).max(65535).default(443),
  mark: z.number().int().min(1).default(0x2333),
  onPort: z.number().int().min(1).max(65535).default(8443),
  routeTable: z.number().int().min(1).default(233),
  bypassMark: z.number().int().min(1).default(0x539),
  // Autoriza la instalación en el almacén de confianza; siendo root no se usa.
  sudoPassword: z.string().optional(),
})

const AGENT_IDS: ReadonlySet<string> = new Set(MITM_AGENT_IDS)

function isAgentId(id: string): id is AgentId {
  return AGENT_IDS.has(id)
}

function missingPassword(): Response {
  return errorResponse({ status: 400, message: 'Missing sudoPassword' })
}


/**
 * La contraseña de la operación (la dada o la guardada) y cómo recordar la
 * dada tras un éxito: nunca en Windows, que eleva por UAC.
 */
function sudoFor(deps: AgentBridgePrivilegedDeps, supplied: string | undefined) {
  const password = resolveMitmSudoPassword(supplied, deps.sudo.cached())
  const given = normalizeMitmSudoPasswordInput(supplied)
  return {
    password,
    missing: deps.sudo.required(password),
    rememberGiven: () => {
      if (deps.platform !== 'win32' && given) deps.sudo.remember(given)
    },
  }
}

/** Confía en el certificado del modelo vigente; un fallo de entorno devuelve la guía manual. */
async function trustActiveCert(
  deps: AgentBridgePrivilegedDeps,
  sudo: ReturnType<typeof sudoFor>,
): Promise<Response> {
  const { certPath, mode } = deps.cert.active()
  if (!deps.cert.exists(certPath)) {
    return errorResponse({ status: 404, message: 'Certificate not found. Generate one first.' })
  }
  const result = await deps.cert.install(sudo.password, certPath, mode)
  if (result.installed) {
    sudo.rememberGiven()
    return Response.json({ ok: true, trusted: await deps.cert.trusted(certPath) })
  }
  if (result.reason === 'canceled') return errorResponse({ status: 409, message: 'User canceled authorization' })
  return Response.json({
    ok: false,
    trusted: false,
    skippable: true,
    reason: result.reason,
    message: sanitizeErrorMessage(result.message ?? 'Certificate install failed'),
    manualGuide: result.manualGuide,
  })
}

async function runServerAction(
  deps: AgentBridgePrivilegedDeps,
  body: z.infer<typeof ServerBodySchema>,
): Promise<Response> {
  const sudo = sudoFor(deps, body.sudoPassword)
  const apiKey = body.apiKey ?? ''
  switch (body.action) {
    case 'start': {
      sudo.rememberGiven()
      return Response.json({ ok: true, ...(await deps.server.start(apiKey, sudo.password)) })
    }
    case 'stop':
      return Response.json({ ok: true, ...(await deps.server.stop(sudo.password)) })
    case 'restart': {
      if ((await deps.server.status()).running) await deps.server.stop(sudo.password)
      // Parar olvida la contraseña guardada; se vuelve a guardar para el arranque.
      if (sudo.password) deps.sudo.remember(sudo.password)
      return Response.json({ ok: true, ...(await deps.server.start(apiKey, sudo.password)) })
    }
    case 'trust-cert':
      return sudo.missing ? missingPassword() : trustActiveCert(deps, sudo)
    case 'regenerate-cert':
      return Response.json({ ok: true, certPath: (await deps.cert.generate(true)).cert })
  }
}

/** El certificado leído y validado como PEM de un X.509; `Response` con el 400 si no lo es. */
function inspectPem(caPath: string): { subject: string; validTo: string } | Response {
  if (!fs.existsSync(caPath)) return errorResponse({ status: 400, message: `Upstream CA file not found: ${caPath}` })
  let pem: string
  try {
    pem = fs.readFileSync(caPath, 'utf8')
  } catch (err) {
    return errorResponse({ status: 400, message: `Unable to read upstream CA file: ${sanitizeErrorMessage(String(err))}` })
  }
  if (!pem.includes('-----BEGIN CERTIFICATE-----')) {
    return errorResponse({
      status: 400,
      message: 'File is not a PEM certificate (missing a -----BEGIN CERTIFICATE----- block).',
    })
  }
  try {
    const cert = new X509Certificate(pem)
    return { subject: cert.subject, validTo: cert.validTo }
  } catch (err) {
    return errorResponse({ status: 400, message: `Invalid certificate: ${sanitizeErrorMessage(String(err))}` })
  }
}

export function createAgentBridgePrivilegedRoutes(deps: AgentBridgePrivilegedDeps): ApiRoute[] {
  const { db } = deps
  const at = (route: string) => `${AGENT_BRIDGE_BASE}${route}`

  return [
    {
      method: 'POST',
      path: at('/server'),
      handler: async ({ request }) => {
        const body = await parseJsonBody(request, ServerBodySchema)
        return body.ok ? runServerAction(deps, body.data) : body.response
      },
    },
    {
      method: 'GET',
      path: at('/cert'),
      handler: async () => {
        const { certPath } = deps.cert.active()
        const exists = deps.cert.exists(certPath)
        const trusted = exists ? await deps.cert.trusted(certPath) : false
        return Response.json({ exists, trusted, path: exists ? certPath : null })
      },
    },
    {
      method: 'POST',
      path: at('/cert'),
      handler: async ({ request }) => {
        const body = await parseOptionalJsonBody(request, SudoBodySchema)
        if (!body.ok) return body.response
        const sudo = sudoFor(deps, body.data.sudoPassword)
        return sudo.missing ? missingPassword() : trustActiveCert(deps, sudo)
      },
    },
    {
      method: 'DELETE',
      path: at('/cert'),
      handler: async ({ request }) => {
        const body = await parseOptionalJsonBody(request, SudoBodySchema)
        if (!body.ok) return body.response
        const sudo = sudoFor(deps, body.data.sudoPassword)
        if (sudo.missing) return missingPassword()
        const { certPath } = deps.cert.active()
        // Sin certificado no hay nada que retirar: éxito idempotente.
        if (!deps.cert.exists(certPath)) return Response.json({ ok: true, trusted: false })
        await deps.cert.uninstall(sudo.password, certPath)
        sudo.rememberGiven()
        return Response.json({ ok: true, trusted: await deps.cert.trusted(certPath) })
      },
    },
    {
      method: 'POST',
      path: at('/cert/regenerate'),
      handler: async () => {
        const { cert, key } = await deps.cert.generate(true)
        return Response.json({ ok: true, certPath: cert, keyPath: key })
      },
    },
    {
      method: 'GET',
      path: at('/cert/download'),
      handler: () => {
        const { certPath } = deps.cert.active()
        if (!deps.cert.exists(certPath)) {
          return errorResponse({
            status: 404,
            message: `Certificate not found. Generate one first via POST ${AGENT_BRIDGE_BASE}/cert/regenerate`,
          })
        }
        const pem = deps.cert.read(certPath)
        return new Response(pem, {
          headers: {
            'Content-Type': 'application/x-pem-file',
            'Content-Disposition': `attachment; filename="${PRODUCT_NAME}-mitm.crt"`,
            'Content-Length': String(Buffer.byteLength(pem)),
          },
        })
      },
    },
    {
      method: 'POST',
      path: at('/agents/:id/dns'),
      handler: async ({ request, params }) => {
        const body = await parseJsonBody(request, DnsBodySchema)
        if (!body.ok) return body.response
        if (!isAgentId(params.id)) return errorResponse({ status: 404, message: `Unknown agent: ${params.id}` })
        const sudo = sudoFor(deps, body.data.sudoPassword)
        if (sudo.missing) return missingPassword()
        const { enabled } = body.data
        await (enabled ? deps.dns.add : deps.dns.remove)(sudo.password, params.id)
        sudo.rememberGiven()
        upsertAgentBridgeState(db, { agent_id: params.id, dns_enabled: enabled })
        return Response.json({ ok: true, dns_enabled: enabled })
      },
    },
    {
      method: 'POST',
      path: at('/agents/:id/reset'),
      handler: async ({ request, params }) => {
        const body = await parseJsonBody(request, SudoBodySchema)
        if (!body.ok) return body.response
        const agentId = params.id
        if (!isAgentId(agentId)) return errorResponse({ status: 404, message: `Unknown agent: ${agentId}` })
        const sudo = sudoFor(deps, body.data.sudoPassword)
        if (sudo.missing) return missingPassword()
        // No toca el servidor ni la CA: son de todos los agentes.
        await deps.dns.remove(sudo.password, agentId)
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
    {
      method: 'POST',
      path: at('/repair'),
      handler: async ({ request }) => {
        const body = await parseOptionalJsonBody(request, SudoBodySchema)
        if (!body.ok) return body.response
        const sudo = sudoFor(deps, body.data.sudoPassword)
        if (sudo.missing) return missingPassword()
        const { repaired } = await deps.repair(sudo.password)
        sudo.rememberGiven()
        return Response.json({ ok: true, repaired })
      },
    },
    {
      method: 'GET',
      path: at('/diagnose'),
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
          serverReachable: status.running ? await deps.probeTcp(port) : false,
          certExists,
          certTrusted: certExists ? await deps.cert.trusted(certPath) : false,
          dnsConfigured: agentId ? status.dnsConfigured : anyAgentDnsConfigured(db, deps.dns.configuredFor),
        })
        return Response.json({ ...report, port })
      },
    },
    {
      method: 'GET',
      path: at('/upstream-ca'),
      handler: () => Response.json({ path: deps.upstreamCa.active() }),
    },
    {
      method: 'POST',
      path: at('/upstream-ca'),
      handler: async ({ request }) => {
        const body = await parseJsonBody(request, AgentBridgeUpstreamCaPostSchema)
        if (!body.ok) return body.response
        const caPath = body.data.path
        if (!fs.existsSync(caPath)) {
          return errorResponse({ status: 400, message: `Upstream CA file not found: ${caPath}` })
        }
        deps.upstreamCa.store(caPath)
        try {
          deps.upstreamCa.configure(caPath)
        } catch (err) {
          return errorResponse({ status: 400, message: sanitizeErrorMessage(String(err)) })
        }
        return Response.json({ ok: true, path: caPath })
      },
    },
    {
      method: 'POST',
      path: at('/upstream-ca/test'),
      handler: async ({ request }) => {
        const body = await parseJsonBody(request, AgentBridgeUpstreamCaPostSchema)
        if (!body.ok) return body.response
        const inspected = inspectPem(body.data.path)
        if (inspected instanceof Response) return inspected
        return Response.json({ ok: true, path: body.data.path, ...inspected })
      },
    },
    {
      method: 'GET',
      path: at('/tproxy'),
      handler: () => Response.json(deps.tproxy.status()),
    },
    {
      method: 'POST',
      path: at('/tproxy'),
      handler: async ({ request }) => {
        const read = await readJsonBody(request)
        const parsed = StartTproxyBodySchema.safeParse(read.ok ? read.body : {})
        if (!parsed.success) {
          return errorResponse({ status: 400, type: 'invalid_request', message: 'Invalid TPROXY capture config' })
        }
        const { sudoPassword, ...cfg } = parsed.data
        return Response.json({ ok: true, status: await deps.tproxy.start(cfg, sudoPassword ?? '') })
      },
    },
    {
      method: 'DELETE',
      path: at('/tproxy'),
      handler: async () => Response.json({ ok: true, status: await deps.tproxy.stop() }),
    },
  ]
}
