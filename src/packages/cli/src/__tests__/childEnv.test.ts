import { describe, expect, test } from 'bun:test'

import {
  buildPtyHostChildEnv,
  ENV_FORWARD_ALLOWLIST,
  isHostManagedProviderEnv,
  needsRevivalGuard,
} from '../bg/childEnv.js'

describe('ENV_FORWARD_ALLOWLIST', () => {
  test('renombra las variables CLAUDE_CODE_* que sí tienen equivalente THYROX_CODE_*', () => {
    expect(ENV_FORWARD_ALLOWLIST).toContain('THYROX_CODE_USE_BEDROCK')
    expect(ENV_FORWARD_ALLOWLIST).toContain('THYROX_CODE_SUBAGENT_MODEL')
    expect(ENV_FORWARD_ALLOWLIST).toContain('THYROX_CODE_EXTRA_BODY')
    expect(ENV_FORWARD_ALLOWLIST).toContain('THYROX_CODE_HOST_GATEWAY_LINEAGE')
    expect(ENV_FORWARD_ALLOWLIST).toContain('THYROX_CODE_HOST_CREDS_FILE')
    expect(ENV_FORWARD_ALLOWLIST).toContain('THYROX_CODE_PROVIDER_MANAGED_BY_HOST')
  })

  test('conserva las variables de servicio (ANTHROPIC_*/CLOUD_ML_REGION) sin renombrar', () => {
    expect(ENV_FORWARD_ALLOWLIST).toContain('ANTHROPIC_BASE_URL')
    expect(ENV_FORWARD_ALLOWLIST).toContain('ANTHROPIC_CUSTOM_HEADERS')
    expect(ENV_FORWARD_ALLOWLIST).toContain('CLOUD_ML_REGION')
  })

  test('no fabrica un nombre THYROX_* para una variable sin equivalente — queda fuera', () => {
    // CLAUDE_CODE_CLIENT_DATA_URL no tiene THYROX_CODE_CLIENT_DATA_URL en el
    // resto del árbol (medido); no se inventa aquí.
    expect(ENV_FORWARD_ALLOWLIST).not.toContain('THYROX_CODE_CLIENT_DATA_URL')
    expect(ENV_FORWARD_ALLOWLIST).not.toContain('CLAUDE_CODE_CLIENT_DATA_URL')
  })
})

describe('isHostManagedProviderEnv', () => {
  test('falso sin la bandera', () => {
    expect(isHostManagedProviderEnv({})).toBe(false)
  })

  test('verdadero con THYROX_CODE_PROVIDER_MANAGED_BY_HOST=1', () => {
    expect(isHostManagedProviderEnv({ THYROX_CODE_PROVIDER_MANAGED_BY_HOST: '1' })).toBe(true)
  })
})

describe('needsRevivalGuard', () => {
  test('verdadero cuando el proveedor NO está gestionado por el host', () => {
    expect(needsRevivalGuard({})).toBe(true)
  })

  test('falso cuando el proveedor SÍ está gestionado por el host', () => {
    expect(needsRevivalGuard({ THYROX_CODE_PROVIDER_MANAGED_BY_HOST: '1' })).toBe(false)
  })
})

describe('buildPtyHostChildEnv', () => {
  test('retira del entorno heredado una variable del allowlist no reenviada explícitamente', () => {
    const base = { ANTHROPIC_BASE_URL: 'https://ejemplo.invalid', HOME: '/home/user' }
    const out = buildPtyHostChildEnv(base)
    expect(out.ANTHROPIC_BASE_URL).toBeUndefined()
    expect(out.HOME).toBe('/home/user')
  })

  test('conserva una variable del allowlist cuando se reenvía explícitamente', () => {
    const base = { ANTHROPIC_BASE_URL: 'https://ejemplo.invalid' }
    const out = buildPtyHostChildEnv(base, { ANTHROPIC_BASE_URL: 'https://forwarded.invalid' })
    expect(out.ANTHROPIC_BASE_URL).toBe('https://forwarded.invalid')
  })

  test('con el proveedor gestionado por el host SÓLO heredado, retira las credenciales aunque la propia bandera no sobreviva (no fue reenviada)', () => {
    const base = {
      THYROX_CODE_PROVIDER_MANAGED_BY_HOST: '1',
      ANTHROPIC_API_KEY: 'sk-secreta',
    }
    const out = buildPtyHostChildEnv(base)
    expect(out.ANTHROPIC_API_KEY).toBeUndefined()
    // La bandera también está en el allowlist: sin reenvío explícito se
    // recorta igual que cualquier otra variable — el recorte de
    // credenciales ya se decidió antes, contra el entorno heredado.
    expect(out.THYROX_CODE_PROVIDER_MANAGED_BY_HOST).toBeUndefined()
  })

  test('con el proveedor gestionado por el host reenviado explícito, la bandera sobrevive y las credenciales se recortan igual', () => {
    const base = { ANTHROPIC_API_KEY: 'sk-secreta' }
    const out = buildPtyHostChildEnv(base, { THYROX_CODE_PROVIDER_MANAGED_BY_HOST: '1' })
    expect(out.ANTHROPIC_API_KEY).toBeUndefined()
    expect(out.THYROX_CODE_PROVIDER_MANAGED_BY_HOST).toBe('1')
  })

  test('sin la bandera de host gestionado, una credencial heredada no se toca', () => {
    const base = { ANTHROPIC_API_KEY: 'sk-secreta' }
    const out = buildPtyHostChildEnv(base)
    expect(out.ANTHROPIC_API_KEY).toBe('sk-secreta')
  })
})
