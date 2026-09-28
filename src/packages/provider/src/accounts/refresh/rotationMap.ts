/**
 * Las rotaciones recientes de refresh token. En un proveedor que rota, quien
 * llega con el token viejo después de que otro lo refrescara provocaría
 * `refresh_token_reused` y la revocación de toda la familia; durante un minuto
 * se le devuelve el resultado nuevo sin tocar el proveedor.
 *
 * Porte de `omniroute: open-sse/services/tokenRefresh/rotationMap.ts` (MIT).
 */
import { pbkdf2Sync } from 'node:crypto'

/** La sal de la clave: el refresh token nunca queda en claro como clave del mapa. */
const CACHE_KEY_SALT = 'thyrox-token-cache'
const CACHE_KEY_ITERATIONS = 1000
const CACHE_KEY_BYTES = 32
const ROTATION_TTL_MS = 60 * 1000

export interface RotatedTokens {
  accessToken: string
  refreshToken: string
  expiresIn?: number
  expiresAt?: string
}

export interface RotationEntry {
  result: RotatedTokens
  expiresAt: number
}

export function refreshCacheKey(provider: string, refreshToken: string): string {
  return `${provider}:${pbkdf2Sync(refreshToken, CACHE_KEY_SALT, CACHE_KEY_ITERATIONS, CACHE_KEY_BYTES, 'sha256').toString('hex')}`
}

export function createRotationMap(deps: { now?: () => number } = {}) {
  const now = deps.now ?? Date.now
  const rotations = new Map<string, RotationEntry>()

  function prune(): void {
    for (const [key, entry] of rotations) if (entry.expiresAt <= now()) rotations.delete(key)
  }

  function lookup(provider: string, refreshToken: string): RotationEntry | undefined {
    prune()
    return rotations.get(refreshCacheKey(provider, refreshToken))
  }

  /** Sólo una rotación de verdad: dos tokens distintos y no vacíos. */
  function record(provider: string, oldRefreshToken: string, result: RotatedTokens): void {
    if (!oldRefreshToken || !result.refreshToken || oldRefreshToken === result.refreshToken) return
    rotations.set(refreshCacheKey(provider, oldRefreshToken), { result, expiresAt: now() + ROTATION_TTL_MS })
  }

  return {
    lookup,
    record,
    size: () => {
      prune()
      return rotations.size
    },
    clear: () => rotations.clear(),
  }
}
