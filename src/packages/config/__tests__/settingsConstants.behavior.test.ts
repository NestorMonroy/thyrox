import { afterEach, describe, expect, test } from 'bun:test'
import {
  getEnabledSettingSources,
  isSettingSourceEnabled,
  SETTING_SOURCES,
  setEnabledSettingSources,
} from '../settings/constants.js'

afterEach(() => setEnabledSettingSources(SETTING_SOURCES))

describe('enabled setting sources', () => {
  test('all declared sources are enabled by default', () => {
    expect(getEnabledSettingSources()).toEqual(SETTING_SOURCES)
  })

  test('an explicit subset governs the predicate', () => {
    setEnabledSettingSources(['userSettings', 'policySettings'])
    expect(isSettingSourceEnabled('userSettings')).toBe(true)
    expect(isSettingSourceEnabled('projectSettings')).toBe(false)
  })

  test('the setter copies its input instead of retaining mutable state', () => {
    const sources = ['localSettings'] as const
    setEnabledSettingSources(sources)
    expect(getEnabledSettingSources()).toEqual(['localSettings'])
  })
})
