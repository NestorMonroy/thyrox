/**
 * La captura TPROXY con descifrado: su estado, arrancarla (reglas, socket
 * transparente y CA dinámica en el almacén) y pararla.
 *
 * Porte de `omniroute: src/app/api/tools/agent-bridge/tproxy/route.ts` (MIT).
 */
import { z } from 'zod'

import { installTproxyCa, uninstallTproxyCa } from '../../../tproxy/caTrust.ts'
import {
  getCaptureStatus,
  startCaptureMode,
  stopCaptureMode,
  type CaptureManagerStatus,
} from '../../../tproxy/captureManager.ts'
import type { TproxyConfig } from '../../../tproxy/commands.ts'
import { errorResponse, readJsonBody } from '../../http.ts'
import type { ApiRoute } from '../../router.ts'
import { agentBridgePath } from './basePath.ts'

export interface TproxyCapture {
  status(): CaptureManagerStatus
  start(cfg: TproxyConfig, password: string): Promise<CaptureManagerStatus>
  stop(): Promise<CaptureManagerStatus>
}

export const realTproxyCapture: TproxyCapture = {
  status: getCaptureStatus,
  start: (cfg, password) =>
    startCaptureMode({
      cfg,
      installCa: caPem => installTproxyCa(caPem, password),
      uninstallCa: () => uninstallTproxyCa(password),
    }),
  stop: stopCaptureMode,
}

export const StartTproxyBodySchema = z.object({
  dport: z.number().int().min(1).max(65535).default(443),
  mark: z.number().int().min(1).default(0x2333),
  onPort: z.number().int().min(1).max(65535).default(8443),
  routeTable: z.number().int().min(1).default(233),
  bypassMark: z.number().int().min(1).default(0x539),
  // Autoriza la instalación en el almacén de confianza; siendo root no se usa.
  sudoPassword: z.string().optional(),
})

export function createTproxyRoutes(tproxy: TproxyCapture): ApiRoute[] {
  return [
    {
      method: 'GET',
      path: agentBridgePath('/tproxy'),
      handler: () => Response.json(tproxy.status()),
    },
    {
      method: 'POST',
      path: agentBridgePath('/tproxy'),
      handler: async ({ request }) => {
        const read = await readJsonBody(request)
        const parsed = StartTproxyBodySchema.safeParse(read.ok ? read.body : {})
        if (!parsed.success) {
          return errorResponse({ status: 400, type: 'invalid_request', message: 'Invalid TPROXY capture config' })
        }
        const { sudoPassword, ...cfg } = parsed.data
        return Response.json({ ok: true, status: await tproxy.start(cfg, sudoPassword ?? '') })
      },
    },
    {
      method: 'DELETE',
      path: agentBridgePath('/tproxy'),
      handler: async () => Response.json({ ok: true, status: await tproxy.stop() }),
    },
  ]
}
