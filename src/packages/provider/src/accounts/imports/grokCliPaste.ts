/**
 * La validación de lo que se pega para Grok Build: el `auth.json` entero, con
 * un refresh token en la misma entrada que el JWT. Un JWT suelto crearía una
 * conexión que no puede refrescarse y muere al caducar, así que se rehúsa.
 *
 * Porte de `omniroute: src/lib/oauth/utils/grokCliAuthJson.ts` (MIT).
 */
import type { JsonRecord } from '../oauth/oauthFlows.ts'

export type GrokCliPasteTokenResult = { ok: true; token: JsonRecord } | { ok: false; error: string }

const JWT_PREFIX = 'eyJ'

const isJwt = (value: unknown) => typeof value === 'string' && value.startsWith(JWT_PREFIX)
const hasRefreshToken = (entry: JsonRecord) => typeof entry.refresh_token === 'string' && entry.refresh_token.length > 0

export function parseGrokCliPasteToken(raw: string): GrokCliPasteTokenResult {
  const trimmed = raw.trim()
  if (!trimmed) return { ok: false, error: 'Paste the full contents of ~/.grok/auth.json' }
  if (trimmed.startsWith('{')) {
    let parsed: unknown
    try {
      parsed = JSON.parse(trimmed)
    } catch {
      return { ok: false, error: 'Could not parse auth.json. Paste the full JSON from ~/.grok/auth.json.' }
    }
    // Empieza por `{`: lo que se analizó es un objeto.
    const doc = parsed as JsonRecord
    let hasKey = false
    let hasRefresh = false
    for (const value of Object.values(doc)) {
      if (!value || typeof value !== 'object') continue
      const entry = value as JsonRecord
      if (isJwt(entry.key) || isJwt(entry.access_token)) {
        hasKey = true
        if (hasRefreshToken(entry)) {
          hasRefresh = true
          break
        }
      }
    }
    if (!hasKey) return { ok: false, error: 'Could not find a Grok Build JWT ("key") in the pasted auth.json. Run `grok login` and paste the full file.' }
    if (!hasRefresh) {
      return { ok: false, error: 'auth.json is missing refresh_token. Re-run `grok login` and paste the full ~/.grok/auth.json so the connection can auto-refresh (#7610).' }
    }
    return { ok: true, token: doc }
  }
  if (trimmed.startsWith(JWT_PREFIX)) {
    return { ok: false, error: 'Do not paste only the JWT "key" field. Paste the full ~/.grok/auth.json object so refresh_token is included (#7610).' }
  }
  return { ok: false, error: 'Paste the full contents of ~/.grok/auth.json (JSON object).' }
}
