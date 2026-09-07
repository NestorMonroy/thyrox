// Superficie pública de integración del daemon.
// Puerto fiel de `ccnmt: packages/daemon/src/index.ts`.
export * from './contracts.js'
export * from './errors.js'

import type { DaemonRuntime } from './contracts.js'

export function createDaemonRuntime(): DaemonRuntime {
  const workers: Array<{
    id: string
    kind: string
    stop(signal?: AbortSignal): Promise<void>
  }> = []
  return {
    async start(_signal?: AbortSignal) {},
    async stop(signal?: AbortSignal) {
      for (const worker of workers) {
        await worker.stop(signal)
      }
    },
    listWorkers: () => [...workers],
  }
}
