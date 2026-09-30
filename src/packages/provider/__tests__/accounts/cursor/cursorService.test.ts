/**
 * Lo que una conexión de Cursor necesita fuera del inicio de sesión: la suma
 * de comprobación y las cabeceras de la API, validar un token importado y
 * nombrar la cuenta desde el token o desde el panel de cursor.com.
 *
 * Porte de `omniroute: src/lib/oauth/services/cursor.ts` (MIT).
 */
import { describe, expect, test } from 'bun:test'

import { buildCursorHeaders, CURSOR_CLIENT_VERSION, cursorClientArch, cursorClientOs, cursorTokenStorageInstructions, extractCursorUserInfo, fetchCursorUserInfo, generateCursorChecksum, validateCursorImportToken } from '../../../src/accounts/cursor/cursorService.ts'

const NOW = Date.parse('2026-09-28T10:00:00.500Z')
const LONG_TOKEN = 'x'.repeat(50)
const MACHINE_ID = '0123456789abcdef0123456789abcdef'
const jwt = (claims: object) => `h.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.s`

/** La inversa de la codificación: XOR con la clave rodante que empieza en 165. */
function decodeChecksumTimestamp(checksum: string): string {
  const [encoded] = checksum.split(',')
  let key = 165
  let decoded = ''
  for (const byte of Buffer.from(encoded!, 'base64')) {
    const char = byte ^ key
    decoded += String.fromCharCode(char)
    key = (key + char) & 0xff
  }
  return decoded
}

function errorOf(fn: () => unknown): string {
  try {
    fn()
  } catch (error) {
    return (error as Error).message
  }
  return ''
}

describe('checksum and headers', () => {
  test('the checksum encodes the unix seconds and carries the machine id', () => {
    const checksum = generateCursorChecksum('machine-1', NOW)
    expect(checksum.endsWith(',machine-1')).toBe(true)
    expect(decodeChecksumTimestamp(checksum)).toBe(String(Math.floor(NOW / 1000)))
    expect(decodeChecksumTimestamp(generateCursorChecksum('m', NOW + 1000))).toBe(String(Math.floor(NOW / 1000) + 1))
  })

  test('the client os and arch use the names Cursor expects', () => {
    expect(cursorClientOs('win32')).toBe('windows')
    expect(cursorClientOs('darwin')).toBe('macos')
    expect(cursorClientOs('linux')).toBe('linux')
    expect(cursorClientOs('freebsd')).toBe('linux')
    expect(cursorClientArch('x64')).toBe('x86_64')
    expect(cursorClientArch('arm64')).toBe('aarch64')
    expect(cursorClientArch('ia32')).toBe('ia32')
  })

  test('the API headers carry the bearer, the client identity and the checksum', () => {
    const headers = buildCursorHeaders({ accessToken: 'tok', machineId: 'm-1', nowMs: NOW, platform: 'darwin', arch: 'arm64' })
    expect(headers).toMatchObject({
      Authorization: 'Bearer tok',
      'Content-Type': 'application/connect+proto',
      'Connect-Protocol-Version': '1',
      'User-Agent': `Cursor/${CURSOR_CLIENT_VERSION}`,
      'x-cursor-client-version': CURSOR_CLIENT_VERSION,
      'x-cursor-client-type': 'ide',
      'x-cursor-client-os': 'macos',
      'x-cursor-client-arch': 'aarch64',
      'x-cursor-client-device-type': 'desktop',
      'x-cursor-user-agent': `Cursor/${CURSOR_CLIENT_VERSION}`,
      'x-ghost-mode': 'false',
    })
    expect(headers['x-cursor-checksum']).toBe(generateCursorChecksum('m-1', NOW))
    expect(buildCursorHeaders({ accessToken: 'tok', machineId: 'm-1', nowMs: NOW, ghostMode: true, clientVersion: '9.9' })).toMatchObject({ 'x-ghost-mode': 'true', 'x-cursor-client-version': '9.9', 'User-Agent': 'Cursor/9.9' })
  })
})

