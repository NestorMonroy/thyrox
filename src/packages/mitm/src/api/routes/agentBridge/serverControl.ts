/** Arrancar, parar y consultar el servidor MITM. */
import { getMitmStatus, startMitm, stopMitm, type MitmStatus } from '../../../manager.ts'

export interface MitmServerControl {
  start(apiKey: string, password: string): Promise<object>
  stop(password: string): Promise<object>
  status(agentId?: string): Promise<MitmStatus>
}

export const realMitmServerControl: MitmServerControl = {
  start: (apiKey, password) => startMitm(apiKey, password),
  stop: password => stopMitm(password),
  status: agentId => getMitmStatus(agentId),
}
