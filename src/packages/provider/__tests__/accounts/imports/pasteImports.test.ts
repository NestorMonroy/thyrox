/**
 * Lo que un inicio de sesión remoto trae pegado: el blob de credenciales que
 * produce el ayudante local, su puerta por proveedor, el `auth.json` de Grok
 * Build y los ZIP de archivos de credenciales.
 *
 * Porte de `omniroute: src/lib/oauth/credentialBlob.ts`, `pasteCredentials.ts`
 * y de `utils/{grokCliAuthJson,jsonZipExtract}.ts` (MIT).
 */
import { describe, expect, test } from 'bun:test'
import { zipSync } from 'fflate'

import { CREDENTIAL_BLOB_PREFIX, decodeCredentialBlob, encodeCredentialBlob } from '../../../src/accounts/imports/credentialBlob.ts'
import { parseGrokCliPasteToken } from '../../../src/accounts/imports/grokCliPaste.ts'
import { extractJsonZip } from '../../../src/accounts/imports/jsonZipExtract.ts'
import { parsePastedCredentials } from '../../../src/accounts/imports/pasteCredentials.ts'

const text = (value: string) => new TextEncoder().encode(value)
const zip = (entries: Record<string, Uint8Array>) => Buffer.from(zipSync(entries))
const blobOf = (payload: unknown) => `${CREDENTIAL_BLOB_PREFIX}${Buffer.from(JSON.stringify(payload)).toString('base64url')}`

describe('credential blob', () => {
  test('a blob round-trips with a trimmed provider and survives a trailing newline', () => {
    const blob = encodeCredentialBlob({ provider: ' antigravity ', tokens: { access_token: 'a', refresh_token: 'r' } })
    expect(blob.startsWith('thyrox-cred-v1.')).toBe(true)
    expect(/^[A-Za-z0-9._-]+$/.test(blob)).toBe(true)
    expect(JSON.parse(Buffer.from(blob.slice(CREDENTIAL_BLOB_PREFIX.length), 'base64url').toString()).provider).toBe('antigravity')
    expect(decodeCredentialBlob(`${blob}\n`)).toEqual({ provider: 'antigravity', tokens: { access_token: 'a', refresh_token: 'r' } })
  })

  test('encoding needs a provider and a tokens object', () => {
    expect(() => encodeCredentialBlob({ provider: ' ', tokens: {} })).toThrow('a non-empty provider is required')
    expect(() => encodeCredentialBlob({ provider: 'p', tokens: null as never })).toThrow('tokens object is required')
  })

  test('decoding refuses another prefix, a non-base64url payload, bad JSON, another version and missing fields', () => {
    expect(() => decodeCredentialBlob('omniroute-cred-v1.e30')).toThrow('must start with')
    expect(() => decodeCredentialBlob(`${CREDENTIAL_BLOB_PREFIX}ab+c`)).toThrow('not base64url')
    expect(() => decodeCredentialBlob(`${CREDENTIAL_BLOB_PREFIX}${Buffer.from('{').toString('base64url')}`)).toThrow('could not parse JSON')
    expect(() => decodeCredentialBlob(blobOf({ v: 2, provider: 'p', tokens: { access_token: 'a' } }))).toThrow('unsupported blob version 2')
    expect(() => decodeCredentialBlob(blobOf({ v: 1, provider: ' ', tokens: { access_token: 'a' } }))).toThrow('missing provider')
    expect(() => decodeCredentialBlob(blobOf({ v: 1, provider: 'p' }))).toThrow('missing tokens')
    expect(() => decodeCredentialBlob(blobOf({ v: 1, provider: 'p', tokens: { refresh_token: 'r' } }))).toThrow('missing access_token')
  })
})

describe('paste credentials', () => {
  test('only the native-loopback providers take a pasted blob, and it must be for the same provider', () => {
    const blob = encodeCredentialBlob({ provider: 'agy', tokens: { access_token: 'a' } })
    expect(parsePastedCredentials('agy', blob).tokens.access_token).toBe('a')
    expect(() => parsePastedCredentials('codex', blob)).toThrow('paste-credentials not supported for provider: codex. Supported: antigravity, agy')
    expect(() => parsePastedCredentials('antigravity', blob)).toThrow('blob is for "agy" but the route provider is "antigravity"')
  })
})

describe('grok auth.json paste', () => {
  const key = 'eyJhbGciOiJIUzI1NiJ9.e30.sig'

  test('empty, bare JWT, garbage, broken JSON and arrays are refused with their reason', () => {
    expect(parseGrokCliPasteToken('   ')).toEqual({ ok: false, error: 'Paste the full contents of ~/.grok/auth.json' })
    expect((parseGrokCliPasteToken(key) as any).error).toContain('Do not paste only the JWT "key"')
    expect((parseGrokCliPasteToken('hello') as any).error).toBe('Paste the full contents of ~/.grok/auth.json (JSON object).')
    expect((parseGrokCliPasteToken('{"a":') as any).error).toContain('Could not parse auth.json')
    expect((parseGrokCliPasteToken('[1]') as any).error).toBe('Paste the full contents of ~/.grok/auth.json (JSON object).')
  })

  test('an object needs a JWT and, on the same entry, a refresh token', () => {
    expect((parseGrokCliPasteToken('{"x":{"key":"not-a-jwt"}}') as any).error).toContain('Could not find a Grok Build JWT')
    expect((parseGrokCliPasteToken(JSON.stringify({ x: { key } })) as any).error).toContain('missing refresh_token')
    const doc = { a: { key }, b: { access_token: key, refresh_token: 'r' } }
    expect(parseGrokCliPasteToken(` ${JSON.stringify(doc)} `)).toEqual({ ok: true, token: doc })
    expect(parseGrokCliPasteToken(JSON.stringify({ x: { key, refresh_token: 'r' } })).ok).toBe(true)
  })
})

describe('json zip', () => {
  test('the JSON entries come back by base name; other files are ignored', () => {
    const files = extractJsonZip(zip({ 'dir/a.json': text('{"a":1}'), 'b.JSON': text('{}'), 'notes.txt': text('x') }))
    expect(files).toEqual([{ name: 'a.json', content: '{"a":1}' }, { name: 'b.JSON', content: '{}' }])
  })

  test('a corrupt archive, one without JSON and one with too many are refused', () => {
    expect(() => extractJsonZip(Buffer.from('not a zip'))).toThrow('Could not parse ZIP archive')
    expect(() => extractJsonZip(zip({ 'a.txt': text('x') }))).toThrow('contains no .json files')
    expect(() => extractJsonZip(zip({ 'a.json': text('{}'), 'b.json': text('{}') }), { maxFiles: 1 })).toThrow('contains 2 .json files — max allowed is 1')
  })

  test('traversal and oversized entries are refused, per file and in total', () => {
    expect(() => extractJsonZip(zip({ '../a.json': text('{}') }))).toThrow('path "../a.json" is unsafe')
    expect(() => extractJsonZip(zip({ 'a.json': text('{"k":"0123456789"}') }), { maxFileSizeBytes: 5 })).toThrow('exceeds 5 byte limit per file')
    expect(() => extractJsonZip(zip({ 'a.json': text('{"a":1}'), 'b.json': text('{"b":2}') }), { maxTotalSizeBytes: 10 })).toThrow('total uncompressed size exceeds 10 byte limit')
  })
})
