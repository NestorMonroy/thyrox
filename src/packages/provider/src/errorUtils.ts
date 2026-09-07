/**
 * Porte fiel de `ccnmt: packages/provider/src/errorUtils.ts` (paquete
 * `provider`, licencia UNLICENSED — reimplementación, no copia). Porte
 * COMPLETO — sin divergencias: su único import es `@anthropic-ai/sdk`
 * (type-only, se borra al transpilar); cero dependencias cruzadas de
 * paquete. Los mensajes de error se conservan en inglés (son texto que
 * el usuario final ve — comportamiento observable, no comentario).
 */
import type { APIError } from '@anthropic-ai/sdk'

// Códigos de error SSL/TLS de OpenSSL (los usan tanto Node.js como Bun).
const SSL_ERROR_CODES = new Set([
  // Errores de verificación de certificado
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'UNABLE_TO_GET_ISSUER_CERT',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  'CERT_SIGNATURE_FAILURE',
  'CERT_NOT_YET_VALID',
  'CERT_HAS_EXPIRED',
  'CERT_REVOKED',
  'CERT_REJECTED',
  'CERT_UNTRUSTED',
  // Errores de certificado autofirmado
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'SELF_SIGNED_CERT_IN_CHAIN',
  // Errores de cadena
  'CERT_CHAIN_TOO_LONG',
  'PATH_LENGTH_EXCEEDED',
  // Errores de hostname/altname
  'ERR_TLS_CERT_ALTNAME_INVALID',
  'HOSTNAME_MISMATCH',
  // Errores de handshake TLS
  'ERR_TLS_HANDSHAKE_TIMEOUT',
  'ERR_SSL_WRONG_VERSION_NUMBER',
  'ERR_SSL_DECRYPTION_FAILED_OR_BAD_RECORD_MAC',
])

export type ConnectionErrorDetails = {
  code: string
  message: string
  isSSLError: boolean
}

/**
 * Extrae el detalle de un error de conexión de la cadena `.cause`. El SDK
 * de Anthropic envuelve el error subyacente en esa propiedad; esta
 * función recorre la cadena hasta encontrar el código/mensaje raíz.
 */
export function extractConnectionErrorDetails(
  error: unknown,
): ConnectionErrorDetails | null {
  if (!error || typeof error !== 'object') {
    return null
  }

  // Recorre la cadena de cause buscando el error raíz con código
  let current: unknown = error
  const maxDepth = 5 // Evita loops infinitos
  let depth = 0

  while (current && depth < maxDepth) {
    if (
      current instanceof Error &&
      'code' in current &&
      typeof current.code === 'string'
    ) {
      const code = current.code
      const isSSLError = SSL_ERROR_CODES.has(code)
      return {
        code,
        message: current.message,
        isSSLError,
      }
    }

    // Avanza al siguiente cause de la cadena
    if (
      current instanceof Error &&
      'cause' in current &&
      current.cause !== current
    ) {
      current = current.cause
      depth++
    } else {
      break
    }
  }

  return null
}

/**
 * Da una pista accionable para errores SSL/TLS, pensada para contextos
 * fuera del cliente API principal (intercambio de token OAuth, chequeos
 * de conectividad preflight) donde `formatAPIError` no aplica.
 *
 * Motivación: usuarios corporativos detrás de un proxy que intercepta TLS
 * (Zscaler y similares) ven el OAuth completarse en el navegador, pero el
 * intercambio de token de la CLI falla en silencio con un código SSL
 * crudo. Mostrar el arreglo probable ahorra una vuelta de soporte.
 */
export function getSSLErrorHint(error: unknown): string | null {
  const details = extractConnectionErrorDetails(error)
  if (!details?.isSSLError) {
    return null
  }
  return `SSL certificate error (${details.code}). If you are behind a corporate proxy or TLS-intercepting firewall, set NODE_EXTRA_CA_CERTS to your CA bundle path, or ask IT to allowlist *.anthropic.com. Run /doctor for details.`
}

/**
 * Quita contenido HTML (p. ej. páginas de error de CloudFlare) de un
 * mensaje, devolviendo un título legible o cadena vacía si se detecta
 * HTML. Devuelve el mensaje original sin cambios si no hay HTML.
 */
function sanitizeMessageHTML(message: string): string {
  if (message.includes('<!DOCTYPE html') || message.includes('<html')) {
    const titleMatch = message.match(/<title>([^<]+)<\/title>/)
    if (titleMatch && titleMatch[1]) {
      return titleMatch[1].trim()
    }
    return ''
  }
  return message
}

/**
 * Detecta si el mensaje de un error trae HTML (p. ej. páginas de error de
 * CloudFlare) y devuelve en su lugar un mensaje legible para el usuario.
 */
export function sanitizeAPIError(apiError: APIError): string {
  const message = apiError.message
  if (!message) {
    // A veces el mensaje viene undefined — sin determinar por qué en la fuente.
    return ''
  }
  return sanitizeMessageHTML(message)
}

