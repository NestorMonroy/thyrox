/**
 * Puerto de `ccnmt: packages/storage/src/secureStorage` contra 2.1.283
 * (`chunk-mmqkf96q.js`). Cubre lo que `plainTextStorage.test.ts` no
 * cubría todavía: la lectura estricta con centinela `READ_FAILED`, la
 * copia por generación (`withGenerationTracking`/`Ps`) y el selector de
 * backend del sistema (`Un`).
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { NodeFsOperations, setFsImplementation, setOriginalFsImplementation } from '../../fsOperations.js'
import {
  __resetCurrentHostForTests,
  __setCurrentHostForTests,
  __setMultiHostAwareForTests,
  createFileCredentialBackend,
  getHostGenerationState,
  getWindowsCredManConfigPaths,
  mutateCredentials,
  shouldUseWindowsCredMan,
  selectBackend,
  setCopy,
  withGenerationTracking,
} from '../credentialStoreInternals.js'
import { getSecureStorage, registerSystemSecureStorage, resetSystemSecureStorage } from '../index.js'
import { plainTextStorage } from '../plainTextStorage.js'
import { READ_FAILED } from '../types.js'
import type { CredentialBackend, CredentialCopyState, SecureStorage, SecureStorageData } from '../types.js'

let dir: string
let originalConfigDir: string | undefined

function useTmpConfigDir(): void {
  dir = mkdtempSync(join(tmpdir(), 'credentialstore283-test-'))
  process.env.THYROX_CONFIG_DIR = dir
}

afterEach(() => {
  if (originalConfigDir === undefined) delete process.env.THYROX_CONFIG_DIR
  else process.env.THYROX_CONFIG_DIR = originalConfigDir
  if (dir) rmSync(dir, { recursive: true, force: true })
  setOriginalFsImplementation()
  __setMultiHostAwareForTests(false)
  __resetCurrentHostForTests()
  resetSystemSecureStorage()
})

describe('escritura con modo 0600 y aviso', () => {
  test('update() escribe .credentials.json con permisos 0o600 y devuelve el aviso de texto plano', () => {
    originalConfigDir = process.env.THYROX_CONFIG_DIR
    useTmpConfigDir()

    const result = plainTextStorage.update({ token: 'sk-ant-xyz' })

    expect(result).toEqual({
      success: true,
      warning: 'Warning: Storing credentials in plaintext.',
    })
    const mode = statSync(join(dir, '.credentials.json')).mode & 0o777
    expect(mode).toBe(0o600)
  })

  test('un segundo update() re-aplica el modo 0600', () => {
    originalConfigDir = process.env.THYROX_CONFIG_DIR
    useTmpConfigDir()

    plainTextStorage.update({ a: 1 })
    const storagePath = join(dir, '.credentials.json')
    setFsImplementation({
      ...NodeFsOperations,
      readFileSync: NodeFsOperations.readFileSync,
    })
    plainTextStorage.update({ a: 2 })
    const mode = statSync(storagePath).mode & 0o777
    expect(mode).toBe(0o600)
  })
})

describe('backend de archivo con seguimiento de generación', () => {
  test('writeCredentials() deja el archivo en 0o600 aunque ya existiera con otros permisos', async () => {
    originalConfigDir = process.env.THYROX_CONFIG_DIR
    useTmpConfigDir()
    const storagePath = join(dir, '.credentials.json')
    writeFileSync(storagePath, '{}', { mode: 0o644 })
    const backend = createFileCredentialBackend(() => ({ storageDir: dir, storagePath }))

    const result = await backend.writeCredentials({ token: 'sk-ant-xyz' })

    expect(result).toEqual({ state: 'written' })
    expect(statSync(storagePath).mode & 0o777).toBe(0o600)
  })
})

describe('gWr: forzado de Windows CredMan por THYROX_CODE_FORCE_WINDOWS_CREDMAN', () => {
  test('con la variable en 1 decide CredMan sin leer ningún config', () => {
    originalConfigDir = process.env.THYROX_CONFIG_DIR
    useTmpConfigDir()
    const previous = process.env.THYROX_CODE_FORCE_WINDOWS_CREDMAN
    process.env.THYROX_CODE_FORCE_WINDOWS_CREDMAN = '1'
    try {
      expect(shouldUseWindowsCredMan()).toBe(true)
    } finally {
      if (previous === undefined) delete process.env.THYROX_CODE_FORCE_WINDOWS_CREDMAN
      else process.env.THYROX_CODE_FORCE_WINDOWS_CREDMAN = previous
    }
  })

  test('sin la variable, lee la bandera del config global bajo el directorio de configuración', () => {
    originalConfigDir = process.env.THYROX_CONFIG_DIR
    useTmpConfigDir()
    delete process.env.THYROX_CODE_FORCE_WINDOWS_CREDMAN
    writeFileSync(join(dir, '.claude.json'), JSON.stringify({ cachedGrowthBookFeatures: { tengu_windows_credman: true } }))
    expect(getWindowsCredManConfigPaths().configPath).toBe(join(dir, '.claude.json'))
    expect(shouldUseWindowsCredMan()).toBe(true)
  })
})

describe('mutateCredentials (Et): una lectura fallida no se escribe encima', () => {
  test('con READ_FAILED no llama a update() y devuelve un fallo transitorio', async () => {
    originalConfigDir = process.env.THYROX_CONFIG_DIR
    useTmpConfigDir()
    const updates: SecureStorageData[] = []
    const storage = {
      ...plainTextStorage,
      readAsyncStrict: async () => READ_FAILED,
      update: (data: SecureStorageData) => {
        updates.push(data)
        return { success: true }
      },
    } as SecureStorage

    const result = await mutateCredentials(storage, data => ({ ...data, token: 'nuevo' }))

    expect(result).toEqual({ success: false, transient: true })
    expect(updates).toEqual([])
  })
})

describe('lectura estricta: ilegible frente a ausente', () => {
  test('readAsyncStrict() con archivo ilegible (EACCES) devuelve el centinela READ_FAILED', async () => {
    originalConfigDir = process.env.THYROX_CONFIG_DIR
    useTmpConfigDir()
    setFsImplementation({
      ...NodeFsOperations,
      async readFile(): Promise<string> {
        const err = new Error('EACCES') as NodeJS.ErrnoException
        err.code = 'EACCES'
        throw err
      },
    })

    const result = await plainTextStorage.readAsyncStrict?.(undefined, {
      unreadableFileAs: 'failure',
    })
    expect(result).toBe(READ_FAILED)
  })

  test('readAsyncStrict() sin archivo (ENOENT) devuelve null, no el centinela', async () => {
    originalConfigDir = process.env.THYROX_CONFIG_DIR
    useTmpConfigDir()

    const result = await plainTextStorage.readAsyncStrict?.(undefined, {
      unreadableFileAs: 'failure',
    })
    expect(result).toBeNull()
  })
})

describe('copia por generación: descarta una escritura concurrente', () => {
  test('una escritura que ocurre mientras una lectura está en vuelo invalida la copia en vez de cachear un resultado obsoleto', async () => {
    const host = {}
    __setCurrentHostForTests(host)
    __setMultiHostAwareForTests(true)
    const getStoragePath = () => ({ storagePath: '/fake/.credentials.json' })

    let resolveRead: (value: CredentialCopyState) => void
    const readPromise = new Promise<CredentialCopyState>(resolve => {
      resolveRead = resolve
    })
    const backend: CredentialBackend = {
      readCredentials: () => readPromise,
      readCredentialsStrict: () => readPromise,
      writeCredentials: async () => ({ state: 'written' }),
      deleteCredentials: async () => ({ state: 'deleted' }),
    }
    const tracked = withGenerationTracking(backend, getStoragePath, host)

    const pendingRead = tracked.read()
    // La escritura concurrente adelanta la generación ANTES de que la
    // lectura en vuelo se resuelva.
    await tracked.write({ token: 'written-concurrently' })
    resolveRead!({ state: 'present', data: { token: 'stale-read' } })
    await pendingRead

    const state = getHostGenerationState(host)
    // La reconciliación de la lectura vio la generación adelantada (por la
    // escritura concurrente) y descartó su propio resultado en vez de
    // cachear un dato ya obsoleto: la copia queda invalidada, nunca con el
    // texto de la lectura obsoleta.
    expect(state.copy).toBeUndefined()
    expect(state.copy?.text).not.toBe(JSON.stringify({ token: 'stale-read' }))
  })

  test('sin escritura concurrente, la lectura SÍ puebla la copia', async () => {
    const host = {}
    __setCurrentHostForTests(host)
    __setMultiHostAwareForTests(true)
    const getStoragePath = () => ({ storagePath: '/fake/.credentials.json' })
    const data: SecureStorageData = { token: 'fresh' }
    const backend: CredentialBackend = {
      readCredentials: async () => ({ state: 'present', data }),
      readCredentialsStrict: async () => ({ state: 'present', data }),
      writeCredentials: async () => ({ state: 'written' }),
      deleteCredentials: async () => ({ state: 'deleted' }),
    }
    const tracked = withGenerationTracking(backend, getStoragePath, host)

    const result = await tracked.read()

    expect(result).toEqual(data)
    const state = getHostGenerationState(host)
    expect(state.copy?.text).toBe(JSON.stringify(data))
  })
})

describe('delete() de un archivo inexistente', () => {
  test('delete() sobre .credentials.json ausente devuelve true (ENOENT no es fallo)', () => {
    originalConfigDir = process.env.THYROX_CONFIG_DIR
    useTmpConfigDir()
    expect(plainTextStorage.delete()).toBe(true)
  })
})

describe('read({ fromStoreCopy: true }): sólo consulta la copia con isMultiHostAware()', () => {
  test('con isMultiHostAware() en falso (default), ignora la copia y lee disco', () => {
    originalConfigDir = process.env.THYROX_CONFIG_DIR
    useTmpConfigDir()
    plainTextStorage.update({ token: 'en-disco' })
    const storagePath = join(dir, '.credentials.json')
    setCopy(getHostGenerationState(), storagePath, JSON.stringify({ token: 'copia-vieja' }))

    expect(plainTextStorage.read({ fromStoreCopy: true })).toEqual({ token: 'en-disco' })
  })

  test('con isMultiHostAware() en true, sirve la copia sin tocar disco', () => {
    originalConfigDir = process.env.THYROX_CONFIG_DIR
    useTmpConfigDir()
    plainTextStorage.update({ token: 'en-disco' })
    const storagePath = join(dir, '.credentials.json')
    __setMultiHostAwareForTests(true)
    setCopy(getHostGenerationState(), storagePath, JSON.stringify({ token: 'de-la-copia' }))

    expect(plainTextStorage.read({ fromStoreCopy: true })).toEqual({ token: 'de-la-copia' })
  })
})

describe('update()/delete() invalidan la copia sólo bajo isMultiHostAware()', () => {
  test('con isMultiHostAware() en falso, update() no toca la copia existente', () => {
    originalConfigDir = process.env.THYROX_CONFIG_DIR
    useTmpConfigDir()
    const storagePath = join(dir, '.credentials.json')
    setCopy(getHostGenerationState(), storagePath, JSON.stringify({ token: 'copia-intacta' }))

    plainTextStorage.update({ token: 'nuevo' })

    expect(getHostGenerationState().copy?.text).toBe(JSON.stringify({ token: 'copia-intacta' }))
  })

  test('con isMultiHostAware() en true, update() invalida la copia existente', () => {
    originalConfigDir = process.env.THYROX_CONFIG_DIR
    useTmpConfigDir()
    const storagePath = join(dir, '.credentials.json')
    __setMultiHostAwareForTests(true)
    setCopy(getHostGenerationState(), storagePath, JSON.stringify({ token: 'copia-vieja' }))

    plainTextStorage.update({ token: 'nuevo' })

    expect(getHostGenerationState().copy).toBeUndefined()
  })
})

describe('selectBackend(): sin backend, usa siempre el backend crudo', () => {
  test('con isMultiHostAware() en true pero sin backend, no enruta por seguimiento de generación', async () => {
    __setMultiHostAwareForTests(true)
    originalConfigDir = process.env.THYROX_CONFIG_DIR
    useTmpConfigDir()
    plainTextStorage.update({ token: 'x' })
    const getStoragePath = () => ({ storagePath: join(dir, '.credentials.json') })

    const result = await selectBackend(getStoragePath, undefined).read()

    expect(result).toEqual({ token: 'x' })
    // Al no pasar backend, `Pr` no pudo envolver con `ji`: la copia por
    // generación de este host sigue sin poblarse.
    expect(getHostGenerationState().copy).toBeUndefined()
  })
})

describe('Un: selector de backend del sistema', () => {
  test('sin backend del sistema registrado, devuelve plainTextStorage', () => {
    resetSystemSecureStorage()
    expect(getSecureStorage()).toBe(plainTextStorage)
  })

  test('con un backend del sistema registrado, lo devuelve a él en vez de plainTextStorage', () => {
    const fakeSystemBackend: SecureStorage = {
      name: 'fake-system-backend',
      read: () => null,
      readAsync: async () => null,
      update: () => ({ success: true }),
      delete: () => true,
    }
    registerSystemSecureStorage(fakeSystemBackend)
    expect(getSecureStorage()).toBe(fakeSystemBackend)
  })
})

function errnoError(code: string): NodeJS.ErrnoException {
  const err = new Error(code) as NodeJS.ErrnoException
  err.code = code
  return err
}

describe('Et: mutateCredentials pasa las opciones y el backend de la fuente', () => {
  test('readAsyncStrict recibe { inaccessibleAs: "failureIfTransient" } y update recibe el backend', async () => {
    originalConfigDir = process.env.THYROX_CONFIG_DIR
    useTmpConfigDir()
    const backend: CredentialBackend = {
      readCredentials: async () => ({ state: 'absent' }),
      readCredentialsStrict: async () => ({ state: 'absent' }),
      writeCredentials: async () => ({ state: 'written' }),
      deleteCredentials: async () => ({ state: 'deleted' }),
    }
    const seen: { readOptions?: unknown; readBackend?: unknown; updateBackend?: unknown } = {}
    const storage = {
      ...plainTextStorage,
      readAsyncStrict: async (givenBackend?: CredentialBackend, options?: unknown) => {
        seen.readBackend = givenBackend
        seen.readOptions = options
        return null
      },
      update: (_data: SecureStorageData, givenBackend?: CredentialBackend) => {
        seen.updateBackend = givenBackend
        return { success: true }
      },
    } as SecureStorage

    await mutateCredentials(storage, data => ({ ...data, token: 'nuevo' }), backend)

    expect(seen.readOptions).toEqual({ inaccessibleAs: 'failureIfTransient' })
    expect(seen.readBackend).toBe(backend)
    expect(seen.updateBackend).toBe(backend)
  })

  test('sobre plaintext, un archivo con EACCES se lee como ausente ($i) y la mutación se escribe', async () => {
    originalConfigDir = process.env.THYROX_CONFIG_DIR
    useTmpConfigDir()
    setFsImplementation({
      ...NodeFsOperations,
      async readFile(): Promise<string> {
        throw errnoError('EACCES')
      },
    })

    const result = await plainTextStorage.mutate(data => ({ ...data, token: 'escrito' }))

    expect(result).toEqual({ success: true, warning: 'Warning: Storing credentials in plaintext.' })
    expect(JSON.parse(readFileSync(join(dir, '.credentials.json'), 'utf8'))).toEqual({ token: 'escrito' })
  })

  test('sobre plaintext, un archivo con EIO es READ_FAILED y la mutación no se escribe', async () => {
    originalConfigDir = process.env.THYROX_CONFIG_DIR
    useTmpConfigDir()
    setFsImplementation({
      ...NodeFsOperations,
      async readFile(): Promise<string> {
        throw errnoError('EIO')
      },
    })

    const result = await plainTextStorage.mutate(data => ({ ...data, token: 'escrito' }))

    expect(result).toEqual({ success: false, transient: true })
    expect(readdirSync(dir)).not.toContain('.credentials.json')
  })
})

describe('ji.readStrict: qué lectura del backend llama cada bandera', () => {
  function distinguishingBackend(): CredentialBackend {
    return {
      readCredentials: async () => ({ state: 'read-failed' }),
      readCredentialsStrict: async () => ({ state: 'absent' }),
      writeCredentials: async () => ({ state: 'written' }),
      deleteCredentials: async () => ({ state: 'deleted' }),
    }
  }

  test('con la bandera en falso llama a readCredentialsStrict (mapeo laxo) y resuelve null', async () => {
    const host = {}
    const tracked = withGenerationTracking(distinguishingBackend(), () => ({ storagePath: '/fake/.credentials.json' }), host)

    expect(await tracked.readStrict(false)).toBeNull()
  })

  test('con la bandera en verdadero llama a readCredentials (mapeo estricto) y resuelve READ_FAILED', async () => {
    const host = {}
    const tracked = withGenerationTracking(distinguishingBackend(), () => ({ storagePath: '/fake/.credentials.json' }), host)

    expect(await tracked.readStrict(true)).toBe(READ_FAILED)
  })
})

describe('backend de archivo: los dos mapeadores de errno y el JSON null', () => {
  function backendOver(configDir: string): CredentialBackend {
    return createFileCredentialBackend(() => ({ storageDir: configDir, storagePath: join(configDir, '.credentials.json') }))
  }

  test('readCredentialsStrict con EACCES es absent; readCredentials con EACCES es read-failed', async () => {
    originalConfigDir = process.env.THYROX_CONFIG_DIR
    useTmpConfigDir()
    setFsImplementation({
      ...NodeFsOperations,
      async readFile(): Promise<string> {
        throw errnoError('EACCES')
      },
    })
    const backend = backendOver(dir)

    expect(await backend.readCredentialsStrict()).toEqual({ state: 'absent' })
    expect(await backend.readCredentials()).toEqual({ state: 'read-failed' })
  })

  test('un archivo cuyo JSON es null se lee como absent, no como present', async () => {
    originalConfigDir = process.env.THYROX_CONFIG_DIR
    useTmpConfigDir()
    writeFileSync(join(dir, '.credentials.json'), 'null')

    expect(await backendOver(dir).readCredentials()).toEqual({ state: 'absent' })
  })

  test('writeCredentials publica por staging y rename: no deja temporal y el contenido es el escrito', async () => {
    originalConfigDir = process.env.THYROX_CONFIG_DIR
    useTmpConfigDir()

    await backendOver(dir).writeCredentials({ token: 'publicado' })

    expect(readdirSync(dir)).toEqual(['.credentials.json'])
    expect(JSON.parse(readFileSync(join(dir, '.credentials.json'), 'utf8'))).toEqual({ token: 'publicado' })
  })

  test('si el rename falla, el archivo anterior queda intacto, no hay temporal y el estado es failed', async () => {
    originalConfigDir = process.env.THYROX_CONFIG_DIR
    useTmpConfigDir()
    writeFileSync(join(dir, '.credentials.json'), JSON.stringify({ token: 'anterior' }))
    setFsImplementation({
      ...NodeFsOperations,
      async rename(): Promise<void> {
        throw errnoError('EIO')
      },
    })

    const result = await backendOver(dir).writeCredentials({ token: 'nuevo' })

    expect(result).toEqual({ state: 'failed' })
    expect(readdirSync(dir)).toEqual(['.credentials.json'])
    expect(JSON.parse(readFileSync(join(dir, '.credentials.json'), 'utf8'))).toEqual({ token: 'anterior' })
  })
})

describe('In.read({ fromStoreCopy: true }) con una copia corrupta', () => {
  test('una copia cuyo texto no es JSON resuelve null en vez de lanzar', () => {
    originalConfigDir = process.env.THYROX_CONFIG_DIR
    useTmpConfigDir()
    const storagePath = join(dir, '.credentials.json')
    __setMultiHostAwareForTests(true)
    setCopy(getHostGenerationState(), storagePath, '{no es json')

    expect(plainTextStorage.read({ fromStoreCopy: true })).toBeNull()
  })
})
