/**
 * La credencial de sesión de Z.ai es un JWT de `localStorage` que se presenta
 * como portador, no una cookie. Se acepta en JSON, como línea `Bearer`, como
 * cookie `token=` heredada o como valor suelto.
 *
 * Porte de `extractZaiToken` en `omniroute: open-sse/executors/zai-web/protocol.ts`
 * y de `normalizeCookie` en `open-sse/utils/error.ts` (MIT).
 */

type Row = Record<string, unknown>

function parseCredentialJson(raw: string): Row | null {
  try {
    const value = JSON.parse(raw) as unknown
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Row) : null
  } catch {
    return null
  }
}

const withoutCookiePrefix = (raw: string) => (raw.startsWith('Cookie:') ? raw.slice('Cookie:'.length).trim() : raw)

export function extractZaiToken(rawCredential: string): string {
  const trimmed = rawCredential.trim()
  const json = parseCredentialJson(trimmed)
  if (json) {
    const token = json.token ?? json.accessToken ?? json.access_token
    return typeof token === 'string' ? token.trim() : ''
  }
  const bearer = trimmed.match(/^(?:Authorization:\s*)?Bearer\s+(.+)$/i)
  if (bearer) return bearer[1]!.trim()
  const cookie = withoutCookiePrefix(trimmed)
  if (!cookie) return ''
  const match = cookie.match(/(?:^|;\s*)token=([^;]+)/)
  if (match) return match[1]!.trim()
  return cookie.includes(';') || cookie.includes('=') ? '' : cookie
}
