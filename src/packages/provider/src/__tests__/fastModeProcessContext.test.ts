/**
 * El contexto de disponibilidad del modo rápido armado desde el proceso, y
 * `getFastModeUnavailableReason` sobre él (`D5` de 2.1.283).
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { installConfigHostBindings } from '@thyrox/config/host'
import { InMemoryConfig } from '@thyrox/config/testing'

import { getFastModeUnavailableReason, processFastModeAvailabilityContext } from '../fastMode.js'
import { getDefaultMainLoopModelSetting, getMainLoopModel } from '../model.js'

const VARIABLES = [
  'THYROX_CODE_DISABLE_FAST_MODE',
  'THYROX_CODE_USE_BEDROCK',
  'THYROX_CODE_SKIP_FAST_MODE_ORG_CHECK',
  'THYROX_CODE_SKIP_FAST_MODE_NETWORK_ERRORS',
  'THYROX_CODE_REMOTE',
  'THYROX_CODE_ENVIRONMENT_KIND',
  'THYROX_CODE_ENTRYPOINT',
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_MODEL',
  'THYROX_CODE_SESSION_ACCESS_TOKEN',
]
const home = mkdtempSync(join(tmpdir(), 'fast-mode-context-'))
let saved: Record<string, string | undefined> = {}
beforeEach(() => {
  saved = Object.fromEntries(VARIABLES.map(name => [name, process.env[name]]))
  for (const name of VARIABLES) delete process.env[name]
  process.env.ANTHROPIC_API_KEY = 'marcador-local-de-prueba'
  installConfigHostBindings(new InMemoryConfig({ configHomeDir: home }).bindings)
})
afterEach(() => {
  for (const name of VARIABLES) {
    if (saved[name] === undefined) delete process.env[name]
    else process.env[name] = saved[name]
  }
})

describe('processFastModeAvailabilityContext', () => {
  test('las dos variables de omisión se leen por presencia, "0" incluido', () => {
    expect(processFastModeAvailabilityContext().skipOrgCheckEnv).toBe(false)
    expect(processFastModeAvailabilityContext().skipNetworkErrorsEnv).toBe(false)
    process.env.THYROX_CODE_SKIP_FAST_MODE_ORG_CHECK = '0'
    process.env.THYROX_CODE_SKIP_FAST_MODE_NETWORK_ERRORS = '1'
    const context = processFastModeAvailabilityContext()
    expect([context.skipOrgCheckEnv, context.skipNetworkErrorsEnv]).toEqual([true, true])
  })

  test('el modelo a juzgar: el pedido tal cual, null el de la configuración, undefined el del bucle', () => {
    const context = processFastModeAvailabilityContext()
    expect(context.resolveModel('mi-modelo')).toBe('mi-modelo')
    expect(context.resolveModel(null)).toBe(String(getDefaultMainLoopModelSetting()))
    expect(context.resolveModel(undefined)).toBe(getMainLoopModel())
    process.env.ANTHROPIC_MODEL = 'claude-haiku-4-5'
    expect(processFastModeAvailabilityContext().resolveModel(undefined)).toBe('claude-haiku-4-5')
    expect(processFastModeAvailabilityContext().resolveModel(null)).toBe(String(getDefaultMainLoopModelSetting()))
  })

  test('el modelo del modo rápido es opus, con [1m] sólo si la fusión de 1M aplica', () => {
    expect(processFastModeAvailabilityContext().fastModeModel).toMatch(/^opus(\[1m\])?$/)
  })

  test('una sesión remota de cowork la gestiona un entorno remoto', () => {
    expect(processFastModeAvailabilityContext().remoteManaged).toBe(false)
    process.env.THYROX_CODE_REMOTE = 'true'
    process.env.THYROX_CODE_ENTRYPOINT = 'cli'
    expect(processFastModeAvailabilityContext().remoteManaged).toBe(false)
    process.env.THYROX_CODE_ENTRYPOINT = 'remote_cowork'
    expect(processFastModeAvailabilityContext().remoteManaged).toBe(true)
    process.env.THYROX_CODE_ENVIRONMENT_KIND = 'bridge'
    expect(processFastModeAvailabilityContext().remoteManaged).toBe(false)
  })

  test('el proveedor y el apagado por entorno', () => {
    process.env.THYROX_CODE_USE_BEDROCK = '1'
    const context = processFastModeAvailabilityContext()
    expect([context.apiProvider, context.fastModeEnabled]).toEqual(['bedrock', false])
  })
})

describe('getFastModeUnavailableReason (D5)', () => {
  test('fuera de primera parte y apagado por el entorno', () => {
    process.env.THYROX_CODE_USE_BEDROCK = '1'
    expect(getFastModeUnavailableReason()).toBe('Fast mode is only available when using the Anthropic API directly')
    delete process.env.THYROX_CODE_USE_BEDROCK
    process.env.THYROX_CODE_DISABLE_FAST_MODE = '1'
    expect(getFastModeUnavailableReason()).toBe('Fast mode is not available')
  })
})

describe('remoteManaged junta cowork y claims del token de sesión (`rn` = `uc() && Iz() || eo()`)', () => {
  const token = (claims: Record<string, unknown>) =>
    `h.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.f`

  test('sin token de sesión, no gestionado', () => {
    expect(processFastModeAvailabilityContext().remoteManaged).toBe(false)
  })

  test('un token de agente de servicio lo marca gestionado', () => {
    process.env.THYROX_CODE_SESSION_ACCESS_TOKEN = token({ org_service_name: 'svc', code_agent_id: 'a1' })
    expect(processFastModeAvailabilityContext().remoteManaged).toBe(true)
  })

  test('un token de cuenta de usuario no cuenta como agente', () => {
    process.env.THYROX_CODE_SESSION_ACCESS_TOKEN = token({ org_service_name: 'svc', code_agent_id: 'a1', sub: 'u' })
    expect(processFastModeAvailabilityContext().remoteManaged).toBe(false)
  })
})
