/**
 * Puerto de `ccnmt: packages/server/src/types.ts`.
 * `lazySchema` — ver `internal/pendingCrossPackageDeps.ts`.
 */
import type { ChildProcess } from 'child_process'
import { z } from 'zod/v4'
import { lazySchema } from './internal/pendingCrossPackageDeps.js'

export const connectResponseSchema = lazySchema(() =>
  z.object({
    session_id: z.string(),
    ws_url: z.string(),
    work_dir: z.string().optional(),
  }),
)

export type ServerConfig = {
  port: number
  host: string
  authToken: string
  unix?: string
  /** Timeout de inactividad para sesiones desprendidas (ms). 0 = nunca expira. */
  idleTimeoutMs?: number
  /** Máximo de sesiones concurrentes. */
  maxSessions?: number
  /** Directorio de workspace por defecto para sesiones sin cwd propio. */
  workspace?: string
}

export type SessionState =
  | 'starting'
  | 'running'
  | 'detached'
  | 'stopping'
  | 'stopped'

export type SessionInfo = {
  id: string
  status: SessionState
  createdAt: number
  workDir: string
  process: ChildProcess | null
  sessionKey?: string
}

/**
 * Llave estable de sesión → metadata. Se persiste en
 * ~/.claude/server-sessions.json para poder reanudar sesiones entre
 * reinicios del servidor.
 */
export type SessionIndexEntry = {
  /** ID de sesión asignado por el servidor (coincide con la sesión claude del subproceso). */
  sessionId: string
  /** El ID de sesión del transcript de claude para --resume. Igual a sessionId en sesiones directas. */
  transcriptSessionId: string
  cwd: string
  permissionMode?: string
  createdAt: number
  lastActiveAt: number
}

export type SessionIndex = Record<string, SessionIndexEntry>
