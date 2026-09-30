/**
 * Un paso privilegiado del MITM (confianza del certificado, DNS) que corre
 * sólo si la compuerta de sudo lo permite; si no, deja constancia y se salta.
 *
 * Porte de `omniroute: src/mitm/privilegedMitmStep.ts` (MIT); el registro va a
 * `logForDebugging` en vez del `createLogger` de la referencia.
 */
import { logForDebugging } from '@thyrox/local-observability/debug.js'

import { canRunPrivilegedMitmSteps } from './sudoGate.ts'

export async function runPrivilegedMitmStep(
  sudoPassword: string,
  skipLog: string,
  step: () => Promise<void>,
): Promise<void> {
  if (!canRunPrivilegedMitmSteps(sudoPassword)) {
    logForDebugging(`[mitm-manager] ${skipLog}`, { level: 'info' })
    return
  }
  await step()
}
