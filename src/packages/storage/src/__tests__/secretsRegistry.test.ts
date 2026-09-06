import { describe, expect, test } from 'bun:test'
import {
  getSecretPatterns,
  redactSecrets,
} from '../secretsRegistry.js'

describe('getSecretPatterns', () => {
  test('sin filtro devuelve las 12 reglas registradas', () => {
    expect(getSecretPatterns()).toHaveLength(12)
  })

  test('filtra por confidence "high"', () => {
    const patterns = getSecretPatterns({ confidence: 'high' })
    expect(patterns.length).toBeGreaterThan(0)
    expect(patterns.every(p => p.confidence === 'high')).toBe(true)
  })

  test('filtra por confidence "low"', () => {
    const patterns = getSecretPatterns({ confidence: 'low' })
    expect(patterns.length).toBeGreaterThan(0)
    expect(patterns.every(p => p.confidence === 'low')).toBe(true)
  })

  test('la lista devuelta es una copia — mutarla no afecta llamadas futuras', () => {
    const first = getSecretPatterns()
    first.pop()
    expect(getSecretPatterns()).toHaveLength(12)
  })
})

describe('redactSecrets', () => {
  test('redacta una API key de Anthropic', () => {
    const text = `token=sk-ant-${'a'.repeat(40)}`
    expect(redactSecrets(text)).toBe('token=[REDACTED:anthropic-api-key]')
  })

  test('redacta una API key de OpenAI sin chocar con sk-ant-', () => {
    const text = `token=sk-${'b'.repeat(40)}`
    expect(redactSecrets(text)).toBe('token=[REDACTED:openai-api-key]')
  })

  test('un access key id de AWS produce match high-confidence', () => {
    const text = 'AKIAABCDEFGHIJKLMNOP'
    expect(redactSecrets(text)).toBe('[REDACTED:aws-access-key-id]')
  })

  test('un JWT de tres segmentos se redacta entero', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SIGNATURE'
    expect(redactSecrets(jwt)).toBe('[REDACTED:jwt]')
  })

  test('una cabecera PEM se redacta', () => {
    const text = '-----BEGIN RSA PRIVATE KEY-----\nMIIB...'
    expect(redactSecrets(text)).toContain('[REDACTED:pem-private-key]')
  })

  test('texto sin secretos vuelve sin cambios', () => {
    const text = 'no hay nada sensible aqui'
    expect(redactSecrets(text)).toBe(text)
  })

  test('con confidence:"high" NO redacta patrones low-confidence', () => {
    const hexLike = '0'.repeat(32)
    expect(redactSecrets(hexLike, { confidence: 'high' })).toBe(hexLike)
    expect(redactSecrets(hexLike, { confidence: 'low' })).toBe(
      '[REDACTED:generic-hex-32]',
    )
  })

  test('una cabecera Authorization Bearer se redacta completa (low-confidence)', () => {
    const text = 'Authorization: Bearer abc.def-123_XYZ'
    expect(redactSecrets(text, { confidence: 'low' })).toBe(
      '[REDACTED:authorization-header]',
    )
  })

  test('múltiples secretos en el mismo texto se redactan todos', () => {
    const text = `AKIAABCDEFGHIJKLMNOP y ASIAABCDEFGHIJKLMNOP`
    const out = redactSecrets(text)
    expect(out).toBe(
      '[REDACTED:aws-access-key-id] y [REDACTED:aws-temporary-token]',
    )
  })
})
