/**
 * La importación masiva de codex —registros de exportadores comunes y del
 * propio `auth.json`, en snake_case o camelCase— y el JSON de sesión que se
 * copia de chatgpt.com, que sólo trae un access token.
 *
 * Porte de `omniroute: src/lib/oauth/services/codexImport.ts` y
 * `utils/codexSessionImport.ts` (MIT).
 */
import { describe, expect, test } from 'bun:test'

import { extractCodexAccountInfo, flattenCodexImportPayload, normalizeCodexImportRecord, preserveExistingCodexConnectionState } from '../../../src/accounts/imports/codexBulkImport.ts'
import { looksLikeCodexSessionJson, parseCodexSessionJson } from '../../../src/accounts/imports/codexSessionImport.ts'

const NOW = Date.parse('2026-09-28T10:00:00.000Z')
const NOW_SECONDS = NOW / 1000
const AUTH_CLAIM = 'https://api.openai.com/auth'
const jwt = (payload: Record<string, unknown>) => `h.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.s`
const ok = (result: ReturnType<typeof normalizeCodexImportRecord>) => {
  if (!result.ok) throw new Error(result.error)
  return result.payload
}

describe('bulk records', () => {
  test('the id token names the account, its workspace and plan', () => {
    expect(extractCodexAccountInfo(jwt({ email: 'e@x', [AUTH_CLAIM]: { chatgpt_account_id: 'acc', chatgpt_plan_type: 'plus' } }))).toEqual({ email: 'e@x', chatgptAccountId: 'acc', chatgptPlanType: 'plus' })
    expect(extractCodexAccountInfo('nope')).toEqual({})
  })

  test('a flat record becomes a clean, active connection with its workspace mirrored', () => {
    const payload = ok(normalizeCodexImportRecord({ access_token: jwt({ exp: NOW_SECONDS + 60 }), refresh_token: 'r', email: ' e@x ', account_id: 'acc', priority: 3 }, NOW))
    expect(payload).toMatchObject({
      provider: 'codex', authType: 'oauth', refreshToken: 'r', email: 'e@x', expiresAt: '2026-09-28T10:01:00.000Z', tokenExpiresAt: '2026-09-28T10:01:00.000Z',
      isActive: true, backoffLevel: 0, rateLimitedUntil: null, lastError: null, priority: 3,
      providerSpecificData: { chatgptAccountId: 'acc', workspaceId: 'acc' },
    })
    expect(payload.idToken).toBeUndefined()
  })

  test('the id token wins over the flat fields; the declared expiry wins over the token; otherwise ten days', () => {
    const idToken = jwt({ email: 'id@x', [AUTH_CLAIM]: { chatgpt_account_id: 'from-id', chatgpt_plan_type: 'pro' } })
    const payload = ok(normalizeCodexImportRecord({ access_token: 'opaque', refresh_token: 'r', id_token: idToken, email: 'flat@x', account_id: 'flat', expired: '2026-10-01T00:00:00Z' }, NOW))
    expect([payload.email, payload.providerSpecificData?.workspaceId, payload.providerSpecificData?.chatgptPlanType, payload.expiresAt, payload.idToken]).toEqual(['id@x', 'from-id', 'pro', '2026-10-01T00:00:00.000Z', idToken])
    expect(ok(normalizeCodexImportRecord({ access_token: 'opaque', refresh_token: 'r', email: 'e@x', expired: 'garbage' }, NOW)).expiresAt).toBe('2026-10-08T10:00:00.000Z')
  })

  test('the CLI auth.json nesting and the camelCase export both read the same', () => {
    const nested = ok(normalizeCodexImportRecord({ auth_mode: 'chatgpt', email: 'e@x', tokens: { access_token: 'a', refresh_token: 'r', account_id: 'acc' } }, NOW))
    expect([nested.accessToken, nested.providerSpecificData?.workspaceId]).toEqual(['a', 'acc'])
    const camel = ok(normalizeCodexImportRecord({ accessToken: 'a', refreshToken: 'r', email: 'e@x', expiresAt: '2026-10-01T00:00:00Z', providerSpecificData: { chatgptAccountId: 'acc', chatgptPlanType: 'team' } }, NOW))
    expect([camel.expiresAt, camel.providerSpecificData?.workspaceId, camel.providerSpecificData?.chatgptPlanType]).toEqual(['2026-10-01T00:00:00.000Z', 'acc', 'team'])
    expect(ok(normalizeCodexImportRecord({ access_token: 'snake', accessToken: 'camel', refresh_token: 'r', email: 'e@x' }, NOW)).accessToken).toBe('snake')
    expect(ok(normalizeCodexImportRecord({ tokens: { refresh_token: 'r' }, access_token: 'top', refresh_token: 'r2', email: 'e@x' }, NOW)).refreshToken).toBe('r2')
  })

  test('another type, a missing token or a missing email is refused; a bad priority is dropped', () => {
    expect(normalizeCodexImportRecord([], NOW)).toEqual({ ok: false, error: 'Record is not an object' })
    expect(normalizeCodexImportRecord({ type: 'claude', access_token: 'a', refresh_token: 'r', email: 'e' }, NOW)).toEqual({ ok: false, error: 'Unsupported type: claude' })
    expect(normalizeCodexImportRecord({ access_token: 'a', email: 'e' }, NOW)).toEqual({ ok: false, error: 'Missing required field: refresh_token' })
    expect(normalizeCodexImportRecord({ access_token: 'a', refresh_token: 'r' }, NOW)).toEqual({ ok: false, error: 'Missing email (and id_token does not contain one)' })
    expect(ok(normalizeCodexImportRecord({ type: 'codex', access_token: 'a', refresh_token: 'r', email: 'e', priority: 1.5 }, NOW)).priority).toBeUndefined()
    expect(ok(normalizeCodexImportRecord({ access_token: 'a', refresh_token: 'r', email: 'e' }, NOW)).providerSpecificData).toBeUndefined()
  })

  test('a re-import keeps the stored provider data and drops its priority; another account is untouched', () => {
    const payload = ok(normalizeCodexImportRecord({ access_token: 'a', refresh_token: 'r', email: 'e@x', account_id: 'acc', priority: 2 }, NOW))
    const existing = [{ provider: 'codex', authType: 'oauth', email: 'e@x', providerSpecificData: { workspaceId: 'acc', chatgptUserId: 'u1', chatgptAccountId: 'old' } }]
    const adjusted = preserveExistingCodexConnectionState(payload, existing)
    expect(adjusted.providerSpecificData).toEqual({ workspaceId: 'acc', chatgptUserId: 'u1', chatgptAccountId: 'acc' })
    expect(adjusted.priority).toBeUndefined()
    expect(preserveExistingCodexConnectionState(payload, [{ ...existing[0]!, email: 'other@x' }])).toBe(payload)
  })

  test('the upload is one record or a list of them', () => {
    expect(flattenCodexImportPayload([{ a: 1 }])).toEqual({ ok: true, records: [{ a: 1 }] })
    expect(flattenCodexImportPayload({ a: 1 })).toEqual({ ok: true, records: [{ a: 1 }] })
    expect(flattenCodexImportPayload('x')).toEqual({ ok: false, error: 'JSON must be an object or an array of objects' })
  })
})

