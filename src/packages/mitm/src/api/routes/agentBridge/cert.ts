/**
 * El certificado del MITM: su estado, confiar en él y retirarlo, regenerarlo
 * y descargarlo. Siempre el del modelo vigente (la CA o la hoja).
 *
 * Porte de `omniroute: src/app/api/tools/agent-bridge/{cert,cert/regenerate,
 * cert/download}/route.ts` (MIT).
 */
import { PRODUCT_NAME } from '@thyrox/config/product'

import { errorResponse, parseOptionalJsonBody } from '../../http.ts'
import type { ApiRoute } from '../../router.ts'
import { AGENT_BRIDGE_BASE, agentBridgePath } from './basePath.ts'
import { realCertStore, trustActiveCert, type CertStore } from './certStore.ts'
import { missingPasswordResponse, realSudoAccess, sudoRequest, SudoBodySchema, type SudoAccess } from '../sudoRequest.ts'

export interface CertRouteDeps {
  platform: NodeJS.Platform
  sudo: SudoAccess
  cert: CertStore
}

export const realCertRouteDeps: CertRouteDeps = {
  platform: process.platform,
  sudo: realSudoAccess,
  cert: realCertStore,
}

export function createCertRoutes(deps: CertRouteDeps): ApiRoute[] {
  const { cert } = deps
  return [
    {
      method: 'GET',
      path: agentBridgePath('/cert'),
      handler: async () => {
        const { certPath } = cert.active()
        const exists = cert.exists(certPath)
        const trusted = exists ? await cert.trusted(certPath) : false
        return Response.json({ exists, trusted, path: exists ? certPath : null })
      },
    },
    {
      method: 'POST',
      path: agentBridgePath('/cert'),
      handler: async ({ request }) => {
        const body = await parseOptionalJsonBody(request, SudoBodySchema)
        if (!body.ok) return body.response
        const sudo = sudoRequest(deps.sudo, deps.platform, body.data.sudoPassword)
        return sudo.missing ? missingPasswordResponse() : trustActiveCert(cert, sudo)
      },
    },
    {
      method: 'DELETE',
      path: agentBridgePath('/cert'),
      handler: async ({ request }) => {
        const body = await parseOptionalJsonBody(request, SudoBodySchema)
        if (!body.ok) return body.response
        const sudo = sudoRequest(deps.sudo, deps.platform, body.data.sudoPassword)
        if (sudo.missing) return missingPasswordResponse()
        const { certPath } = cert.active()
        // Sin certificado no hay nada que retirar: éxito idempotente.
        if (!cert.exists(certPath)) return Response.json({ ok: true, trusted: false })
        await cert.uninstall(sudo.password, certPath)
        sudo.rememberGiven()
        return Response.json({ ok: true, trusted: await cert.trusted(certPath) })
      },
    },
    {
      method: 'POST',
      path: agentBridgePath('/cert/regenerate'),
      handler: async () => {
        const { cert: certPath, key } = await cert.generate(true)
        return Response.json({ ok: true, certPath, keyPath: key })
      },
    },
    {
      method: 'GET',
      path: agentBridgePath('/cert/download'),
      handler: () => {
        const { certPath } = cert.active()
        if (!cert.exists(certPath)) {
          return errorResponse({
            status: 404,
            message: `Certificate not found. Generate one first via POST ${AGENT_BRIDGE_BASE}/cert/regenerate`,
          })
        }
        const pem = cert.read(certPath)
        return new Response(pem, {
          headers: {
            'Content-Type': 'application/x-pem-file',
            'Content-Disposition': `attachment; filename="${PRODUCT_NAME}-mitm.crt"`,
            'Content-Length': String(Buffer.byteLength(pem)),
          },
        })
      },
    },
  ]
}
