/**
 * Control de acceso del proxy — contrato de
 * `cliproxyapi: internal/access/config_access/provider.go` y
 * `cliproxyapi: sdk/access/{errors,manager}.go`.
 */
import { describe, expect, test } from 'bun:test'
import {
  AccessManager,
  AuthErrorCode,
  createConfigApiKeyProvider,
  extractBearerToken,
  normalizeKeys,
} from '../src/proxy/access.js'

const request = (headers: Record<string, string> = {}, url = 'http://127.0.0.1/v1/messages') =>
  new Request(url, { headers })

describe('normalizeKeys', () => {
  test('recorta, descarta vacías y quita duplicados conservando el orden', () => {
    expect(normalizeKeys([' a ', '', 'b', 'a', '  '])).toEqual(['a', 'b'])
  })
  test('sin claves válidas devuelve null', () => {
    expect(normalizeKeys(['', ' '])).toBeNull()
  })
})

describe('extractBearerToken', () => {
  test('quita el esquema Bearer sin importar la caja', () => {
    expect(extractBearerToken('bearer  k1 ')).toBe('k1')
  })
  test('otro esquema o sin espacio devuelve la cabecera entera', () => {
    expect(extractBearerToken('Basic x')).toBe('Basic x')
    expect(extractBearerToken('k1')).toBe('k1')
  })
})

describe('createConfigApiKeyProvider', () => {
  test('sin claves no se registra', () => {
    expect(createConfigApiKeyProvider([])).toBeNull()
  })

  const provider = createConfigApiKeyProvider(['k1'])!

  test('acepta la clave en cada una de las cinco fuentes y nombra la fuente', async () => {
    const cases: [Request, string][] = [
      [request({ authorization: 'Bearer k1' }), 'authorization'],
      [request({ 'x-goog-api-key': 'k1' }), 'x-goog-api-key'],
      [request({ 'x-api-key': 'k1' }), 'x-api-key'],
      [request({}, 'http://127.0.0.1/v1?key=k1'), 'query-key'],
      [request({}, 'http://127.0.0.1/v1?auth_token=k1'), 'query-auth-token'],
    ]
    for (const [req, source] of cases) {
      const { result, error } = provider.authenticate(req)
      expect(error).toBeNull()
      expect(result).toEqual({ provider: 'config-inline', principal: 'k1', metadata: { source } })
    }
  })

  test('sin ninguna fuente: no_credentials con 401', () => {
    const { error } = provider.authenticate(request())
    expect(error?.code).toBe(AuthErrorCode.NoCredentials)
    expect(error?.statusCode).toBe(401)
    expect(error?.message).toBe('Missing API key')
  })

  test('clave distinta: invalid_credential con 401', () => {
    const { error } = provider.authenticate(request({ 'x-api-key': 'otra' }))
    expect(error?.code).toBe(AuthErrorCode.InvalidCredential)
    expect(error?.message).toBe('Invalid API key')
  })
})

describe('AccessManager', () => {
  test('sin proveedores deja pasar sin resultado (conducta de la fuente)', () => {
    expect(new AccessManager([]).authenticate(request())).toEqual({ result: null, error: null })
  })

  test('invalid gana a missing cuando ningún proveedor acepta', () => {
    const a = createConfigApiKeyProvider(['k1'])!
    const b = createConfigApiKeyProvider(['k2'])!
    const { error } = new AccessManager([a, b]).authenticate(request({ 'x-api-key': 'nope' }))
    expect(error?.code).toBe(AuthErrorCode.InvalidCredential)
  })

  test('el segundo proveedor acepta tras el rechazo del primero', () => {
    const a = createConfigApiKeyProvider(['k1'])!
    const b = createConfigApiKeyProvider(['k2'])!
    const { result } = new AccessManager([a, b]).authenticate(request({ 'x-api-key': 'k2' }))
    expect(result?.principal).toBe('k2')
  })
})
