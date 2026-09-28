/**
 * El paso de retirada de DNS de `stopMitm`: primero los hosts por defecto y
 * luego todos los que el MITM gestiona. El listado de gestionados es de mejor
 * esfuerzo; un fallo al retirar los por defecto sí llega a quien llama.
 *
 * Porte de `omniroute: src/mitm/stopDnsTeardown.ts` (MIT); el registro va a
 * `logForDebugging`.
 */
import { errorMessage } from '@thyrox/local-observability/errorHelpers.js'
import { logForDebugging } from '@thyrox/local-observability/debug.js'

export type StopDnsDeps = {
  removeDNSEntry: (sudoPassword: string) => Promise<void>
  removeDNSEntries: (hosts: string[], sudoPassword: string) => Promise<void>
  collectManagedHosts: () => string[]
}

export async function removeStopDnsEntries(deps: StopDnsDeps, sudoPassword: string): Promise<void> {
  logForDebugging('[mitm-manager] Removing DNS entries...', { level: 'info' })
  await deps.removeDNSEntry(sudoPassword)
  try {
    const managed = deps.collectManagedHosts()
    if (managed.length > 0) await deps.removeDNSEntries(managed, sudoPassword)
  } catch (err) {
    logForDebugging(
      `[mitm-manager] Failed to remove managed DNS entries during stop (continuing): ${errorMessage(err)}`,
      { level: 'error' },
    )
  }
}
