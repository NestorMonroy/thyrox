/**
 * Un registry responde con éxito, sin autorización, sin el objeto, con un
 * límite de uso o con un error propio, y el consumidor tiene que poder
 * distinguirlos: un 429 no es un artefacto inexistente ni un formato no
 * soportado. Los números del límite los entrega el provider en cada
 * respuesta; aquí no hay ninguno escrito.
 */
import { describe, expect, test } from 'bun:test'

import { classifyResponse } from '../registryResult.js'

function response(status: number, headers: Record<string, string> = {}, body = ''): Response {
  return new Response(body, { status, headers })
}

describe('classifyResponse', () => {
  test('2xx es success', () => {
    expect(classifyResponse(response(200)).status).toBe('success')
    expect(classifyResponse(response(201)).status).toBe('success')
  })

  test('401 y 403 son unauthorized', () => {
    expect(classifyResponse(response(401)).status).toBe('unauthorized')
    expect(classifyResponse(response(403)).status).toBe('unauthorized')
  })

  test('404 es not_found', () => {
    expect(classifyResponse(response(404)).status).toBe('not_found')
  })

  test('429 con cabeceras de límite conserva lo que el provider reportó, sin constantes', () => {
    const result = classifyResponse(response(429, {
      'ratelimit-limit': '100;w=3600',
      'ratelimit-remaining': '0;w=3600',
      'retry-after': '120',
      'docker-ratelimit-source': '160.79.106.133',
    }))
    expect(result.status).toBe('rate_limited')
    if (result.status !== 'rate_limited') return
    expect(result.rateLimit).toEqual({
      kind: 'pull-rate',
      limit: 100,
      remaining: 0,
      windowSeconds: 3600,
      retryAfterSeconds: 120,
      source: '160.79.106.133',
    })
  })

  test('los valores son los de la respuesta, no los de otra medición', () => {
    const result = classifyResponse(response(429, { 'ratelimit-limit': '200;w=21600', 'ratelimit-remaining': '7;w=21600' }))
    if (result.status !== 'rate_limited') throw new Error('debía ser rate_limited')
    expect(result.rateLimit.limit).toBe(200)
    expect(result.rateLimit.windowSeconds).toBe(21600)
    expect(result.rateLimit.remaining).toBe(7)
  })

  test('las cabeceras x-ratelimit-* también cuentan', () => {
    const result = classifyResponse(response(429, { 'x-ratelimit-limit': '50;w=60', 'x-ratelimit-remaining': '0;w=60' }))
    if (result.status !== 'rate_limited') throw new Error('debía ser rate_limited')
    expect(result.rateLimit.limit).toBe(50)
    expect(result.rateLimit.windowSeconds).toBe(60)
  })

  test('Retry-After como fecha HTTP se convierte en segundos desde ahora', () => {
    const now = Date.parse('2026-10-01T07:00:00Z')
    const result = classifyResponse(response(429, { 'retry-after': 'Thu, 01 Oct 2026 07:02:00 GMT' }), () => now)
    if (result.status !== 'rate_limited') throw new Error('debía ser rate_limited')
    expect(result.rateLimit.retryAfterSeconds).toBe(120)
  })

  test('un 429 sin cabeceras de límite de pulls no se presenta como límite de pulls', () => {
    const result = classifyResponse(response(429))
    if (result.status !== 'rate_limited') throw new Error('debía ser rate_limited')
    expect(result.rateLimit.kind).toBe('unclassified')
    expect(result.rateLimit.limit).toBeUndefined()
  })

  test('un 5xx u otro código es provider_error con su estado HTTP', () => {
    const result = classifyResponse(response(503))
    expect(result.status).toBe('provider_error')
    if (result.status === 'provider_error') expect(result.httpStatus).toBe(503)
  })
})
