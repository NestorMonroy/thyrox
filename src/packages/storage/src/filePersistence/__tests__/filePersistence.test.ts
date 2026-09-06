import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { setGetCwdFn } from '../../internal/pendingCrossPackageDeps.js'
import {
  executeFilePersistence,
  isFilePersistenceEnabled,
  runFilePersistence,
  setGetSessionIngressAuthTokenFn,
  setLogErrorFn,
  setLogEventFn,
  setUploadSessionFilesFn,
  type UploadResult,
} from '../filePersistence.js'
import { OUTPUTS_SUBDIR } from '../types.js'

const ENV_KEYS = [
  'CLAUDE_CODE_ENVIRONMENT_KIND',
  'CLAUDE_CODE_REMOTE_SESSION_ID',
] as const

let savedEnv: Record<string, string | undefined> = {}
let dir: string
let logEvents: { name: string; metadata?: Record<string, unknown> }[] = []
let loggedErrors: unknown[] = []

beforeEach(() => {
  savedEnv = {}
  for (const key of ENV_KEYS) savedEnv[key] = process.env[key]
  dir = mkdtempSync(join(tmpdir(), 'filepersistence-test-'))
  logEvents = []
  loggedErrors = []
  setLogEventFn((name, metadata) => {
    logEvents.push({ name, metadata })
  })
  setLogErrorFn(error => {
    loggedErrors.push(error)
  })
  setGetCwdFn(() => dir)
})

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key]
    else process.env[key] = savedEnv[key]
  }
  rmSync(dir, { recursive: true, force: true })
  setGetCwdFn(() => process.cwd())
  setGetSessionIngressAuthTokenFn(() => null)
  setLogEventFn(() => {})
  setLogErrorFn(() => {})
  setUploadSessionFilesFn(async files =>
    files.map(f => ({
      success: false,
      path: f.path,
      error: 'no wired',
    })),
  )
})

function makeOutputsDirWithFile(sessionId: string, name: string, content: string): string {
  const outputsDir = join(dir, sessionId, OUTPUTS_SUBDIR)
  mkdirSync(outputsDir, { recursive: true })
  const filePath = join(outputsDir, name)
  writeFileSync(filePath, content)
  return filePath
}

describe('isFilePersistenceEnabled', () => {
  test('siempre false — el gateo de feature("FILE_PERSISTENCE") esta omitido (bun:bundle ausente)', () => {
    process.env.CLAUDE_CODE_ENVIRONMENT_KIND = 'byoc'
    process.env.CLAUDE_CODE_REMOTE_SESSION_ID = 'sess-1'
    setGetSessionIngressAuthTokenFn(() => 'tok')
    expect(isFilePersistenceEnabled()).toBe(false)
  })

  test('sigue false incluso sin ninguna condicion cumplida', () => {
    delete process.env.CLAUDE_CODE_ENVIRONMENT_KIND
    expect(isFilePersistenceEnabled()).toBe(false)
  })
})

describe('runFilePersistence — condiciones de salida temprana', () => {
  test('environmentKind distinto de byoc devuelve null', async () => {
    process.env.CLAUDE_CODE_ENVIRONMENT_KIND = 'anthropic_cloud'
    const result = await runFilePersistence({ turnStartTime: Date.now() })
    expect(result).toBeNull()
  })

  test('byoc sin token de sesion (default null) devuelve null', async () => {
    process.env.CLAUDE_CODE_ENVIRONMENT_KIND = 'byoc'
    const result = await runFilePersistence({ turnStartTime: Date.now() })
    expect(result).toBeNull()
  })

  test('byoc + token pero SIN CLAUDE_CODE_REMOTE_SESSION_ID devuelve null y reporta logError', async () => {
    process.env.CLAUDE_CODE_ENVIRONMENT_KIND = 'byoc'
    delete process.env.CLAUDE_CODE_REMOTE_SESSION_ID
    setGetSessionIngressAuthTokenFn(() => 'tok')
    const result = await runFilePersistence({ turnStartTime: Date.now() })
    expect(result).toBeNull()
    expect(loggedErrors).toHaveLength(1)
    expect(String((loggedErrors[0] as Error).message)).toContain(
      'CLAUDE_CODE_REMOTE_SESSION_ID',
    )
  })

  test('con signal ya abortado antes de procesar, devuelve null', async () => {
    process.env.CLAUDE_CODE_ENVIRONMENT_KIND = 'byoc'
    process.env.CLAUDE_CODE_REMOTE_SESSION_ID = 'sess-abort'
    setGetSessionIngressAuthTokenFn(() => 'tok')
    const controller = new AbortController()
    controller.abort()
    const result = await runFilePersistence(
      { turnStartTime: Date.now() },
      controller.signal,
    )
    expect(result).toBeNull()
  })
})

