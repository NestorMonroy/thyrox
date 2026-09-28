/**
 * Las declaraciones de un JWT, sin verificar su firma: sirven para nombrar una
 * cuenta o leer una caducidad, nunca para autorizar.
 */
import type { JsonRecord } from './oauth/oauthFlows.ts'

const JWT_PARTS = 3

/** El cuerpo del token como objeto, o `null` si no es un JWT de tres partes con un objeto dentro. */
export function decodeJwtPayload(token: unknown): JsonRecord | null {
  if (typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== JWT_PARTS) return null
  try {
    const payload = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf8')) as unknown
    return payload && typeof payload === 'object' && !Array.isArray(payload) ? (payload as JsonRecord) : null
  } catch {
    return null
  }
}
