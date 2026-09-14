import { describe, expect, test } from 'bun:test'
import {
  createCachedMCState,
  resetCachedMCState,
  markToolsSentToAPI,
  registerToolResult,
  registerToolMessage,
  getToolResultsToDelete,
  createCacheEditsBlock,
  isCachedMicrocompactEnabled,
  isModelSupportedForCacheEditing,
  getCachedMCSimpleConfig,
} from '../compaction/cachedMicrocompact.ts'
import type { CachedMCConfig } from '../compaction/types.ts'

const config = (overrides: Partial<CachedMCConfig> = {}): CachedMCConfig => ({
  enabled: true,
  triggerThreshold: 3,
  keepRecent: 1,
  supportedModels: [],
  systemPromptSuggestSummaries: false,
  ...overrides,
})

describe('createCachedMCState / resetCachedMCState', () => {
  test('el estado nace vacío', () => {
    const s = createCachedMCState()
    expect(s.registeredTools.size).toBe(0)
    expect(s.toolOrder).toEqual([])
    expect(s.deletedRefs.size).toBe(0)
    expect(s.pinnedEdits).toEqual([])
    expect(s.toolsSentToAPI).toBe(false)
  })

  test('reset limpia todo salvo pinnedEdits (los edits ya fijados no se deshacen)', () => {
    const s = createCachedMCState()
    registerToolResult(s, 't1')
    markToolsSentToAPI(s)
    s.pinnedEdits.push({ userMessageIndex: 0, block: { type: 'cache_edits', edits: [] } })
    resetCachedMCState(s)
    expect(s.registeredTools.size).toBe(0)
    expect(s.toolOrder).toEqual([])
    expect(s.toolsSentToAPI).toBe(false)
    expect(s.pinnedEdits.length).toBe(1)
  })
})

describe('registerToolResult / registerToolMessage', () => {
  test('registra en orden de llegada, sin duplicar un id ya visto', () => {
    const s = createCachedMCState()
    registerToolResult(s, 't1')
    registerToolResult(s, 't2')
    registerToolResult(s, 't1')
    expect(s.toolOrder).toEqual(['t1', 't2'])
  })

  test('un id ya borrado no se vuelve a registrar', () => {
    const s = createCachedMCState()
    registerToolResult(s, 't1')
    s.deletedRefs.add('t1')
    registerToolResult(s, 't1')
    expect(s.toolOrder).toEqual(['t1'])
  })

  test('registerToolMessage registra varios de una', () => {
    const s = createCachedMCState()
    registerToolMessage(s, ['a', 'b', 'c'])
    expect(s.toolOrder).toEqual(['a', 'b', 'c'])
  })
})

describe('getToolResultsToDelete', () => {
  test('config deshabilitada: nunca borra nada', () => {
    const s = createCachedMCState()
    registerToolMessage(s, ['a', 'b', 'c', 'd'])
    expect(getToolResultsToDelete(s, config({ enabled: false }))).toEqual([])
  })

  test('por debajo del triggerThreshold: no borra', () => {
    const s = createCachedMCState()
    registerToolMessage(s, ['a', 'b'])
    expect(getToolResultsToDelete(s, config({ triggerThreshold: 3 }))).toEqual([])
  })

  test('al alcanzar el umbral, borra todos menos los keepRecent más nuevos, y los marca borrados', () => {
    const s = createCachedMCState()
    registerToolMessage(s, ['a', 'b', 'c', 'd'])
    const toDelete = getToolResultsToDelete(s, config({ triggerThreshold: 3, keepRecent: 1 }))
    expect(toDelete).toEqual(['a', 'b', 'c'])
    expect(s.deletedRefs.has('a')).toBe(true)
    expect(s.deletedRefs.has('d')).toBe(false)
  })

  test('keepRecent se acota a un mínimo de 1 aunque config pida 0', () => {
    const s = createCachedMCState()
    registerToolMessage(s, ['a', 'b', 'c'])
    const toDelete = getToolResultsToDelete(s, config({ triggerThreshold: 3, keepRecent: 0 }))
    expect(toDelete).toEqual(['a', 'b'])
  })

  test('sólo cuenta los activos (ya borrados no vuelven a contarse hacia el umbral)', () => {
    const s = createCachedMCState()
    registerToolMessage(s, ['a', 'b', 'c'])
    getToolResultsToDelete(s, config({ triggerThreshold: 3, keepRecent: 1 })) // borra a, b
    registerToolResult(s, 'd')
    // activos: c, d -> 2, por debajo del umbral de 3
    expect(getToolResultsToDelete(s, config({ triggerThreshold: 3, keepRecent: 1 }))).toEqual([])
  })
})

describe('createCacheEditsBlock', () => {
  test('null si no hay ids que borrar', () => {
    const s = createCachedMCState()
    expect(createCacheEditsBlock(s, [])).toBeNull()
  })

  test('arma el bloque y marca los ids como borrados', () => {
    const s = createCachedMCState()
    const block = createCacheEditsBlock(s, ['x', 'y'])
    expect(block).toEqual({
      type: 'cache_edits',
      edits: [
        { type: 'delete_tool_result', tool_use_id: 'x' },
        { type: 'delete_tool_result', tool_use_id: 'y' },
      ],
    })
    expect(s.deletedRefs.has('x')).toBe(true)
    expect(s.deletedRefs.has('y')).toBe(true)
  })
})

describe('isCachedMicrocompactEnabled', () => {
  test('refleja config.enabled', () => {
    expect(isCachedMicrocompactEnabled(config({ enabled: true }))).toBe(true)
    expect(isCachedMicrocompactEnabled(config({ enabled: false }))).toBe(false)
  })
})

describe('isModelSupportedForCacheEditing', () => {
  test('lista vacía de modelos soportados == soporta cualquiera', () => {
    expect(isModelSupportedForCacheEditing('claude-anything', config({ supportedModels: [] }))).toBe(true)
  })
  test('coincidencia exacta o por prefijo', () => {
    const c = config({ supportedModels: ['claude-sonnet-4'] })
    expect(isModelSupportedForCacheEditing('claude-sonnet-4', c)).toBe(true)
    expect(isModelSupportedForCacheEditing('claude-sonnet-4-5', c)).toBe(true)
    expect(isModelSupportedForCacheEditing('claude-opus-4', c)).toBe(false)
  })
})

describe('getCachedMCSimpleConfig', () => {
  test('proyecta sólo triggerThreshold y keepRecent', () => {
    expect(getCachedMCSimpleConfig(config({ triggerThreshold: 7, keepRecent: 2 })))
      .toEqual({ triggerThreshold: 7, keepRecent: 2 })
  })
})
