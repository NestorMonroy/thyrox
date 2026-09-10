// Stub auto-generado — reemplazar con la implementación real.
// Puerto de `ccnmt: packages/server/src/lockfile.ts`: la propia FUENTE es
// este mismo stub.

export interface ServerLockInfo {
  pid: number
  port: number
  host: string
  httpUrl: string
  startedAt: number
}

export const writeServerLock: (info: ServerLockInfo) => Promise<void> = async () => {}
export const removeServerLock: () => Promise<void> = async () => {}
export const probeRunningServer: () => Promise<ServerLockInfo | null> = async () => null
