/** `ale`/`IJe`/`M9`/`D9` de 2.1.275. */
import { afterEach, describe, expect, test } from 'bun:test'
import {
  formatAutoUpdaterDisabledReason,
  getAutoUpdaterDisabledReason,
  isAutoUpdaterDisabled,
  shouldSkipPluginAutoupdate,
} from '../global/autoUpdater.ts'

const KEYS = ['DISABLE_UPDATES', 'DISABLE_AUTOUPDATER', 'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC', 'FORCE_AUTOUPDATE_PLUGINS']
const saved = Object.fromEntries(KEYS.map(k => [k, process.env[k]]))
afterEach(() => {
  for (const k of KEYS) saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k])
})
function env(v: Record<string, string>) {
  for (const k of KEYS) delete process.env[k]
  Object.assign(process.env, v)
}

describe('getAutoUpdaterDisabledReason', () => {
  test('sin nada, null', () => {
    env({})
    expect(getAutoUpdaterDisabledReason({})).toBeNull()
  })
  test('el orden de las variables decide cuál se informa', () => {
    env({ DISABLE_UPDATES: '1', DISABLE_AUTOUPDATER: '1' })
    expect(getAutoUpdaterDisabledReason({})).toEqual({ type: 'env', envVar: 'DISABLE_UPDATES' })
    env({ DISABLE_AUTOUPDATER: '1', CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1' })
    expect(getAutoUpdaterDisabledReason({})).toEqual({ type: 'env', envVar: 'DISABLE_AUTOUPDATER' })
    env({ CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1' })
    expect(getAutoUpdaterDisabledReason({})).toEqual({ type: 'env', envVar: 'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC' })
  })
  test('autoUpdates false en la config, salvo nativa protegida', () => {
    env({})
    expect(getAutoUpdaterDisabledReason({ autoUpdates: false })).toEqual({ type: 'config' })
    expect(getAutoUpdaterDisabledReason({ autoUpdates: false, installMethod: 'native' })).toEqual({ type: 'config' })
    expect(
      getAutoUpdaterDisabledReason({ autoUpdates: false, installMethod: 'native', autoUpdatesProtectedForNative: true }),
    ).toBeNull()
  })
})

describe('formatAutoUpdaterDisabledReason', () => {
  test('los tres textos', () => {
    expect(formatAutoUpdaterDisabledReason({ type: 'development' })).toBe('development build')
    expect(formatAutoUpdaterDisabledReason({ type: 'env', envVar: 'X' })).toBe('set by env: X')
    expect(formatAutoUpdaterDisabledReason({ type: 'config' })).toBe('config')
  })
})

describe('shouldSkipPluginAutoupdate', () => {
  test('apagado salta plugins salvo que se fuerce', () => {
    env({ DISABLE_AUTOUPDATER: '1' })
    expect(isAutoUpdaterDisabled({})).toBe(true)
    expect(shouldSkipPluginAutoupdate({})).toBe(true)
    env({ DISABLE_AUTOUPDATER: '1', FORCE_AUTOUPDATE_PLUGINS: '1' })
    expect(shouldSkipPluginAutoupdate({})).toBe(false)
  })
})
