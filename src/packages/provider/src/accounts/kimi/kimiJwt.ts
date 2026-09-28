/**
 * La caducidad de un token de Kimi web, leída de su JWT sin verificar la
 * firma: sirve para decidir cuándo renovarlo, nunca para autorizar.
 *
 * Porte de `omniroute: open-sse/utils/kimiJwt.ts` (MIT).
 */
import { decodeJwtPayload } from '../jwtPayload.ts'

/** Por defecto, un token está por caducar cuando le quedan cuatro minutos. */
const DEFAULT_THRESHOLD_SEC = 240

export interface KimiTokenExpiration {
  expiresAtSec: number
  issuedAtSec: number
  remainingSec: number
  isExpired: boolean
}

export function kimiTokenExpiration(token: unknown, nowMs = Date.now()): KimiTokenExpiration | null {
  const payload = decodeJwtPayload(typeof token === 'string' ? token.trim() : token)
  if (!payload || typeof payload.exp !== 'number') return null
  const remainingSec = payload.exp - Math.floor(nowMs / 1000)
  return {
    expiresAtSec: payload.exp,
    issuedAtSec: typeof payload.iat === 'number' ? payload.iat : 0,
    remainingSec,
    isExpired: remainingSec <= 0,
  }
}

/** Un token sin caducidad legible nunca se da por caducado. */
export function isKimiTokenExpiringSoon(token: unknown, thresholdSec = DEFAULT_THRESHOLD_SEC, nowMs = Date.now()): boolean {
  const expiration = kimiTokenExpiration(token, nowMs)
  return expiration !== null && expiration.remainingSec <= thresholdSec
}
