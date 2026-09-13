/**
 * `anthropicMockServer.ts` (T-10) — servidor local (loopback) con la forma de
 * la Messages API, para que `AnthropicHttpProvider` le pegue de verdad en
 * pruebas en vez de contra `https://api.anthropic.com`.
 *
 * `resolveMockServerHost`/`resolveMockServerExposureWarning` son un porte de
 * `OmniRoute/bin/cli/utils/serverHost.mjs` (`resolveServerHost`/
 * `resolveExposureWarning`) -- misma logica y mismos `LOOPBACK_HOSTS`, con el
 * nombre de la variable de entorno propio de este arbol
 * (`THYROX_MOCK_SERVER_HOST` en vez de `OMNIROUTE_SERVER_HOST`, declarado
 * porque el nombre no es del mecanismo sino del consumidor). El resto --
 * `THYROX_MOCK_SERVER_REQUIRE_API_KEY`, la comparacion `!==` en vez de la
 * inclusion en `Set` para el caso win32 -- es identico a la fuente.
 */
import { describe, expect, test } from 'bun:test'
import {
  resolveMockServerHost,
  resolveMockServerExposureWarning,
  startAnthropicMockServer,
} from '../src/anthropicMockServer.ts'

describe('resolveMockServerHost -- porte de resolveServerHost (OmniRoute)', () => {
  test('sin nada declarado, el default es 0.0.0.0 -- igual que la fuente', () => {
    expect(resolveMockServerHost({}, 'linux', 'una-maquina')).toBe('0.0.0.0')
  })

  test('THYROX_MOCK_SERVER_HOST manda sobre cualquier plataforma', () => {
    expect(resolveMockServerHost({ THYROX_MOCK_SERVER_HOST: '127.0.0.1' }, 'linux', 'x')).toBe('127.0.0.1')
    expect(resolveMockServerHost({ THYROX_MOCK_SERVER_HOST: '127.0.0.1' }, 'win32', 'x')).toBe('127.0.0.1')
  })

  test('en win32, HOSTNAME distinto del de la maquina es el respaldo legado', () => {
    expect(resolveMockServerHost({ HOSTNAME: 'otro' }, 'win32', 'esta-maquina')).toBe('otro')
  })

  test('en win32, HOSTNAME IGUAL al de la maquina no cuenta -- es el nombre del SO, no config', () => {
    expect(resolveMockServerHost({ HOSTNAME: 'esta-maquina' }, 'win32', 'esta-maquina')).toBe('0.0.0.0')
  })

  test('fuera de win32, HOSTNAME se ignora aunque exista', () => {
    expect(resolveMockServerHost({ HOSTNAME: 'otro' }, 'linux', 'esta-maquina')).toBe('0.0.0.0')
  })
})

describe('resolveMockServerExposureWarning -- porte de resolveExposureWarning', () => {
  test('loopback nunca avisa, con o sin llave', () => {
    for (const host of ['127.0.0.1', 'localhost', '::1', '[::1]']) {
      expect(resolveMockServerExposureWarning({}, host)).toBeNull()
    }
  })

  test('0.0.0.0 sin THYROX_MOCK_SERVER_REQUIRE_API_KEY avisa, nombrando el host', () => {
    const aviso = resolveMockServerExposureWarning({}, '0.0.0.0')
    expect(aviso).toContain('0.0.0.0')
    expect(aviso).toContain('SECURITY')
  })

  test('0.0.0.0 con THYROX_MOCK_SERVER_REQUIRE_API_KEY=true no avisa', () => {
    expect(resolveMockServerExposureWarning({ THYROX_MOCK_SERVER_REQUIRE_API_KEY: 'true' }, '0.0.0.0')).toBeNull()
  })
})

describe('startAnthropicMockServer -- el servidor real, en loopback con puerto efimero', () => {
  test('responde POST /v1/messages con la forma real de la Messages API', async () => {
    const servidor = await startAnthropicMockServer({ host: '127.0.0.1', port: 0 })
    try {
      expect(servidor.host).toBe('127.0.0.1')
      expect(servidor.port).toBeGreaterThan(0)
      expect(servidor.url).toBe(`http://127.0.0.1:${servidor.port}`)

      const res = await fetch(`${servidor.url}/v1/messages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': 'sk-mock', 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-opus-5', max_tokens: 100, messages: [{ role: 'user', content: 'hola' }] }),
      })
      expect(res.status).toBe(200)
      const cuerpo = await res.json() as Record<string, unknown>
      expect(cuerpo.model).toBe('claude-opus-5')
      expect(cuerpo.stop_reason).toBe('end_turn')
      expect(cuerpo.content).toEqual([{ type: 'text', text: 'ok desde el servidor local' }])

      expect(servidor.requests.length).toBe(1)
      expect(servidor.requests[0]!.path).toBe('/v1/messages')
      expect(servidor.requests[0]!.headers['x-api-key']).toBe('sk-mock')
      expect((servidor.requests[0]!.body as { model: string }).model).toBe('claude-opus-5')
    } finally {
      await servidor.close()
    }
  })

  test('la respuesta se puede personalizar por request', async () => {
    const servidor = await startAnthropicMockServer({
      host: '127.0.0.1', port: 0,
      respond: (cuerpo) => ({ content: [{ type: 'text', text: `eco: ${(cuerpo as { model: string }).model}` }] }),
    })
    try {
      const res = await fetch(`${servidor.url}/v1/messages`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-5', max_tokens: 10, messages: [] }),
      })
      const cuerpo = await res.json() as { content: Array<{ text: string }> }
      expect(cuerpo.content[0]!.text).toBe('eco: claude-sonnet-5')
    } finally {
      await servidor.close()
    }
  })

  test('cerrado, el puerto queda libre -- una segunda conexion falla', async () => {
    const servidor = await startAnthropicMockServer({ host: '127.0.0.1', port: 0 })
    const url = servidor.url
    await servidor.close()
    await expect(fetch(`${url}/v1/messages`, { method: 'POST' })).rejects.toThrow()
  })
})
