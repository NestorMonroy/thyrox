import { describe, expect, test } from 'bun:test'
import { authHeaders, OAUTH_BETA, resolveCredential, scrubChildEnv } from '../src/credentials.ts'
import { AnthropicHttpProvider } from '../src/anthropicHttp.ts'

const sinFd = () => {
  throw new Error('no se esperaba leer un fd')
}

describe('resolveCredential — la cadena jc()/Qf() de 2.1.282 con nombres THYROX', () => {
  test('sin nada declarado la fuente es none', () => {
    expect(resolveCredential({}, sinFd)).toEqual({ source: 'none' })
  })

  test('ANTHROPIC_API_KEY viaja como x-api-key', () => {
    const c = resolveCredential({ ANTHROPIC_API_KEY: 'k' }, sinFd)
    expect(c).toEqual({ source: 'ANTHROPIC_API_KEY', kind: 'api_key', secret: 'k' })
    expect(authHeaders(c)).toEqual({ 'x-api-key': 'k' })
  })

  test('ANTHROPIC_AUTH_TOKEN gana a la llave y va como Bearer', () => {
    const c = resolveCredential({ ANTHROPIC_AUTH_TOKEN: 't', ANTHROPIC_API_KEY: 'k' }, sinFd)
    expect(c).toEqual({ source: 'ANTHROPIC_AUTH_TOKEN', kind: 'bearer', secret: 't' })
    expect(authHeaders(c)).toEqual({ authorization: 'Bearer t' })
  })

  test('THYROX_CODE_OAUTH_TOKEN es OAuth: Bearer más la beta oauth', () => {
    const c = resolveCredential({ THYROX_CODE_OAUTH_TOKEN: 'o' }, sinFd)
    expect(c).toEqual({ source: 'THYROX_CODE_OAUTH_TOKEN', kind: 'oauth', secret: 'o' })
    expect(authHeaders(c)).toEqual({ authorization: 'Bearer o', 'anthropic-beta': OAUTH_BETA })
  })

  test('el token por descriptor se lee del fd declarado y se recorta', () => {
    const leidos: number[] = []
    const c = resolveCredential({ THYROX_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR: '7' }, (fd) => {
      leidos.push(fd)
      return '  tok\n'
    })
    expect(leidos).toEqual([7])
    expect(c).toEqual({ source: 'THYROX_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR', kind: 'oauth', secret: 'tok' })
  })

  test('un descriptor que no es número no se lee y lo dice', () => {
    const c = resolveCredential({ THYROX_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR: 'x' }, sinFd)
    expect(c.source).toBe('none')
    expect(c.error).toContain('THYROX_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR')
  })

  test('un descriptor vacío o ilegible cae a la siguiente fuente con el motivo', () => {
    const c = resolveCredential({ THYROX_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR: '9', ANTHROPIC_API_KEY: 'k' }, () => '')
    expect(c.source).toBe('ANTHROPIC_API_KEY')
    expect(c.error).toContain('vacío')
  })

  test('las variables del cliente ajeno NO se leen: los nombres propios son THYROX_CODE_*', () => {
    const c = resolveCredential({ CLAUDE_CODE_OAUTH_TOKEN: 'o', CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR: '3' }, sinFd) // thyrox-rename: keep — el nombre del anfitrión no se lee
    expect(c.source).toBe('none')
  })

  test('ANTHROPIC_UNIX_SOCKET se declara como transporte', () => {
    const c = resolveCredential({ ANTHROPIC_UNIX_SOCKET: '/run/a.sock', ANTHROPIC_API_KEY: 'k' }, sinFd)
    expect(c.unixSocket).toBe('/run/a.sock')
  })
})

describe('scrubChildEnv — FNe()/Gct() de 2.1.282', () => {
  const env = {
    THYROX_CODE_PROVIDER_MANAGED_BY_HOST: '1',
    ANTHROPIC_API_KEY: 'k',
    ANTHROPIC_AUTH_TOKEN: 't',
    THYROX_CODE_OAUTH_TOKEN: 'o',
    ANTHROPIC_CUSTOM_HEADERS: 'h',
    THYROX_CODE_HOST_CREDS_FILE: '/c',
    PATH: '/bin',
  }

  test('con el proveedor en manos del anfitrión, el hijo no hereda credenciales', () => {
    expect(scrubChildEnv(env)).toEqual({ THYROX_CODE_PROVIDER_MANAGED_BY_HOST: '1', PATH: '/bin' })
  })

  test('sin la bandera no se quita nada', () => {
    const { THYROX_CODE_PROVIDER_MANAGED_BY_HOST: _, ...resto } = env
    expect(scrubChildEnv(resto)).toEqual(resto)
  })

  test('la bandera en 0 cuenta como apagada', () => {
    expect(scrubChildEnv({ ...env, THYROX_CODE_PROVIDER_MANAGED_BY_HOST: '0' }).ANTHROPIC_API_KEY).toBe('k')
  })
})

describe('AnthropicHttpProvider con la cadena de credenciales', () => {
  const respuesta = () =>
    new Response(JSON.stringify({ content: [{ type: 'text', text: 'ok' }], stop_reason: 'end_turn', usage: {} }), {
      status: 200,
    })
  const pedido = { model: 'm', system: 's', tools: [], messages: [], maxTokens: 10, cacheTtl: '1h' as const }

  test('OAuth por entorno: Bearer y las dos betas juntas', async () => {
    let init: RequestInit | undefined
    const p = new AnthropicHttpProvider({
      env: { THYROX_CODE_OAUTH_TOKEN: 'o' },
      fetchImpl: async (_u, i) => {
        init = i
        return respuesta()
      },
    })
    await p.send(pedido as never)
    const h = init?.headers as Record<string, string>
    expect(h.authorization).toBe('Bearer o')
    expect(h['x-api-key']).toBeUndefined()
    expect(h['anthropic-beta']).toBe(`${OAUTH_BETA},extended-cache-ttl-2025-04-11`)
  })

  test('sin credencial rehúsa nombrando las fuentes que busca', () => {
    expect(() => new AnthropicHttpProvider({ env: {} })).toThrow(/THYROX_CODE_OAUTH_TOKEN/)
  })

  test('con socket, la petición lleva la opción unix', async () => {
    let init: (RequestInit & { unix?: string }) | undefined
    const p = new AnthropicHttpProvider({
      env: { ANTHROPIC_UNIX_SOCKET: '/run/a.sock', ANTHROPIC_API_KEY: 'k' },
      fetchImpl: async (_u, i) => {
        init = i
        return respuesta()
      },
    })
    await p.send(pedido as never)
    expect(init?.unix).toBe('/run/a.sock')
  })
})