describe('runFilePersistence — camino feliz BYOC', () => {
  test('sube archivos modificados y devuelve files/failed poblados; emite los dos eventos', async () => {
    const sessionId = 'sess-happy'
    process.env.CLAUDE_CODE_ENVIRONMENT_KIND = 'byoc'
    process.env.CLAUDE_CODE_REMOTE_SESSION_ID = sessionId
    setGetSessionIngressAuthTokenFn(() => 'tok-123')

    const turnStartTime = { turnStartTime: Date.now() - 1000 }
    const filePath = makeOutputsDirWithFile(sessionId, 'salida.txt', 'contenido')

    let uploadedConfig: unknown
    setUploadSessionFilesFn(async (files, config): Promise<UploadResult[]> => {
      uploadedConfig = config
      return files.map(f => ({
        success: true,
        path: f.path,
        fileId: `file_${f.relativePath}`,
      }))
    })

    const result = await runFilePersistence(turnStartTime)
    expect(result).toEqual({
      files: [{ filename: filePath, file_id: 'file_salida.txt' }],
      failed: [],
    })
    expect(uploadedConfig).toEqual({ oauthToken: 'tok-123', sessionId })

    expect(logEvents.map(e => e.name)).toEqual([
      'tengu_file_persistence_started',
      'tengu_file_persistence_completed',
    ])
    expect(logEvents[1]?.metadata).toMatchObject({
      success_count: 1,
      failure_count: 0,
      mode: 'byoc',
    })
  })

  test('sin archivos modificados, devuelve null (nada que reportar) y NO emite el evento de cierre', async () => {
    const sessionId = 'sess-empty'
    process.env.CLAUDE_CODE_ENVIRONMENT_KIND = 'byoc'
    process.env.CLAUDE_CODE_REMOTE_SESSION_ID = sessionId
    setGetSessionIngressAuthTokenFn(() => 'tok')
    mkdirSync(join(dir, sessionId, OUTPUTS_SUBDIR), { recursive: true })

    const result = await runFilePersistence({ turnStartTime: Date.now() })
    expect(result).toBeNull()
    // Solo el evento de inicio; runFilePersistence corta antes del de cierre
    // porque files.length === 0 && failed.length === 0.
    expect(logEvents.map(e => e.name)).toEqual([
      'tengu_file_persistence_started',
    ])
  })

  test('excede FILE_COUNT_LIMIT: devuelve failed con el mensaje de limite, SIN llamar a uploadSessionFiles', async () => {
    const sessionId = 'sess-limit'
    process.env.CLAUDE_CODE_ENVIRONMENT_KIND = 'byoc'
    process.env.CLAUDE_CODE_REMOTE_SESSION_ID = sessionId
    setGetSessionIngressAuthTokenFn(() => 'tok')

    const outputsDir = join(dir, sessionId, OUTPUTS_SUBDIR)
    mkdirSync(outputsDir, { recursive: true })
    // FILE_COUNT_LIMIT (10 000) + 1 archivos reales y vacios — mas barato
    // que 10 001 escrituras con contenido, y suficiente para cruzar el
    // umbral que la propia constante exportada declara.
    for (let i = 0; i <= 10_000; i++) {
      writeFileSync(join(outputsDir, `f${i}.txt`), '')
    }

    let uploadCalled = false
    setUploadSessionFilesFn(async files => {
      uploadCalled = true
      return files.map(f => ({ success: true, path: f.path, fileId: 'x' }))
    })

    const result = await runFilePersistence({ turnStartTime: Date.now() - 60_000 })
    expect(uploadCalled).toBe(false)
    expect(result?.files).toEqual([])
    expect(result?.failed).toHaveLength(1)
    expect(result?.failed[0]?.error).toContain('Too many files modified (10001)')
    expect(
      logEvents.some(e => e.name === 'tengu_file_persistence_limit_exceeded'),
    ).toBe(true)
  }, 20_000)

  test('un error dentro de executeBYOCPersistence se atrapa y se reporta como failed', async () => {
    const sessionId = 'sess-throw'
    process.env.CLAUDE_CODE_ENVIRONMENT_KIND = 'byoc'
    process.env.CLAUDE_CODE_REMOTE_SESSION_ID = sessionId
    setGetSessionIngressAuthTokenFn(() => 'tok')
    makeOutputsDirWithFile(sessionId, 'x.txt', 'x')

    setUploadSessionFilesFn(async () => {
      throw new Error('la Files API esta caida')
    })

    const result = await runFilePersistence({ turnStartTime: Date.now() - 1000 })
    expect(result?.files).toEqual([])
    expect(result?.failed).toHaveLength(1)
    expect(result?.failed[0]?.error).toBe('la Files API esta caida')
    expect(loggedErrors).toHaveLength(1)
    expect(logEvents.at(-1)?.metadata).toMatchObject({ error: 'exception' })
  })
})

