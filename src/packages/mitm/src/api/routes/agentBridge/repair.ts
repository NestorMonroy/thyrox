/**
 * `POST /repair`: deshacer el estado del sistema que dejó un MITM caído
 * (entradas de DNS, CA, proxy del sistema). Repetirlo no hace daño.
 *
 * Porte de `omniroute: src/app/api/tools/agent-bridge/repair/route.ts` (MIT).
 */
import { repairMitm } from '../../../manager.ts'
import { parseOptionalJsonBody } from '../../http.ts'
import type { ApiRoute } from '../../router.ts'
import { agentBridgePath } from './basePath.ts'
import { missingPasswordResponse, realSudoAccess, sudoRequest, SudoBodySchema, type SudoAccess } from '../sudoRequest.ts'

export interface RepairRouteDeps {
  platform: NodeJS.Platform
  sudo: SudoAccess
  repair(password: string): Promise<{ repaired: string[] }>
}

export const realRepairRouteDeps: RepairRouteDeps = {
  platform: process.platform,
  sudo: realSudoAccess,
  repair: password => repairMitm(password),
}

export function createRepairRoutes(deps: RepairRouteDeps): ApiRoute[] {
  return [
    {
      method: 'POST',
      path: agentBridgePath('/repair'),
      handler: async ({ request }) => {
        const body = await parseOptionalJsonBody(request, SudoBodySchema)
        if (!body.ok) return body.response
        const sudo = sudoRequest(deps.sudo, deps.platform, body.data.sudoPassword)
        if (sudo.missing) return missingPasswordResponse()
        const { repaired } = await deps.repair(sudo.password)
        sudo.rememberGiven()
        return Response.json({ ok: true, repaired })
      },
    },
  ]
}