describe('import validation', () => {
  test('an IDE import has a machine id and lasts a day', () => {
    expect(validateCursorImportToken(LONG_TOKEN, MACHINE_ID)).toEqual({ accessToken: LONG_TOKEN, machineId: MACHINE_ID, expiresIn: 86400, authMethod: 'imported' })
    expect(validateCursorImportToken(LONG_TOKEN, '01234567-89ab-cdef-0123-456789abcdef').machineId).toBe('01234567-89ab-cdef-0123-456789abcdef')
  })

  test('a cursor-agent import has no machine id', () => {
    expect(validateCursorImportToken(LONG_TOKEN)).toEqual({ accessToken: LONG_TOKEN, machineId: null, expiresIn: 86400, authMethod: 'cursor-agent' })
  })

  test('a missing or short token, or a malformed machine id, is refused', () => {
    expect(errorOf(() => validateCursorImportToken(''))).toBe('Access token is required')
    expect(errorOf(() => validateCursorImportToken(42 as unknown as string))).toBe('Access token is required')
    expect(errorOf(() => validateCursorImportToken('x'.repeat(49)))).toContain('too short')
    expect(errorOf(() => validateCursorImportToken(LONG_TOKEN, 'not-a-uuid'))).toContain('machine ID')
    expect(errorOf(() => validateCursorImportToken(LONG_TOKEN, 'g'.repeat(32)))).toContain('machine ID')
    expect(errorOf(() => validateCursorImportToken(LONG_TOKEN, 'a'.repeat(31)))).toContain('machine ID')
    expect(errorOf(() => validateCursorImportToken(LONG_TOKEN, `${'a'.repeat(16)}-${'a'.repeat(15)}`))).toContain('machine ID')
  })
})

describe('account identity', () => {
  test('a JWT names the account by email (only if it looks like one) and subject', () => {
    expect(extractCursorUserInfo(jwt({ email: 'u@x', sub: 'auth0|1' }))).toEqual({ email: 'u@x', userId: 'auth0|1' })
    expect(extractCursorUserInfo(jwt({ email: 'nope', user_id: 'u-2' }))).toEqual({ email: null, userId: 'u-2' })
    expect(extractCursorUserInfo(jwt({ email: 7 }))).toEqual({ email: null, userId: undefined })
    expect(extractCursorUserInfo('opaque-token')).toBeNull()
  })

  test('the dashboard profile is read with the WorkOS session cookie', async () => {
    const calls: { url: string; init: RequestInit }[] = []
    const fetch = (async (url: string, init: RequestInit) => {
      calls.push({ url, init })
      return new Response(JSON.stringify({ email: 'u@x', name: 'U', sub: 'user_1', extra: 1 }))
    }) as unknown as typeof globalThis.fetch
    expect(await fetchCursorUserInfo(fetch, 'tok', 'user_1')).toEqual({ email: 'u@x', name: 'U', sub: 'user_1' })
    expect(calls[0].url).toBe('https://cursor.com/api/auth/me')
    expect(calls[0].init).toMatchObject({ method: 'GET', redirect: 'manual' })
    expect(calls[0].init.headers).toMatchObject({ Cookie: 'WorkosCursorSessionToken=user_1::tok', Origin: 'https://cursor.com', Referer: 'https://cursor.com/dashboard', Accept: 'application/json', 'User-Agent': `Cursor/${CURSOR_CLIENT_VERSION}` })
  })

  test('no token or user, a refusal, a network failure or odd fields give nothing', async () => {
    let called = 0
    const counting = (async () => {
      called++
      return new Response('{}')
    }) as unknown as typeof globalThis.fetch
    expect(await fetchCursorUserInfo(counting, '', 'u')).toBeNull()
    expect(await fetchCursorUserInfo(counting, 't', '')).toBeNull()
    expect(called).toBe(0)
    const refused = (async () => new Response(JSON.stringify({ email: 'u@x', name: 'U', sub: 's' }), { status: 401 })) as unknown as typeof globalThis.fetch
    expect(await fetchCursorUserInfo(refused, 't', 'u')).toBeNull()
    const offline = (async () => {
      throw new Error('offline')
    }) as unknown as typeof globalThis.fetch
    expect(await fetchCursorUserInfo(offline, 't', 'u')).toBeNull()
    const odd = (async () => new Response(JSON.stringify({ email: 1, name: null }))) as unknown as typeof globalThis.fetch
    expect(await fetchCursorUserInfo(odd, 't', 'u')).toEqual({ email: null, name: null, sub: null })
  })
})

test('the storage instructions name the database, both keys and every platform path', () => {
  const instructions = cursorTokenStorageInstructions()
  const text = [...instructions.steps, ...instructions.alternativeMethod].join('\n')
  expect(instructions.title).toContain('Cursor token')
  for (const fragment of ['~/.config/Cursor/User/globalStorage/state.vscdb', 'Library/Application Support/Cursor', '%APPDATA%\\Cursor', 'cursorAuth/accessToken', 'storage.serviceMachineId']) expect(text).toContain(fragment)
})
