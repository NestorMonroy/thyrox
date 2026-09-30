// Contrato de `X5t` del binario 2.1.281: la categoría SDK de un error de API
// que se va a reintentar. El orden importa — un 529 es `overloaded` aunque
// también sea >= 408.
import { describe, expect, test } from 'bun:test'
import { categorizeRetryableAPIError } from '../errors.ts'

describe('categorizeRetryableAPIError', () => {
  test('529, o el cuerpo overloaded_error, es overloaded', () => {
    expect(categorizeRetryableAPIError({ status: 529 })).toBe('overloaded')
    expect(categorizeRetryableAPIError({ status: 500, message: '{"type":"overloaded_error"}' })).toBe('overloaded')
  })
  test('429 es rate_limit; 401 y 403 son authentication_failed', () => {
    expect(categorizeRetryableAPIError({ status: 429 })).toBe('rate_limit')
    expect(categorizeRetryableAPIError({ status: 401 })).toBe('authentication_failed')
    expect(categorizeRetryableAPIError({ status: 403 })).toBe('authentication_failed')
  })
  test('cualquier otro >= 408 es server_error', () => {
    expect(categorizeRetryableAPIError({ status: 408 })).toBe('server_error')
    expect(categorizeRetryableAPIError({ status: 503 })).toBe('server_error')
  })
  test('sin estado: credencial de nube, o unknown', () => {
    expect(categorizeRetryableAPIError({ isCloudCredentialError: true })).toBe('cloud_credential_error')
    expect(categorizeRetryableAPIError({ status: 400 })).toBe('unknown')
    expect(categorizeRetryableAPIError({})).toBe('unknown')
  })
})
