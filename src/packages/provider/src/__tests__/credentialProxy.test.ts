/**
 * El túnel de credencial por socket Unix: el cliente habla con un proxy local
 * que es el ÚNICO que tiene la credencial.
 *
 * Contrato portado de 2.1.283 (`bin/binary`, banco
 * `.claude/workbench/unix-socket-proxy-*`):
 * - `i1` decide el túnel: `ANTHROPIC_UNIX_SOCKET` presente, sin
 *   `ANTHROPIC_AUTH_TOKEN`, y exactamente una de las dos credenciales igual
 *   al marcador `nRe = "ssh-placeholder"`;
 * - en túnel el cliente no manda credencial (`dt`: `authHeaders` vacíos,
 *   tipo de autenticación `"proxy"`); la pone quien escucha en el socket.
 *
 * Qué haría fallar a este control:
 * - que el cliente en túnel mandara el marcador como credencial (caso 3);
 * - que el proxy reenviara la credencial que trae la petición en vez de la
 *   suya, o que dejara pasar el marcador al servicio (caso 5);
 * - que el túnel se activara con una credencial real, que así viajaría por
 *   un socket que no la necesita (caso 2).
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { startAnthropicMockServer, type AnthropicMockServer } from '../anthropicMockServer.ts'
import { authHeaders, resolveCredential, SSH_PLACEHOLDER, tunnelSocket } from '../credentials.ts'
import { startCredentialProxy, type CredentialProxy } from '../credentialProxy.ts'

describe('tunnelSocket — la regla i1', () => {
  test('1. con el marcador en el token OAuth y sin llave, el socket es el túnel', () => {
    expect(tunnelSocket({ ANTHROPIC_UNIX_SOCKET: '/s', THYROX_CODE_OAUTH_TOKEN: SSH_PLACEHOLDER })).toBe('/s')
    expect(tunnelSocket({ ANTHROPIC_UNIX_SOCKET: '/s', ANTHROPIC_API_KEY: SSH_PLACEHOLDER })).toBe('/s')
  })

  test('2. con una credencial real, o con ANTHROPIC_AUTH_TOKEN, no hay túnel', () => {
    expect(tunnelSocket({ ANTHROPIC_UNIX_SOCKET: '/s', ANTHROPIC_API_KEY: 'sk-real' })).toBeUndefined()
    expect(tunnelSocket({ ANTHROPIC_UNIX_SOCKET: '/s', THYROX_CODE_OAUTH_TOKEN: SSH_PLACEHOLDER, ANTHROPIC_AUTH_TOKEN: 't' })).toBeUndefined()
    expect(tunnelSocket({ ANTHROPIC_UNIX_SOCKET: '/s', THYROX_CODE_OAUTH_TOKEN: SSH_PLACEHOLDER, ANTHROPIC_API_KEY: SSH_PLACEHOLDER })).toBeUndefined()
    expect(tunnelSocket({ THYROX_CODE_OAUTH_TOKEN: SSH_PLACEHOLDER })).toBeUndefined()
  })

  test('3. en túnel el cliente resuelve la fuente "proxy" y no manda credencial', () => {
    const credential = resolveCredential({ ANTHROPIC_UNIX_SOCKET: '/s', ANTHROPIC_API_KEY: SSH_PLACEHOLDER })
    expect([credential.source, credential.unixSocket]).toEqual(['proxy', '/s'])
    expect(authHeaders(credential)).toEqual({})
  })
})

describe('startCredentialProxy', () => {
  let upstream: AnthropicMockServer | undefined
  let proxy: CredentialProxy | undefined
  let dir: string | undefined

  afterEach(async () => {
    await proxy?.close()
    await upstream?.close()
    if (dir) rmSync(dir, { recursive: true, force: true })
    proxy = upstream = dir = undefined
  })

  async function setup(seen: Array<Record<string, unknown>>) {
    upstream = await startAnthropicMockServer({
      host: '127.0.0.1',
      respond: (_body, request) => { seen.push(request.headers); return {} },
    })
    dir = mkdtempSync(join(tmpdir(), 'credential-proxy-'))
    proxy = await startCredentialProxy({
      socketPath: join(dir, 'api.sock'),
      upstream: upstream.url,
      credential: { source: 'ANTHROPIC_API_KEY', kind: 'api_key', secret: 'sk-real' },
    })
    return proxy.socketPath
  }

  test('4. reenvía la petición y devuelve la respuesta del servicio', async () => {
    const socketPath = await setup([])
    const response = await fetch('http://localhost/v1/messages', {
      method: 'POST', unix: socketPath,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-5', max_tokens: 8, messages: [{ role: 'user', content: 'hi' }] }),
    } as RequestInit)
    expect(response.status).toBe(200)
    expect(((await response.json()) as { id?: string }).id).toBe('msg_mock')
  })

  test('5. la credencial del servicio es la del proxy, nunca la que trae la petición', async () => {
    const seen: Array<Record<string, unknown>> = []
    const socketPath = await setup(seen)
    await fetch('http://localhost/v1/messages', {
      method: 'POST', unix: socketPath,
      headers: { 'content-type': 'application/json', 'x-api-key': SSH_PLACEHOLDER, authorization: `Bearer ${SSH_PLACEHOLDER}` },
      body: JSON.stringify({ model: 'claude-sonnet-5', max_tokens: 8, messages: [{ role: 'user', content: 'hi' }] }),
    } as RequestInit)
    expect(seen).toHaveLength(1)
    expect([seen[0]!['x-api-key'], seen[0]!['authorization']]).toEqual(['sk-real', undefined])
  })

  test('6. sin credencial propia el proxy rehúsa arrancar', async () => {
    dir = mkdtempSync(join(tmpdir(), 'credential-proxy-'))
    await expect(startCredentialProxy({
      socketPath: join(dir, 'api.sock'), upstream: 'http://127.0.0.1:9', credential: { source: 'none' },
    })).rejects.toThrow(/credencial/)
  })
})
