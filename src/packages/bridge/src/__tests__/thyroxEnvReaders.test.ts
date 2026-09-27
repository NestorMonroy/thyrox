/**
 * La conducta que gobierna cada variable THYROX_* de `@thyrox/bridge`.
 * Cada caso contrasta la variable fijada con la ausente, y con la guarda de
 * build interna que la acota.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import {
  getBridgeBaseUrlOverride,
  getBridgeSessionIngressUrlOverride,
  getBridgeTokenOverride,
  isBridgeCcrV2Forced,
} from '../bridgeConfig.ts'

const KEYS = [
  'USER_TYPE',
  'THYROX_BRIDGE_OAUTH_TOKEN',
  'THYROX_BRIDGE_BASE_URL',
  'THYROX_BRIDGE_SESSION_INGRESS_URL',
  'THYROX_BRIDGE_USE_CCR_V2',
]
const saved: Record<string, string | undefined> = {}
beforeEach(() => {
  for (const key of KEYS) {
    saved[key] = process.env[key]
    delete process.env[key]
  }
})
afterEach(() => {
  for (const key of KEYS) {
    if (saved[key] === undefined) delete process.env[key]
    else process.env[key] = saved[key]
  }
})

describe('THYROX_BRIDGE_OAUTH_TOKEN y THYROX_BRIDGE_BASE_URL', () => {
  test('en build interna sustituyen el token y la URL del puente', () => {
    process.env.USER_TYPE = 'ant'
    expect(getBridgeTokenOverride()).toBeUndefined()
    expect(getBridgeBaseUrlOverride()).toBeUndefined()
    process.env.THYROX_BRIDGE_OAUTH_TOKEN = 'tok-dev'
    process.env.THYROX_BRIDGE_BASE_URL = 'http://bridge.test'
    expect(getBridgeTokenOverride()).toBe('tok-dev')
    expect(getBridgeBaseUrlOverride()).toBe('http://bridge.test')
  })

  test('fuera de build interna se ignoran', () => {
    process.env.THYROX_BRIDGE_OAUTH_TOKEN = 'tok-dev'
    process.env.THYROX_BRIDGE_BASE_URL = 'http://bridge.test'
    expect(getBridgeTokenOverride()).toBeUndefined()
    expect(getBridgeBaseUrlOverride()).toBeUndefined()
  })
})

describe('THYROX_BRIDGE_SESSION_INGRESS_URL', () => {
  test('en build interna sustituye la URL de ingreso de sesión; fuera, no', () => {
    process.env.THYROX_BRIDGE_SESSION_INGRESS_URL = 'http://ingress.test'
    expect(getBridgeSessionIngressUrlOverride()).toBeUndefined()
    process.env.USER_TYPE = 'ant'
    expect(getBridgeSessionIngressUrlOverride()).toBe('http://ingress.test')
    delete process.env.THYROX_BRIDGE_SESSION_INGRESS_URL
    expect(getBridgeSessionIngressUrlOverride()).toBeUndefined()
  })
})

describe('THYROX_BRIDGE_USE_CCR_V2', () => {
  test('fuerza el transporte CCR v2', () => {
    expect(isBridgeCcrV2Forced()).toBe(false)
    process.env.THYROX_BRIDGE_USE_CCR_V2 = '1'
    expect(isBridgeCcrV2Forced()).toBe(true)
    process.env.THYROX_BRIDGE_USE_CCR_V2 = '0'
    expect(isBridgeCcrV2Forced()).toBe(false)
  })
})
