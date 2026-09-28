/**
 * Los ajustes del MITM: el estado con sus destinos y estadísticas y la
 * descarga del certificado vigente, encender y apagar el servidor con la
 * compuerta de sudo, y regenerar el certificado sólo con el servidor parado.
 *
 * Porte de `omniroute: src/app/api/settings/mitm/route.ts` (MIT).
 */
import fs from 'node:fs'

import { PRODUCT_NAME } from '@thyrox/config/product'
import { z } from 'zod'

import { generateCert } from '../../../cert/generate.ts'
import { resolveMitmDataDir } from '../../../dataDir.ts'
import { activeCertPath } from '../../../manager.ts'
import { errorResponse, parseOptionalJsonBody } from '../../http.ts'
import type { ApiRoute } from '../../router.ts'
import { missingPasswordResponse, realSudoAccess, sudoRequest, type SudoAccess } from '../sudoRequest.ts'
import { MITM_PORT } from './port.ts'
import { realMitmServerLifecycle, type MitmServerLifecycle } from './serverLifecycle.ts'
import { missingKeyResponse, startKey, type KeyLookup } from './startKey.ts'
import { readStats } from './stats.ts'
import { settingsTargets } from './targets.ts'

export const MITM_SETTINGS_PATH = '/api/settings/mitm'

/** El certificado que se descarga y se regenera: el del modelo vigente. */
export interface SettingsCert {
  activePath(): string
  exists(certPath: string): boolean
  read(certPath: string): string
  regenerate(): Promise<void>
}

export interface SettingsRouteDeps {
  platform: NodeJS.Platform
  dataDir: () => string
  sudo: SudoAccess
  server: MitmServerLifecycle
  cert: SettingsCert
  lookupKeyById: KeyLookup
}

export const realSettingsCert: SettingsCert = {
  activePath: activeCertPath,
  exists: certPath => fs.existsSync(certPath),
  read: certPath => fs.readFileSync(certPath, 'utf8'),
  regenerate: async () => {
    await generateCert({ force: true })
  },
}

/** Sin almacén de claves todavía: un `keyId` no resuelve nunca. */
export const realSettingsRouteDeps: SettingsRouteDeps = {
  platform: process.platform,
  dataDir: resolveMitmDataDir,
  sudo: realSudoAccess,
  server: realMitmServerLifecycle,
  cert: realSettingsCert,
  lookupKeyById: async () => null,
}

const UpdateSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  apiKey: z.string().optional(),
  keyId: z.string().optional(),
  sudoPassword: z.string().optional(),
  port: z.coerce.number().int().min(1).max(65535).optional(),
})

const RegenerateSchema = z.object({ action: z.literal('regenerate-cert').optional() })

export function createSettingsRoutes(deps: SettingsRouteDeps): ApiRoute[] {
  const settingsView = async () => {
    const status = await deps.server.status()
    return {
      running: status.running,
      pid: status.pid,
      dnsConfigured: status.dnsConfigured,
      certExists: status.certExists,
      hasCachedPassword: deps.sudo.cached() !== null,
      port: MITM_PORT,
      targets: settingsTargets(),
      stats: readStats(deps.dataDir()),
    }
  }

  const certDownload = () => {
    const certPath = deps.cert.activePath()
    if (!deps.cert.exists(certPath)) return errorResponse({ status: 404, message: 'MITM certificate not found' })
    return new Response(deps.cert.read(certPath), {
      headers: {
        'Content-Type': 'application/x-pem-file',
        'Content-Disposition': `attachment; filename="${PRODUCT_NAME}-mitm-ca.crt"`,
      },
    })
  }

  return [
    {
      method: 'GET',
      path: MITM_SETTINGS_PATH,
      handler: async ({ url }) =>
        url.searchParams.get('download') === 'cert' ? certDownload() : Response.json(await settingsView()),
    },
    {
      method: 'PUT',
      path: MITM_SETTINGS_PATH,
      handler: async ({ request }) => {
        const body = await parseOptionalJsonBody(request, UpdateSettingsSchema)
        if (!body.ok) return body.response
        const { port, enabled } = body.data
        if (port !== undefined && port !== MITM_PORT) {
          return errorResponse({
            status: 400,
            message: `Transparent MITM interception requires port ${MITM_PORT} because DNS override does not redirect destination ports.`,
          })
        }
        if (enabled !== undefined) {
          const sudo = sudoRequest(deps.sudo, deps.platform, body.data.sudoPassword)
          if (sudo.missing) return missingPasswordResponse()
          if (enabled) {
            const apiKey = await startKey(deps.lookupKeyById, body.data.keyId, body.data.apiKey)
            if (apiKey === null) return missingKeyResponse()
            await deps.server.start(apiKey, sudo.password, { port: MITM_PORT })
          } else {
            await deps.server.stop(sudo.password)
          }
          sudo.rememberGiven()
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
  ]
}
