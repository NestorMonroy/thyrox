/** Los destinos que muestran los ajustes: antigravity activado en 443 con todos sus hosts; kiro, declarado y apagado. */
import { ANTIGRAVITY_MITM_PROFILE } from '../../../targets/antigravity.ts'
import { KIRO_MITM_PROFILE } from '../../../targets/kiro.ts'
import { MITM_PORT } from './port.ts'

export function settingsTargets() {
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
