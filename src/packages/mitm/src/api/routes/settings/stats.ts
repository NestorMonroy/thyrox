/** Las estadísticas que escribe el servidor MITM en su directorio de datos. */
import fs from 'node:fs'
import path from 'node:path'

export interface MitmStats {
  startedAt: string | null
  totalRequests: number
  interceptedRequests: number
  activeConnections: number
  lastRequestAt: string | null
  lastInterceptAt: string | null
}

/** Sin archivo legible, todo en cero. */
export function readStats(dataDir: string): MitmStats {
  let raw: Record<string, unknown> = {}
  try {
    raw = JSON.parse(fs.readFileSync(path.join(dataDir, 'stats.json'), 'utf8')) as Record<string, unknown>
  } catch {
    // Sin estadísticas todavía.
  }
  const text = (value: unknown) => (typeof value === 'string' ? value : null)
  return {
    startedAt: text(raw.startedAt),
    totalRequests: Number(raw.totalRequests || 0),
    interceptedRequests: Number(raw.interceptedRequests || 0),
    activeConnections: Number(raw.activeConnections || 0),
    lastRequestAt: text(raw.lastRequestAt),
    lastInterceptAt: text(raw.lastInterceptAt),
  }
}
