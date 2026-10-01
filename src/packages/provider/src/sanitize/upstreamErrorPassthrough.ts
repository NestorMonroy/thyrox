/**
 * Reenvío selectivo de un error 4xx del upstream tal cual.
 *
 * El cliente `claude-code` reconoce la redacción de ciertos errores del
 * upstream para desactivar una capacidad (`thinking`, `output_config`) el
 * resto de la conversación. Este camino conserva esa redacción y su forma
 * JSON, tras pasarla por el saneador recursivo. Los errores propios del proxy
 * no pasan por aquí: los construye el constructor de errores del proxy.
 *
 * Porte de `omniroute: open-sse/utils/upstreamErrorPassthrough.ts` (MIT).
 */
import {
  containsSensitiveErrorCredential,
  sanitizePassthroughUpstreamDetails,
} from './errorSanitization.ts'

const PASSTHROUGH_MIN = 400
const PASSTHROUGH_MAX = 499
// 401/403/407 rozan la autenticación: el eco del proveedor puede llevar
// nuestras credenciales, así que siguen saneados. 400/404/408/413/422/429
// traen la redacción de capacidad y cuota que el cliente necesita.
const EXCLUDED_STATUSES = new Set([401, 403, 407])
// Una traza o una ruta del árbol propio delata el interior del proxy. La
// referencia busca su propio árbol (`omniroute/`); aquí es el de thyrox.
const INTERNAL_LEAK_RE = /\sat\s\/|node_modules|thyrox\//i
// Algunos proveedores devuelven dentro de un 400/422/429 la petición que
// recibieron, cabecera `Authorization` o clave incluidas. Con un patrón de
// credencial en el cuerpo NO se reenvía, y quien llama cae al error propio.
// Refleja `redactSensitiveErrorText` de `errorSanitization.ts`.
const CREDENTIAL_LEAK_RE =
  /\b(?:Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{8,}|\bsk-[A-Za-z0-9._-]{8,}|(?:api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|cookie|secret)\\?["']?\s*[:=]\s*\\?["']?[^"'\\,\s}]{6,}/i

export function shouldPassthroughUpstreamError(statusCode: number, upstreamBody: unknown): boolean {
  if (statusCode < PASSTHROUGH_MIN || statusCode > PASSTHROUGH_MAX) return false
  if (EXCLUDED_STATUSES.has(statusCode)) return false
  if (!upstreamBody || typeof upstreamBody !== 'object') return false
  let text: string | undefined
  try {
    text = JSON.stringify(upstreamBody)
  } catch {
    // Sólo se reenvía un objeto que JSON serializa; uno cíclico, con BigInt o
    // con un `toJSON` hostil se rechaza.
    return false
  }
  if (typeof text !== 'string') return false
  if (INTERNAL_LEAK_RE.test(text)) return false
  if (CREDENTIAL_LEAK_RE.test(text) || containsSensitiveErrorCredential(text)) return false
  return true
}

export function buildPassthroughErrorResponse(
  statusCode: number,
  upstreamBody: unknown,
  headers?: Record<string, string>,
): Response | null {
  if (!shouldPassthroughUpstreamError(statusCode, upstreamBody)) return null
  try {
    const sanitizedBody = sanitizePassthroughUpstreamDetails(upstreamBody)
    const publicBody =
      sanitizedBody && typeof sanitizedBody === 'object'
        ? sanitizedBody
        : { error: { message: 'Upstream error' } }
    return new Response(JSON.stringify(publicBody), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json', ...(headers || {}) },
    })
  } catch {
    // Un proxy o un getter puede comportarse distinto entre la comprobación y la proyección.
    return null
  }
}
