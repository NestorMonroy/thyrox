/**
 * Contrato público del daemon: el worker gestionado y el runtime que los
 * supervisa. Puerto fiel de `ccnmt: packages/daemon/src/contracts.ts`.
 */

export type DaemonWorker = {
  id: string
  kind: string
  stop(signal?: AbortSignal): Promise<void>
}

export type DaemonRuntime = {
  start(signal?: AbortSignal): Promise<void>
  stop(signal?: AbortSignal): Promise<void>
  listWorkers(): DaemonWorker[]
}