describe('executeFilePersistence', () => {
  test('llama a onResult con el resultado cuando hay uno', async () => {
    const sessionId = 'sess-callback'
    process.env.CLAUDE_CODE_ENVIRONMENT_KIND = 'byoc'
    process.env.CLAUDE_CODE_REMOTE_SESSION_ID = sessionId
    setGetSessionIngressAuthTokenFn(() => 'tok')
    const filePath = makeOutputsDirWithFile(sessionId, 'cb.txt', 'y')
    setUploadSessionFilesFn(async files =>
      files.map(f => ({ success: true, path: f.path, fileId: 'fid' })),
    )

    let received: unknown
    await executeFilePersistence(
      { turnStartTime: Date.now() - 1000 },
      new AbortController().signal,
      result => {
        received = result
      },
    )
    expect(received).toEqual({
      files: [{ filename: filePath, file_id: 'fid' }],
      failed: [],
    })
  })

  test('un throw ANTES del try interno de runFilePersistence lo atrapa executeFilePersistence, via logError', async () => {
    const sessionId = 'sess-outer-throw'
    process.env.CLAUDE_CODE_ENVIRONMENT_KIND = 'byoc'
    process.env.CLAUDE_CODE_REMOTE_SESSION_ID = sessionId
    setGetSessionIngressAuthTokenFn(() => 'tok')

    // logEvent('tengu_file_persistence_started', …) se llama ANTES del
    // try/catch interno de runFilePersistence — si el sink de logEvent
    // lanza, el error escapa runFilePersistence entero y lo atrapa el
    // try/catch de executeFilePersistence, no el interno.
    setLogEventFn(() => {
      throw new Error('sink de logEvent roto')
    })

    let onResultCalled = false
    await executeFilePersistence(
      { turnStartTime: Date.now() },
      new AbortController().signal,
      () => {
        onResultCalled = true
      },
    )
    expect(onResultCalled).toBe(false)
    expect(loggedErrors).toHaveLength(1)
    expect((loggedErrors[0] as Error).message).toBe('sink de logEvent roto')
  })
})
