/**
 * `POST /server`: arrancar, parar o reiniciar el servidor MITM, confiar en su
 * certificado o regenerarlo.
 *
 * Porte de `omniroute: src/app/api/tools/agent-bridge/server/route.ts` (MIT).
 */
import { z } from 'zod'

import { AgentBridgeServerActionSchema } from '../../../schemas/agentBridge.ts'
import { parseJsonBody } from '../../http.ts'
import type { ApiRoute } from '../../router.ts'
import { agentBridgePath } from './basePath.ts'
import { realCertStore, trustActiveCert, type CertStore } from './certStore.ts'
import { realMitmServerControl, type MitmServerControl } from './serverControl.ts'
import { missingPasswordResponse, realSudoAccess, sudoRequest, type SudoAccess } from '../sudoRequest.ts'

export interface ServerRouteDeps {
  platform: NodeJS.Platform
  sudo: SudoAccess
  server: MitmServerControl
  cert: CertStore
}

export const realServerRouteDeps: ServerRouteDeps = {
  platform: process.platform,
  sudo: realSudoAccess,
  server: realMitmServerControl,
  cert: realCertStore,
}

const ServerBodySchema = AgentBridgeServerActionSchema.extend({
  sudoPassword: z.string().optional(),
  // Sin clave, el servidor hijo hereda `THYROX_PROXY_API_KEYS`.
  apiKey: z.string().optional(),
})

async function runServerAction(deps: ServerRouteDeps, body: z.infer<typeof ServerBodySchema>): Promise<Response> {
  const sudo = sudoRequest(deps.sudo, deps.platform, body.sudoPassword)
  const apiKey = body.apiKey ?? ''
  switch (body.action) {
    case 'start':
      sudo.rememberGiven()
      return Response.json({ ok: true, ...(await deps.server.start(apiKey, sudo.password)) })
    case 'stop':
      return Response.json({ ok: true, ...(await deps.server.stop(sudo.password)) })
    case 'restart': {
      if ((await deps.server.status()).running) await deps.server.stop(sudo.password)
      // Parar olvida la contraseña guardada; se vuelve a guardar para el arranque.
      if (sudo.password) deps.sudo.remember(sudo.password)
      return Response.json({ ok: true, ...(await deps.server.start(apiKey, sudo.password)) })
    }
    case 'trust-cert':
      return sudo.missing ? missingPasswordResponse() : trustActiveCert(deps.cert, sudo)
    case 'regenerate-cert':
      // Sin forzar, un certificado existente se devolvería intacto.
      return Response.json({ ok: true, certPath: (await deps.cert.generate(true)).cert })
  }
}

export function createServerRoutes(deps: ServerRouteDeps): ApiRoute[] {
  return [
    {
      method: 'POST',
      path: agentBridgePath('/server'),
      handler: async ({ request }) => {
        const body = await parseJsonBody(request, ServerBodySchema)
        return body.ok ? runServerAction(deps, body.data) : body.response
      },
    },
  ]
}
