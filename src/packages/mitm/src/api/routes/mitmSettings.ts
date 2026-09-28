/**
 * Los ajustes del MITM y la superficie de CLI de antigravity: el estado con
 * sus destinos y estadísticas, encender y apagar el servidor, regenerar el
 * certificado con el servidor parado, y los alias por herramienta con su
 * esfuerzo de razonamiento. El gestor, el certificado y la búsqueda de claves
 * se inyectan.
 *
 * Porte de `omniroute: src/app/api/settings/mitm/route.ts` y
 * `src/app/api/cli-tools/antigravity-mitm/{,alias/}route.ts` (MIT).
 * Divergencias declaradas:
 *
 * - La autorización de gestión y la de CLI son aquí la guarda de loopback de
 *   la API: no hay sesión de interfaz que comprobar.
 * - La contraseña de sudo pasa por la misma compuerta que el resto de rutas
 *   (Windows, root, NOPASSWD); `settings/mitm` de la referencia la exigía
 *   siempre fuera de Windows y root.
 * - La clave del servidor es opcional: sin ninguna, el hijo hereda
 *   `THYROX_PROXY_API_KEYS`. Un `keyId` que no resuelve, sin clave dada, sí
 *   es un 400.
 * - El puerto es siempre 443 y no se escribe `settings.json`: la referencia
 *   lo escribía sólo con ese mismo puerto y lo ignoraba al leer.
 * - Regenerar fuerza un certificado nuevo en vez de borrar los dos archivos y
 *   generar: mismo efecto, sin la ventana sin certificado.
 * - Los alias sólo se guardan para un agente de `MITM_AGENT_IDS`.
 * - El certificado que se descarga es el del modelo vigente, no un
 *   `server.crt` fijo.
 */
import type { Database } from 'bun:sqlite'
import fs from 'node:fs'
import path from 'node:path'

import { PRODUCT_NAME } from '@thyrox/config/product'
import { z } from 'zod'

import { hasInvalidReasoningEffort, normalizeAliasMappings } from '../../aliasConfig.ts'
import { generateCert } from '../../cert/generate.ts'
import { resolveMitmDataDir } from '../../dataDir.ts'
import { isSudoPasswordRequired } from '../../dns/dnsConfig.ts'
import {
  activeCertPath,
  getCachedPassword,
  getMitmStatus,
  setCachedPassword,
  startMitm,
  stopMitm,
  type MitmStatus,
} from '../../manager.ts'
import { cliMitmStartSchema, cliMitmStopSchema, resolveStartApiKey } from '../../schemas/cli.ts'
import { getAllMitmAliases, getMitmAlias, setMitmAliasAll } from '../../state/mitmAlias.ts'
import { isMitmSudoPasswordRequired, normalizeMitmSudoPasswordInput, resolveMitmSudoPassword } from '../../sudoGate.ts'
import { ANTIGRAVITY_MITM_PROFILE } from '../../targets/antigravity.ts'
import { KIRO_MITM_PROFILE } from '../../targets/kiro.ts'
import { MITM_AGENT_IDS } from '../../types.ts'
import { errorResponse, parseJsonBody, parseOptionalJsonBody } from '../http.ts'
import type { ApiRoute } from '../router.ts'

export const MITM_SETTINGS_PATH = '/api/settings/mitm'
export const ANTIGRAVITY_MITM_BASE = '/api/cli-tools/antigravity-mitm'

/** La interceptación transparente exige 443: el DNS no redirige puertos. */
const MITM_PORT = 443

export interface MitmSettingsDeps {
  db: Database
  platform: NodeJS.Platform
  dataDir: () => string
  sudo: {
    cached(): string | null
    remember(password: string): void
    required(password: string): boolean
  }
  server: {
    start(apiKey: string, password: string, options: { port: number }): Promise<{ running: boolean; pid: number | null }>
    stop(password: string): Promise<object>
    status(): Promise<MitmStatus>
  }
  cert: {
    activePath(): string
    exists(certPath: string): boolean
    read(certPath: string): string
    regenerate(): Promise<void>
  }
  lookupKeyById: (id: string) => Promise<string | null>
  /** Si el sistema pedirá contraseña para elevar, sin mirar la guardada. */
  sudoPasswordRequired: () => boolean
}

/** El gestor real, el certificado del modelo vigente y ningún almacén de claves. */
export function defaultMitmSettingsDeps(db: Database): MitmSettingsDeps {
  return {
    db,
    platform: process.platform,
    dataDir: resolveMitmDataDir,
    sudo: { cached: getCachedPassword, remember: setCachedPassword, required: isMitmSudoPasswordRequired },
    server: {
      start: (apiKey, password, options) => startMitm(apiKey, password, options),
      stop: password => stopMitm(password),
      status: () => getMitmStatus(),
    },
    cert: {
      activePath: activeCertPath,
      exists: certPath => fs.existsSync(certPath),
      read: certPath => fs.readFileSync(certPath, 'utf8'),
      regenerate: async () => {
        await generateCert({ force: true })
      },
    },
    lookupKeyById: async () => null,
    sudoPasswordRequired: isSudoPasswordRequired,
  }
}

const UpdateSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  apiKey: z.string().optional(),
  keyId: z.string().optional(),
  sudoPassword: z.string().optional(),
  port: z.coerce.number().int().min(1).max(65535).optional(),
})

const RegenerateSchema = z.object({ action: z.literal('regenerate-cert').optional() })

const AliasEntrySchema = z.object({ model: z.string().optional(), reasoningEffort: z.string().optional() })

const AliasUpdateSchema = z.object({
  tool: z.string().trim().min(1),
  mappings: z.record(z.string(), z.union([z.string(), AliasEntrySchema]).optional()),
})

const AGENT_IDS: ReadonlySet<string> = new Set(MITM_AGENT_IDS)

export interface MitmStats {
  startedAt: string | null
  totalRequests: number
  interceptedRequests: number
  activeConnections: number
  lastRequestAt: string | null
  lastInterceptAt: string | null
}

/** Las estadísticas que escribe el servidor MITM; sin archivo legible, en cero. */
function readStats(dataDir: string): MitmStats {
  let raw: Record<string, unknown> = {}
  try {
    raw = JSON.parse(fs.readFileSync(path.join(dataDir, 'stats.json'), 'utf8')) as Record<string, unknown>
  } catch {
    // Sin estadísticas todavía.
  }
  const text = (value: unknown) => (typeof value === 'string' ? value : null)
  return {
    startedAt: text(raw.startedAt),
    totalRequests: Number(raw.totalRequests || 0),
    interceptedRequests: Number(raw.interceptedRequests || 0),
    activeConnections: Number(raw.activeConnections || 0),
    lastRequestAt: text(raw.lastRequestAt),
    lastInterceptAt: text(raw.lastInterceptAt),
  }
}

/** Antigravity activado en 443 con todos sus hosts; kiro, declarado y apagado. */
function defaultTargets() {
  const antigravity = ANTIGRAVITY_MITM_PROFILE
  return [
    {
      id: antigravity.id,
      name: antigravity.name,
      targetHost: [antigravity.targetHost, ...antigravity.additionalHosts].join(', '),
      targetPort: antigravity.targetPort,
      localPort: MITM_PORT,
      endpoints: antigravity.apiEndpoints,
      enabled: true,
    },
    {
      id: KIRO_MITM_PROFILE.id,
      name: KIRO_MITM_PROFILE.name,
      targetHost: KIRO_MITM_PROFILE.targetHost,
      targetPort: KIRO_MITM_PROFILE.targetPort,
      localPort: KIRO_MITM_PROFILE.localPort,
      endpoints: KIRO_MITM_PROFILE.apiEndpoints,
      enabled: false,
    },
  ]
}