describe('session json', () => {
  const token = jwt({ exp: NOW_SECONDS + 600 })

  test('only a JSON object counts as a pasted session', () => {
    expect([looksLikeCodexSessionJson(' {"a":1} '), looksLikeCodexSessionJson('[1]'), looksLikeCodexSessionJson('{bad'), looksLikeCodexSessionJson(token)]).toEqual([true, false, false, false])
  })

  test('the access token is found under its names and the user email comes along', () => {
    expect(parseCodexSessionJson({ user: { email: ' e@x ' }, accessToken: token }, NOW)).toEqual({ ok: true, session: { accessToken: token, email: 'e@x' } })
    expect(parseCodexSessionJson({ session_token: token }, NOW)).toEqual({ ok: true, session: { accessToken: token, email: undefined } })
    expect(parseCodexSessionJson({ tokens: { accessToken: token } }, NOW)).toEqual({ ok: true, session: { accessToken: token, email: undefined } })
  })

  test('no object, no token, a non-JWT token or an expired session is refused', () => {
    expect(parseCodexSessionJson('x', NOW)).toEqual({ ok: false, error: 'Pasted session data is not a JSON object' })
    expect((parseCodexSessionJson({}, NOW) as any).error).toContain('Could not find an access token')
    expect((parseCodexSessionJson({ accessToken: 'opaque' }, NOW) as any).error).toContain('does not look like a valid JWT')
    expect((parseCodexSessionJson({ accessToken: token, expires: '2026-09-28T10:00:00Z' }, NOW) as any).error).toContain('Session is expired')
    expect((parseCodexSessionJson({ accessToken: jwt({ exp: NOW_SECONDS }) }, NOW) as any).error).toContain('Session is expired')
    expect(parseCodexSessionJson({ accessToken: token, expires: 'garbage' }, NOW).ok).toBe(true)
  })
})