/**
 * Formas de un error de API deserializado desde el JSONL de sesión.
 *
 * Tras el viaje de ida y vuelta por JSON, el `APIError` del SDK pierde su
 * propiedad `.message`. El mensaje real vive en distinto nivel de anidado
 * según el proveedor:
 *
 * - Bedrock/proxy: `{ error: { message: "..." } }`
 * - API estándar de Anthropic: `{ error: { error: { message: "..." } } }`
 *   (el `.error` externo es el cuerpo de la respuesta; el interno es el
 *   error de la API)
 *
 * Ver también `getErrorMessage` en `logging.ts`, que maneja las mismas formas.
 */
type NestedAPIError = {
  error?: {
    message?: string
    error?: { message?: string }
  }
}

function hasNestedError(value: unknown): value is NestedAPIError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    typeof value.error === 'object' &&
    value.error !== null
  )
}

/**
 * Extrae un mensaje legible de un error de API deserializado que no
 * tiene `.message` de nivel superior.
 *
 * Revisa dos niveles de anidado (el más profundo primero, por especificidad):
 * 1. `error.error.error.message` — forma estándar de la API de Anthropic
 * 2. `error.error.message` — forma de Bedrock
 */
function extractNestedErrorMessage(error: APIError): string | null {
  if (!hasNestedError(error)) {
    return null
  }

  // Accede a `.error` vía el tipo angostado para que TypeScript vea la
  // forma anidada en vez del `Object | undefined` del SDK.
  const narrowed: NestedAPIError = error
  const nested = narrowed.error

  // Forma estándar de Anthropic: { error: { error: { message } } }
  const deepMsg = nested?.error?.message
  if (typeof deepMsg === 'string' && deepMsg.length > 0) {
    const sanitized = sanitizeMessageHTML(deepMsg)
    if (sanitized.length > 0) {
      return sanitized
    }
  }

  // Forma de Bedrock: { error: { message } }
  const msg = nested?.message
  if (typeof msg === 'string' && msg.length > 0) {
    const sanitized = sanitizeMessageHTML(msg)
    if (sanitized.length > 0) {
      return sanitized
    }
  }

  return null
}

export function formatAPIError(error: APIError): string {
  // Extrae el detalle de conexión de la cadena de cause
  const connectionDetails = extractConnectionErrorDetails(error)

  if (connectionDetails) {
    const { code, isSSLError } = connectionDetails

    // Maneja errores de timeout
    if (code === 'ETIMEDOUT') {
      return 'Request timed out. Check your internet connection and proxy settings'
    }

    // Maneja errores SSL/TLS con mensajes específicos
    if (isSSLError) {
      switch (code) {
        case 'UNABLE_TO_VERIFY_LEAF_SIGNATURE':
        case 'UNABLE_TO_GET_ISSUER_CERT':
        case 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY':
          return 'Unable to connect to API: SSL certificate verification failed. Set NODE_EXTRA_CA_CERTS to your corporate CA bundle, then restart Claude Code'
        case 'CERT_HAS_EXPIRED':
          return 'Unable to connect to API: SSL certificate has expired'
        case 'CERT_REVOKED':
          return 'Unable to connect to API: SSL certificate has been revoked'
        case 'DEPTH_ZERO_SELF_SIGNED_CERT':
        case 'SELF_SIGNED_CERT_IN_CHAIN':
          return 'Unable to connect to API: Self-signed certificate detected. Set NODE_EXTRA_CA_CERTS to the trusted CA bundle, then restart Claude Code'
        case 'ERR_TLS_CERT_ALTNAME_INVALID':
        case 'HOSTNAME_MISMATCH':
          return 'Unable to connect to API: SSL certificate hostname mismatch'
        case 'CERT_NOT_YET_VALID':
          return 'Unable to connect to API: SSL certificate is not yet valid'
        default:
          return `Unable to connect to API: SSL error (${code})`
      }
    }
  }

  if (error.message === 'Connection error.') {
    // Si hay un código pero no es SSL, se incluye para depurar
    if (connectionDetails?.code) {
      return `Unable to connect to API (${connectionDetails.code})`
    }
    return 'Unable to connect to API. Check your internet connection'
  }

  // Guarda: al deserializar desde JSONL (p. ej. --resume), el objeto de
  // error puede ser un objeto plano sin `.message`. Se devuelve un
  // fallback seguro en vez de undefined, que rompería a quien lea `.length`.
  if (!error.message) {
    return (
      extractNestedErrorMessage(error) ??
      `API error (status ${error.status ?? 'unknown'})`
    )
  }

  const sanitizedMessage = sanitizeAPIError(error)
  // Usa el mensaje saneado si difiere del original (es decir, si se sanea HTML)
  return sanitizedMessage !== error.message && sanitizedMessage.length > 0
    ? sanitizedMessage
    : error.message
}
