/**
 * La superficie de CLI de antigravity: su estado, con si hará falta pedir la
 * contraseña de sudo, y arrancar y parar el servidor MITM en 443.
 *
 * Porte de `omniroute: src/app/api/cli-tools/antigravity-mitm/route.ts` (MIT).
 */
import { isSudoPasswordRequired } from '../../../dns/dnsConfig.ts'
import { cliMitmStartSchema, cliMitmStopSchema } from '../../../schemas/cli.ts'
import { parseJsonBody, parseOptionalJsonBody } from '../../http.ts'
import type { ApiRoute } from '../../router.ts'
import { missingPasswordResponse, realSudoAccess, sudoRequest, type SudoAccess } from '../sudoRequest.ts'
import { MITM_PORT } from './port.ts'
import { realMitmServerLifecycle, type MitmServerLifecycle } from './serverLifecycle.ts'
import { missingKeyResponse, startKey, type KeyLookup } from './startKey.ts'

export const ANTIGRAVITY_MITM_BASE = '/api/cli-tools/antigravity-mitm'

export interface AntigravityCliRouteDeps {
  platform: NodeJS.Platform
  sudo: SudoAccess
  server: MitmServerLifecycle
  lookupKeyById: KeyLookup
  /** Si el sistema pedirá contraseña para elevar, sin mirar la guardada. */
  sudoPasswordRequired: () => boolean
}

/** Sin almacén de claves todavía: un `keyId` no resuelve nunca. */
export const realAntigravityCliRouteDeps: AntigravityCliRouteDeps = {
  platform: process.platform,
  sudo: realSudoAccess,
  server: realMitmServerLifecycle,
  lookupKeyById: async () => null,
  sudoPasswordRequired: isSudoPasswordRequired,
}

export function createAntigravityCliRoutes(deps: AntigravityCliRouteDeps): ApiRoute[] {
  const isWin = deps.platform === 'win32'

  return [
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
          isWin,
          needsSudoPassword: !isWin && !hasCachedPassword && deps.sudoPasswordRequired(),
        })
      },
    },
    {
      method: 'POST',
      path: ANTIGRAVITY_MITM_BASE,
      handler: async ({ request }) => {
        const body = await parseJsonBody(request, cliMitmStartSchema)
        if (!body.ok) return body.response
        const apiKey = await startKey(deps.lookupKeyById, body.data.keyId, body.data.apiKey)
        if (apiKey === null) return missingKeyResponse()
        const sudo = sudoRequest(deps.sudo, deps.platform, body.data.sudoPassword)
        if (sudo.missing) return missingPasswordResponse()
        const result = await deps.server.start(apiKey, sudo.password, { port: MITM_PORT })
        sudo.rememberGiven()
        return Response.json({ success: true, running: result.running, pid: result.pid })
      },
    },
    {
      method: 'DELETE',
      path: ANTIGRAVITY_MITM_BASE,
      handler: async ({ request }) => {
        const body = await parseOptionalJsonBody(request, cliMitmStopSchema)
        if (!body.ok) return body.response
        const sudo = sudoRequest(deps.sudo, deps.platform, body.data.sudoPassword)
        if (sudo.missing) return missingPasswordResponse()
        await deps.server.stop(sudo.password)
        sudo.rememberGiven()
        return Response.json({ success: true, running: false })
      },
    },
  ]
}
