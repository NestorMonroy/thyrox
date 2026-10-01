/** Arrancar, parar y consultar el servidor MITM en un puerto dado. */
import { getMitmStatus, startMitm, stopMitm, type MitmStatus } from '../../../manager.ts'

export interface MitmServerLifecycle {
  start(apiKey: string, password: string, options: { port: number }): Promise<{ running: boolean; pid: number | null }>
  stop(password: string): Promise<object>
  status(): Promise<MitmStatus>
}

export const realMitmServerLifecycle: MitmServerLifecycle = {
  start: (apiKey, password, options) => startMitm(apiKey, password, options),
  stop: password => stopMitm(password),
  status: () => getMitmStatus(),
}
