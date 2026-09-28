/**
 * Las cabeceras de sesión de Grok Build contra su proxy de chat: la identidad
 * del cliente (versión, identificador, modo y agente de usuario por
 * plataforma), la autenticación por token de xAI y, si se conocen, el modelo,
 * el usuario y el correo. Una cuenta de equipo u organización no envía correo.
 *
 * Porte de la parte de sesión de `omniroute: open-sse/config/grokBuild.ts` (MIT).
 */
import { describe, expect, test } from 'bun:test'

import { GROK_BUILD_MODELS_URL, GROK_BUILD_RESPONSES_URL, GROK_BUILD_SUPPORTED_REASONING_EFFORTS, grokBuildClientHeaders, grokBuildModelsHeaders, grokBuildSessionHeaders, grokBuildUserAgent } from '../../../src/accounts/grok/grokBuildSession.ts'

const linux = { platform: 'linux', arch: 'x64' }

describe('the Grok Build client identity', () => {
  test('the user agent names the platform and architecture the way the CLI does', () => {
    expect(grokBuildUserAgent({ platform: 'darwin', arch: 'arm64' })).toBe('grok-shell/1.0.41 (macos; aarch64)')
    expect(grokBuildUserAgent({ platform: 'win32', arch: 'x64' })).toBe('grok-shell/1.0.41 (windows; x86_64)')
    expect(grokBuildUserAgent({ platform: 'freebsd', arch: 'riscv64' })).toBe('grok-shell/1.0.41 (freebsd; riscv64)')
  })

  test('the client headers carry version, identifier and mode, headless by default', () => {
    expect(grokBuildClientHeaders(undefined, linux)).toEqual({ 'x-grok-client-version': '1.0.41', 'x-grok-client-identifier': 'grok-shell', 'x-grok-client-mode': 'headless', 'User-Agent': 'grok-shell/1.0.41 (linux; x86_64)' })
    expect(grokBuildClientHeaders('interactive', linux)['x-grok-client-mode']).toBe('interactive')
  })

  test('the proxy endpoints and the reasoning efforts', () => {
    expect(GROK_BUILD_RESPONSES_URL).toBe('https://cli-chat-proxy.grok.com/v1/responses')
    expect(GROK_BUILD_MODELS_URL).toBe('https://cli-chat-proxy.grok.com/v1/models')
    expect(GROK_BUILD_SUPPORTED_REASONING_EFFORTS).toEqual(['low', 'medium', 'high', 'xhigh'])
  })
})

describe('the Grok Build session headers', () => {
  test('a full session carries token, model, user and email', () => {
    expect(grokBuildSessionHeaders({ token: 't1', model: 'grok-4', stream: true, userId: 'u1', email: 'a@b.c', system: linux })).toEqual({
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      'x-grok-client-version': '1.0.41',
      'x-grok-client-identifier': 'grok-shell',
      'x-grok-client-mode': 'headless',
      'User-Agent': 'grok-shell/1.0.41 (linux; x86_64)',
      'X-XAI-Token-Auth': 'xai-grok-cli',
      'x-authenticateresponse': 'authenticate-response',
      Authorization: 'Bearer t1',
      'x-grok-model-override': 'grok-4',
      'x-userid': 'u1',
      'x-grok-user-id': 'u1',
      'x-email': 'a@b.c',
    })
  })

  test('without the optional fields only the identity goes, and a JSON accept', () => {
    const headers = grokBuildSessionHeaders({ system: linux })
    expect(headers.Accept).toBe('application/json')
    for (const key of ['Authorization', 'x-grok-model-override', 'x-userid', 'x-grok-user-id', 'x-email']) expect(headers[key]).toBeUndefined()
  })

  test('a team or organization principal sends no email, in any case', () => {
    for (const principalType of ['team', ' Organization ']) expect(grokBuildSessionHeaders({ email: 'a@b.c', principalType, system: linux })['x-email']).toBeUndefined()
    expect(grokBuildSessionHeaders({ email: 'a@b.c', principalType: 'user', system: linux })['x-email']).toBe('a@b.c')
  })
})

describe('the Grok Build models headers', () => {
  test('are always headless, without content type or model, and with the user once', () => {
    expect(grokBuildModelsHeaders({ token: 't1', userId: 'u1', email: 'a@b.c', principalType: 'organization', system: linux })).toEqual({
      Accept: 'application/json',
      'x-grok-client-version': '1.0.41',
      'x-grok-client-identifier': 'grok-shell',
      'x-grok-client-mode': 'headless',
      'User-Agent': 'grok-shell/1.0.41 (linux; x86_64)',
      'X-XAI-Token-Auth': 'xai-grok-cli',
      Authorization: 'Bearer t1',
      'x-userid': 'u1',
    })
    expect(grokBuildModelsHeaders({ email: 'a@b.c', system: linux })['x-email']).toBe('a@b.c')
  })
})
