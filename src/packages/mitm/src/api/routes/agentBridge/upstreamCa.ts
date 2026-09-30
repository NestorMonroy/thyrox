/**
 * La CA del upstream: cuál está vigente, guardar y activar una nueva, y
 * probar un archivo sin guardarlo.
 *
 * Porte de `omniroute: src/app/api/tools/agent-bridge/upstream-ca/{,test/}route.ts` (MIT).
 */
import { X509Certificate } from 'node:crypto'
import fs from 'node:fs'

import { sanitizeErrorMessage } from '@thyrox/provider/sanitize/errorSanitization'

import { resolveUpstreamCaPath, writeStoredUpstreamCaPath } from '../../../manager.ts'
import { AgentBridgeUpstreamCaPostSchema } from '../../../schemas/agentBridge.ts'
import { configureUpstreamCa } from '../../../upstreamTrust.ts'
import { errorResponse, parseJsonBody } from '../../http.ts'
import type { ApiRoute } from '../../router.ts'
import { agentBridgePath } from './basePath.ts'

export interface UpstreamCaStore {
  /** La vigente: la variable de entorno gana a la guardada. */
  active(): string | null
  store(caPath: string): void
  configure(caPath: string): void
}

export const realUpstreamCaStore: UpstreamCaStore = {
  active: () => resolveUpstreamCaPath(),
  store: writeStoredUpstreamCaPath,
  configure: caPath => configureUpstreamCa(caPath),
}

function missingFile(caPath: string): Response {
  return errorResponse({ status: 400, message: `Upstream CA file not found: ${caPath}` })
}

/** El sujeto y la caducidad del X.509 del archivo, o el 400 que explica por qué no lo es. */
function inspectPem(caPath: string): { subject: string; validTo: string } | Response {
  if (!fs.existsSync(caPath)) return missingFile(caPath)
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

export function createUpstreamCaRoutes(upstreamCa: UpstreamCaStore): ApiRoute[] {
  return [
    {
      method: 'GET',
      path: agentBridgePath('/upstream-ca'),
      handler: () => Response.json({ path: upstreamCa.active() }),
    },
    {
      method: 'POST',
      path: agentBridgePath('/upstream-ca'),
      handler: async ({ request }) => {
        const body = await parseJsonBody(request, AgentBridgeUpstreamCaPostSchema)
        if (!body.ok) return body.response
        const caPath = body.data.path
        if (!fs.existsSync(caPath)) return missingFile(caPath)
        upstreamCa.store(caPath)
        // Se activa en el acto, sin reiniciar; una CA que no carga es un error del cliente.
        try {
          upstreamCa.configure(caPath)
        } catch (err) {
          return errorResponse({ status: 400, message: sanitizeErrorMessage(String(err)) })
        }
        return Response.json({ ok: true, path: caPath })
      },
    },
    {
      method: 'POST',
      path: agentBridgePath('/upstream-ca/test'),
      handler: async ({ request }) => {
        const body = await parseJsonBody(request, AgentBridgeUpstreamCaPostSchema)
        if (!body.ok) return body.response
        const inspected = inspectPem(body.data.path)
        if (inspected instanceof Response) return inspected
        return Response.json({ ok: true, path: body.data.path, ...inspected })
      },
    },
  ]
}
