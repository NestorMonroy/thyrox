import { useCallback, useEffect } from 'react'
import { settingsChangeDetector } from '@thyrox/config/changeDetector'
import type { SettingSource } from '@thyrox/config/constants'
import { getSettings } from '@thyrox/config/settings'
import type { SettingsJson } from '@thyrox/config/types'

export function useSettingsChange(
  onChange: (source: SettingSource, settings: SettingsJson) => void,
): void {
  const handleChange = useCallback(
    (source: SettingSource) => {
      // Cache is already reset by the notifier (changeDetector.fanOut) —
      // resetting here caused N-way thrashing with N subscribers: each
      // cleared the cache, re-read from disk, then the next cleared again.
      const newSettings = getSettings()
      onChange(source, newSettings)
    },
    [onChange],
  )

  useEffect(
    () => settingsChangeDetector.subscribe(handleChange),
    [handleChange],
  )
}
