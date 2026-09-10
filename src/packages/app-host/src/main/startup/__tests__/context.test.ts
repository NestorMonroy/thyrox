import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { prefetchSystemContextIfSafe, startDeferredPrefetches, type PrefetchDeps } from '../context.js'

const ENV_KEYS = [
  'CLAUDE_CODE_EXIT_AFTER_FIRST_RENDER',
  'CLAUDE_CODE_USE_BEDROCK',
  'CLAUDE_CODE_SKIP_BEDROCK_AUTH',
  'CLAUDE_CODE_USE_VERTEX',
  'CLAUDE_CODE_SKIP_VERTEX_AUTH',
  'USER_TYPE',
] as const
let snapshot: Record<string, string | undefined>

beforeEach(() => {
  snapshot = {}
  for (const k of ENV_KEYS) {
    snapshot[k] = process.env[k]
    delete process.env[k]
  }
})

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (snapshot[k] === undefined) delete process.env[k]
    else process.env[k] = snapshot[k]
  }
})

describe('prefetchSystemContextIfSafe', () => {
  test('sesión no interactiva: precarga y loguea "non_interactive", sin mirar el trust dialog', () => {
    const eventos: string[] = []
    let precargado = false
    let trustConsultado = false
    prefetchSystemContextIfSafe({
      getIsNonInteractiveSession: () => true,
      logForDiagnosticsNoPII: (_l, e) => eventos.push(e),
      getSystemContext: async () => {
        precargado = true
        return undefined
      },
      checkHasTrustDialogAccepted: () => {
        trustConsultado = true
        return false
      },
    })
    expect(eventos).toEqual(['prefetch_system_context_non_interactive'])
    expect(precargado).toBe(true)
    expect(trustConsultado).toBe(false)
  })

  test('interactiva + trust aceptado: precarga y loguea "has_trust"', () => {
    const eventos: string[] = []
    let precargado = false
    prefetchSystemContextIfSafe({
      getIsNonInteractiveSession: () => false,
      checkHasTrustDialogAccepted: () => true,
      logForDiagnosticsNoPII: (_l, e) => eventos.push(e),
      getSystemContext: async () => {
        precargado = true
        return undefined
      },
    })
    expect(eventos).toEqual(['prefetch_system_context_has_trust'])
    expect(precargado).toBe(true)
  })

  test('interactiva + trust NO aceptado: no precarga, loguea "skipped_no_trust"', () => {
    const eventos: string[] = []
    let precargado = false
    prefetchSystemContextIfSafe({
      getIsNonInteractiveSession: () => false,
      checkHasTrustDialogAccepted: () => false,
      logForDiagnosticsNoPII: (_l, e) => eventos.push(e),
      getSystemContext: async () => {
        precargado = true
        return undefined
      },
    })
    expect(eventos).toEqual(['prefetch_system_context_skipped_no_trust'])
    expect(precargado).toBe(false)
  })
})

function rastrear(): { deps: PrefetchDeps; llamados: Set<string> } {
  const llamados = new Set<string>()
  const marcar = (nombre: string) => () => {
    llamados.add(nombre)
    return Promise.resolve()
  }
  const deps: PrefetchDeps = {
    initUser: marcar('initUser'),
    getUserContext: marcar('getUserContext'),
    getRelevantTips: marcar('getRelevantTips'),
    prefetchAwsCredentialsAndBedRockInfoIfSafe: marcar('aws'),
    prefetchGcpCredentialsIfSafe: marcar('gcp'),
    countFilesRoundedRg: (() => {
      llamados.add('countFilesRoundedRg')
      return Promise.resolve()
    }) as PrefetchDeps['countFilesRoundedRg'],
    prefetchOfficialMcpUrls: marcar('prefetchOfficialMcpUrls'),
    refreshModelCapabilities: marcar('refreshModelCapabilities'),
    initializeSettingsChangeDetector: marcar('initializeSettingsChangeDetector'),
    initializeSkillChangeDetector: marcar('initializeSkillChangeDetector'),
    startEventLoopStallDetector: () => llamados.add('startEventLoopStallDetector'),
  }
  return { deps, llamados }
}

describe('startDeferredPrefetches', () => {
  test('CLAUDE_CODE_EXIT_AFTER_FIRST_RENDER: no llama a ningún colaborador', () => {
    process.env.CLAUDE_CODE_EXIT_AFTER_FIRST_RENDER = '1'
    const { deps, llamados } = rastrear()
    startDeferredPrefetches(deps)
    expect(llamados.size).toBe(0)
  })

  test('bare mode: no llama a ningún colaborador (incluido skillChangeDetector)', () => {
    const { deps, llamados } = rastrear()
    startDeferredPrefetches({ ...deps, isBareMode: () => true })
    expect(llamados.size).toBe(0)
  })

  test('camino normal: dispara todos los prefetches salvo aws/gcp (env no configurado)', () => {
    const { deps, llamados } = rastrear()
    startDeferredPrefetches(deps)
    expect(llamados.has('initUser')).toBe(true)
    expect(llamados.has('getUserContext')).toBe(true)
    expect(llamados.has('getRelevantTips')).toBe(true)
    expect(llamados.has('countFilesRoundedRg')).toBe(true)
    expect(llamados.has('prefetchOfficialMcpUrls')).toBe(true)
    expect(llamados.has('refreshModelCapabilities')).toBe(true)
    expect(llamados.has('initializeSettingsChangeDetector')).toBe(true)
    expect(llamados.has('initializeSkillChangeDetector')).toBe(true)
    expect(llamados.has('aws')).toBe(false)
    expect(llamados.has('gcp')).toBe(false)
  })

  test('CLAUDE_CODE_USE_BEDROCK=1 sin skip: dispara el prefetch de AWS', () => {
    process.env.CLAUDE_CODE_USE_BEDROCK = '1'
    const { deps, llamados } = rastrear()
    startDeferredPrefetches(deps)
    expect(llamados.has('aws')).toBe(true)
  })

  test('CLAUDE_CODE_USE_BEDROCK=1 con CLAUDE_CODE_SKIP_BEDROCK_AUTH=1: NO dispara AWS', () => {
    process.env.CLAUDE_CODE_USE_BEDROCK = '1'
    process.env.CLAUDE_CODE_SKIP_BEDROCK_AUTH = '1'
    const { deps, llamados } = rastrear()
    startDeferredPrefetches(deps)
    expect(llamados.has('aws')).toBe(false)
  })

  test('USER_TYPE=ant: dispara el detector de bloqueo del event loop', () => {
    process.env.USER_TYPE = 'ant'
    const { deps, llamados } = rastrear()
    startDeferredPrefetches(deps)
    expect(llamados.has('startEventLoopStallDetector')).toBe(true)
  })

  test('sin USER_TYPE=ant: NO dispara el detector de bloqueo del event loop', () => {
    const { deps, llamados } = rastrear()
    startDeferredPrefetches(deps)
    expect(llamados.has('startEventLoopStallDetector')).toBe(false)
  })
})
