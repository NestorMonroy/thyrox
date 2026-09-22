import { describe, expect, test } from 'bun:test'
import {
  TOOL_PRESETS,
  assembleToolPool,
  filterToolsByDenyRules,
  getAllBaseTools,
  getMergedTools,
  getToolRegistry,
  getTools,
  getToolsForDefaultPreset,
  installToolRegistryHostBindings,
  parseToolPreset,
} from '../index.ts'

describe('@thyrox/tool-registry public surface', () => {
  test('publishes canonical runtime and host entry points', () => {
    const functions = [
      assembleToolPool,
      filterToolsByDenyRules,
      getAllBaseTools,
      getMergedTools,
      getToolRegistry,
      getTools,
      getToolsForDefaultPreset,
      installToolRegistryHostBindings,
      parseToolPreset,
    ]

    expect(functions.every(value => typeof value === 'function')).toBe(true)
    expect(TOOL_PRESETS).toEqual(['default'])
    expect(parseToolPreset('default')).toBe('default')
    expect(parseToolPreset('unknown')).toBeNull()
  })
})
