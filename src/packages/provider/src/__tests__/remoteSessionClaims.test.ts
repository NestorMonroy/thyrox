/**
 * Claims del token de una sesión de trabajo remota, según 2.1.283
 * (`chunk-t6pwageh.js`): `eo` con sus internos `Ndt`, `dqn`, `Vi`, `Nl`,
 * `oF` y `Zr`, más `U6e` de `chunk-1ay853f5.js`.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import {
  hasByocSessionWorkerClaims,
  hasRemoteSessionWorkerClaims,
  hasServiceAgentClaims,
  isByocRemoteEnvironment,
  isNonEmptyString,
  parseSessionTokenClaims,
  readRemoteSessionClaims,
  readSessionAccessToken,
} from '../remoteSessionClaims.js'

function encodeClaims(claims: unknown): string {
  return Buffer.from(JSON.stringify(claims)).toString('base64url')
}

function tokenFor(claims: unknown, prefix = ''): string {
  return `${prefix}header.${encodeClaims(claims)}.signature`
}

const VARIABLES = ['THYROX_CODE_SESSION_ACCESS_TOKEN', 'THYROX_CODE_REMOTE', 'THYROX_CODE_ENVIRONMENT_KIND']
let saved: Record<string, string | undefined> = {}
beforeEach(() => {
  saved = Object.fromEntries(VARIABLES.map(name => [name, process.env[name]]))
  for (const name of VARIABLES) delete process.env[name]
})
afterEach(() => {
  for (const name of VARIABLES) {
    if (saved[name] === undefined) delete process.env[name]
    else process.env[name] = saved[name]
  }
})

describe('isNonEmptyString (Zr)', () => {
  test('sólo un string no vacío', () => {
    expect(isNonEmptyString('x')).toBe(true)
    expect(isNonEmptyString('')).toBe(false)
    expect(isNonEmptyString(undefined)).toBe(false)
    expect(isNonEmptyString(1)).toBe(false)
  })
})

describe('parseSessionTokenClaims (oF)', () => {
  test('decodifica el segmento central de un JWT', () => {
    expect(parseSessionTokenClaims(tokenFor({ sub: 'u1' }))).toEqual({ sub: 'u1' })
  })

  test('tolera el prefijo sk-ant-si-', () => {
    expect(parseSessionTokenClaims(tokenFor({ sub: 'u1' }, 'sk-ant-si-'))).toEqual({ sub: 'u1' })
  })

  test('null sin tres segmentos', () => {
    expect(parseSessionTokenClaims('sólo-un-segmento')).toBeNull()
    expect(parseSessionTokenClaims('a.b')).toBeNull()
  })

  test('null con el segmento central vacío', () => {
    expect(parseSessionTokenClaims('a..c')).toBeNull()
  })

  test('null si el segmento central no decodifica a JSON', () => {
    expect(parseSessionTokenClaims('a.no-es-base64url-json.c')).toBeNull()
  })
})

describe('readSessionAccessToken (Nl)', () => {
  test('la variable de entorno gana', () => {
    process.env.THYROX_CODE_SESSION_ACCESS_TOKEN = 'tok-env'
    expect(readSessionAccessToken(() => 'tok-fallback')).toBe('tok-env')
  })

  test('sin variable, cae al fallback inyectado (B, fuera de alcance)', () => {
    expect(readSessionAccessToken(() => 'tok-fallback')).toBe('tok-fallback')
  })

  test('una variable vacía también cae al fallback', () => {
    process.env.THYROX_CODE_SESSION_ACCESS_TOKEN = ''
    expect(readSessionAccessToken(() => 'tok-fallback')).toBe('tok-fallback')
  })

  test('sin variable ni fallback, undefined', () => {
    expect(readSessionAccessToken()).toBeUndefined()
  })
})

describe('readRemoteSessionClaims (Vi)', () => {
  test('null sin token', () => {
    expect(readRemoteSessionClaims()).toBeNull()
  })

  test('las claims del token, como objeto', () => {
    process.env.THYROX_CODE_SESSION_ACCESS_TOKEN = tokenFor({ sub: 'u1' })
    expect(readRemoteSessionClaims()).toEqual({ sub: 'u1' })
  })

  test('null si el cuerpo decodificado no es un objeto plano', () => {
    process.env.THYROX_CODE_SESSION_ACCESS_TOKEN = tokenFor(['no', 'objeto'])
    expect(readRemoteSessionClaims()).toBeNull()
    process.env.THYROX_CODE_SESSION_ACCESS_TOKEN = tokenFor('texto')
    expect(readRemoteSessionClaims()).toBeNull()
  })
})

describe('isByocRemoteEnvironment (U6e)', () => {
  test('exige las dos variables', () => {
    expect(isByocRemoteEnvironment()).toBe(false)
    process.env.THYROX_CODE_REMOTE = 'true'
    expect(isByocRemoteEnvironment()).toBe(false)
    process.env.THYROX_CODE_ENVIRONMENT_KIND = 'byoc'
    expect(isByocRemoteEnvironment()).toBe(true)
  })

  test('otro valor de environment_kind no cuenta', () => {
    process.env.THYROX_CODE_REMOTE = 'true'
    process.env.THYROX_CODE_ENVIRONMENT_KIND = 'sdk'
    expect(isByocRemoteEnvironment()).toBe(false)
  })
})

describe('hasServiceAgentClaims (Ndt)', () => {
  test('org_service_name y code_agent_id, sin account_uuid ni sub', () => {
    process.env.THYROX_CODE_SESSION_ACCESS_TOKEN = tokenFor({
      org_service_name: 'svc',
      code_agent_id: 'agent-1',
    })
    expect(hasServiceAgentClaims()).toBe(true)
  })

  test('con account_uuid, falso', () => {
    process.env.THYROX_CODE_SESSION_ACCESS_TOKEN = tokenFor({
      org_service_name: 'svc',
      code_agent_id: 'agent-1',
      account_uuid: 'a1',
    })
    expect(hasServiceAgentClaims()).toBe(false)
  })

  test('con sub, falso', () => {
    process.env.THYROX_CODE_SESSION_ACCESS_TOKEN = tokenFor({
      org_service_name: 'svc',
      code_agent_id: 'agent-1',
      sub: 'u1',
    })
    expect(hasServiceAgentClaims()).toBe(false)
  })

  test('sin org_service_name o vacío, falso', () => {
    process.env.THYROX_CODE_SESSION_ACCESS_TOKEN = tokenFor({ code_agent_id: 'agent-1' })
    expect(hasServiceAgentClaims()).toBe(false)
    process.env.THYROX_CODE_SESSION_ACCESS_TOKEN = tokenFor({ org_service_name: '', code_agent_id: 'agent-1' })
    expect(hasServiceAgentClaims()).toBe(false)
  })

  test('sin claims, falso', () => {
    expect(hasServiceAgentClaims()).toBe(false)
  })
})

describe('hasByocSessionWorkerClaims (dqn)', () => {
  function setByoc() {
    process.env.THYROX_CODE_REMOTE = 'true'
    process.env.THYROX_CODE_ENVIRONMENT_KIND = 'byoc'
  }

  test('ccr:role session_worker, byoc, sin account, con code_agent_id', () => {
    setByoc()
    process.env.THYROX_CODE_SESSION_ACCESS_TOKEN = tokenFor({
      'ccr:role': 'session_worker',
      code_agent_id: 'agent-1',
    })
    expect(hasByocSessionWorkerClaims()).toBe(true)
  })

  test('fuera de byoc, falso aunque las claims calcen', () => {
    process.env.THYROX_CODE_SESSION_ACCESS_TOKEN = tokenFor({
      'ccr:role': 'session_worker',
      code_agent_id: 'agent-1',
    })
    expect(hasByocSessionWorkerClaims()).toBe(false)
  })

  test('con account_uuid o ccr:account_id, falso', () => {
    setByoc()
    process.env.THYROX_CODE_SESSION_ACCESS_TOKEN = tokenFor({
      'ccr:role': 'session_worker',
      code_agent_id: 'agent-1',
      'ccr:account_id': 'a1',
    })
    expect(hasByocSessionWorkerClaims()).toBe(false)
  })

  test('otro rol, falso', () => {
    setByoc()
    process.env.THYROX_CODE_SESSION_ACCESS_TOKEN = tokenFor({
      'ccr:role': 'otro',
      code_agent_id: 'agent-1',
    })
    expect(hasByocSessionWorkerClaims()).toBe(false)
  })
})

describe('hasRemoteSessionWorkerClaims (eo)', () => {
  test('verdadero si cualquiera de las dos formas de claims calza', () => {
    process.env.THYROX_CODE_SESSION_ACCESS_TOKEN = tokenFor({
      org_service_name: 'svc',
      code_agent_id: 'agent-1',
    })
    expect(hasRemoteSessionWorkerClaims()).toBe(true)

    process.env.THYROX_CODE_REMOTE = 'true'
    process.env.THYROX_CODE_ENVIRONMENT_KIND = 'byoc'
    process.env.THYROX_CODE_SESSION_ACCESS_TOKEN = tokenFor({
      'ccr:role': 'session_worker',
      code_agent_id: 'agent-1',
    })
    expect(hasRemoteSessionWorkerClaims()).toBe(true)
  })

  test('falso sin ninguna de las dos', () => {
    expect(hasRemoteSessionWorkerClaims()).toBe(false)
    process.env.THYROX_CODE_SESSION_ACCESS_TOKEN = tokenFor({ sub: 'u1' })
    expect(hasRemoteSessionWorkerClaims()).toBe(false)
  })
})