export function createMitmSettingsRoutes(deps: MitmSettingsDeps): ApiRoute[] {
  const isWin = () => deps.platform === 'win32'

  const settingsView = async () => {
    const status = await deps.server.status()
    return {
      running: status.running,
      pid: status.pid,
      dnsConfigured: status.dnsConfigured,
      certExists: status.certExists,
      hasCachedPassword: deps.sudo.cached() !== null,
      port: MITM_PORT,
      targets: defaultTargets(),
      stats: readStats(deps.dataDir()),
    }
  }

  /** La clave del arranque; `null` sólo cuando se pidió una que no existe. */
  const startKey = async (keyId?: string | null, apiKey?: string | null): Promise<string | null> => {
    const key = await resolveStartApiKey(keyId, apiKey, deps.lookupKeyById)
    if (key) return key
    return keyId ? null : ''
  }

  const missingKey = () =>
    errorResponse({ status: 400, message: 'Missing apiKey: provide a valid apiKey or a resolvable keyId' })
  const missingPassword = () => errorResponse({ status: 400, message: 'Missing sudoPassword' })

  /** Recuerda la contraseña dada tras un éxito, nunca en Windows. */
  const rememberGiven = (supplied: string | undefined) => {
    const given = normalizeMitmSudoPasswordInput(supplied)
    if (!isWin() && given) deps.sudo.remember(given)
  }

  return [
    {
      method: 'GET',
      path: MITM_SETTINGS_PATH,
      handler: async ({ url }) => {
        if (url.searchParams.get('download') !== 'cert') return Response.json(await settingsView())
        const certPath = deps.cert.activePath()
        if (!deps.cert.exists(certPath)) return errorResponse({ status: 404, message: 'MITM certificate not found' })
        return new Response(deps.cert.read(certPath), {
          headers: {
            'Content-Type': 'application/x-pem-file',
            'Content-Disposition': `attachment; filename="${PRODUCT_NAME}-mitm-ca.crt"`,
          },
        })
      },
    },
    {
      method: 'PUT',
      path: MITM_SETTINGS_PATH,
      handler: async ({ request }) => {
        const body = await parseOptionalJsonBody(request, UpdateSettingsSchema)
        if (!body.ok) return body.response
        const { port, enabled, sudoPassword } = body.data
        if (port !== undefined && port !== MITM_PORT) {
          return errorResponse({
            status: 400,
            message: `Transparent MITM interception requires port ${MITM_PORT} because DNS override does not redirect destination ports.`,
          })
        }
        if (enabled !== undefined) {
          const password = resolveMitmSudoPassword(sudoPassword, deps.sudo.cached())
          if (deps.sudo.required(password)) return missingPassword()
          if (enabled) {
            const apiKey = await startKey(body.data.keyId, body.data.apiKey)
            if (apiKey === null) return missingKey()
            await deps.server.start(apiKey, password, { port: MITM_PORT })
          } else {
            await deps.server.stop(password)
          }
          rememberGiven(sudoPassword)
        }
        return Response.json(await settingsView())
      },
    },
    {
      method: 'POST',
      path: MITM_SETTINGS_PATH,
      handler: async ({ request }) => {
        const body = await parseOptionalJsonBody(request, RegenerateSchema)
        if (!body.ok) return body.response
        if ((await deps.server.status()).running) {
          return errorResponse({ status: 409, message: 'Stop the MITM proxy before regenerating certificates' })
        }
        await deps.cert.regenerate()
        return Response.json(await settingsView())
      },
    },
    {
      method: 'GET',
      path: ANTIGRAVITY_MITM_BASE,
      handler: async () => {
        const status = await deps.server.status()
        const hasCachedPassword = deps.sudo.cached() !== null
        return Response.json({
          running: status.running,
          pid: status.pid,
          dnsConfigured: status.dnsConfigured,
          certExists: status.certExists,
          hasCachedPassword,
          isWin: isWin(),
          needsSudoPassword: !isWin() && !hasCachedPassword && deps.sudoPasswordRequired(),
        })
      },
    },
    {
      method: 'POST',
      path: ANTIGRAVITY_MITM_BASE,
      handler: async ({ request }) => {
        const body = await parseJsonBody(request, cliMitmStartSchema)
        if (!body.ok) return body.response
        const apiKey = await startKey(body.data.keyId, body.data.apiKey)
        if (apiKey === null) return missingKey()
        const password = resolveMitmSudoPassword(body.data.sudoPassword, deps.sudo.cached())
        if (deps.sudo.required(password)) return missingPassword()
        const result = await deps.server.start(apiKey, password, { port: MITM_PORT })
        rememberGiven(body.data.sudoPassword)
        return Response.json({ success: true, running: result.running, pid: result.pid })
      },
    },
    {
      method: 'DELETE',
      path: ANTIGRAVITY_MITM_BASE,
      handler: async ({ request }) => {
        const body = await parseOptionalJsonBody(request, cliMitmStopSchema)
        if (!body.ok) return body.response
        const password = resolveMitmSudoPassword(body.data.sudoPassword, deps.sudo.cached())
        if (deps.sudo.required(password)) return missingPassword()
        await deps.server.stop(password)
        rememberGiven(body.data.sudoPassword)
        return Response.json({ success: true, running: false })
      },
    },
    {
      method: 'GET',
      path: `${ANTIGRAVITY_MITM_BASE}/alias`,
      handler: ({ url }) => {
        const tool = url.searchParams.get('tool')
        // Sólo la vista de una herramienta tiene la forma plana que se normaliza.
        return Response.json({
          aliases: tool ? normalizeAliasMappings(getMitmAlias(deps.db, tool)) : getAllMitmAliases(deps.db),
        })
      },
    },
    {
      method: 'PUT',
      path: `${ANTIGRAVITY_MITM_BASE}/alias`,
      handler: async ({ request }) => {
        const body = await parseJsonBody(request, AliasUpdateSchema)
        if (!body.ok) return body.response
        const { tool, mappings } = body.data
        if (!AGENT_IDS.has(tool)) return errorResponse({ status: 404, message: `Unknown agent: ${tool}` })
        if (hasInvalidReasoningEffort(mappings)) return errorResponse({ status: 400, message: 'Invalid reasoning effort' })
        const aliases = normalizeAliasMappings(mappings)
        setMitmAliasAll(deps.db, tool, aliases)
        return Response.json({ success: true, aliases })
      },
    },
  ]
}
