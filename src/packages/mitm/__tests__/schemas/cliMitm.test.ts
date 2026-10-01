/**
 * Los cuerpos de arranque del MITM y la resolución de su clave.
 *
 * Porte de `omniroute: tests/unit/cli-mitm-schema.test.ts` (MIT). Sus dos
 * casos del marcador `sk_omniroute` se prueban como su equivalente: sin
 * clave, la resolución da `null`.
 */
import { expect, test } from 'bun:test'

import { cliMitmStartSchema, cliMitmStopSchema, resolveStartApiKey } from '../../src/schemas/cli.ts'

const noLookup = async () => null

test('a key, a null key or no key at all are accepted', () => {
  expect(cliMitmStartSchema.parse({ apiKey: 'sk-test-key-value', sudoPassword: 'password123' })).toEqual({
    apiKey: 'sk-test-key-value',
    sudoPassword: 'password123',
  })
  expect(cliMitmStartSchema.parse({ apiKey: null, sudoPassword: '' }).apiKey).toBeNull()
  expect(cliMitmStartSchema.parse({ sudoPassword: '' }).apiKey).toBeUndefined()
})

test('a key id is accepted, and so is a null one', () => {
  expect(cliMitmStartSchema.parse({ keyId: 'api-key-id-123', sudoPassword: 'x' }).keyId).toBe('api-key-id-123')
  expect(cliMitmStartSchema.parse({ keyId: null, sudoPassword: '' }).keyId).toBeNull()
})

test('a blank key is rejected, and stop takes only the password', () => {
  expect(cliMitmStartSchema.safeParse({ apiKey: '   ' }).success).toBe(false)
  expect(cliMitmStopSchema.parse({ sudoPassword: 'p' })).toEqual({ sudoPassword: 'p' })
})

test('the stored key wins over the given one', async () => {
  expect(await resolveStartApiKey('id-1', 'sk-given', async () => 'sk-stored')).toBe('sk-stored')
})

test('an unknown or failing key id falls back to the given key', async () => {
  expect(await resolveStartApiKey('id-1', 'sk-given', noLookup)).toBe('sk-given')
  expect(await resolveStartApiKey('id-1', 'sk-given', async () => { throw new Error('store down') })).toBe('sk-given')
})

test('with no key and no stored key the start has no key', async () => {
  expect(await resolveStartApiKey(null, null, noLookup)).toBeNull()
  expect(await resolveStartApiKey(undefined, '', noLookup)).toBeNull()
})
