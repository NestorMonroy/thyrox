/**
 * Puerto de `ccnmt: packages/storage/src/secureStorage/plainTextStorage.ts`,
 * llevado a la conducta de `chunk-mmqkf96q.js` (2.1.283): `In` (el almacén
 * `plaintext`), con `osGuarded: false`, la lectura estricta con centinela
 * (`fc`/`READ_FAILED`), la copia por generación (`fromStoreCopy`), `mutate`
 * sobre `Et`, e `invalidateCache` sobre `c_e`. El resto de la máquina
 * (candado de escritura, copia por generación, mapeadores de errno,
 * backend de archivo) vive en `./credentialStoreInternals.ts` — ver su
 * docstring para las divergencias declaradas.
 *
 * Divergencias propias de este archivo:
 *
 * - `getConfigHomeDir` (de `@claude-code-how-works/config/env/utils`) —
 *   igual que en el porte anterior: reimplementada localmente sin
 *   memoización (ver abajo, sin cambios respecto al porte previo).
 * - `update()`/`delete()` se quedan SÍNCRONOS (exportación pública ya
 *   existente, preservada): no enrutan por `Pr`/`ji`, que son
 *   inherentemente asíncronos. Esto coincide con la conducta observable de
 *   la fuente cuando se los llama sin backend — `Pr(undefined)` siempre
 *   resuelve a `Bi` — así que sólo se pierde el camino con seguimiento de
 *   generación cuando alguien pasara un backend explícito a `update`/
 *   `delete`, cosa que ningún consumidor de este árbol hace. Si en el
 *   futuro hace falta, `update`/`delete` async es el símbolo que falta
 *   portar.
 * - `writeFileSync` (de `slowOperations.ts:124-155`) — reimplementado
 *   fiel a su lógica de `flush`, y crea el archivo ya con modo 0600, como
 *   `An(n, b(e), 384)` en `Bi.write`, en vez de crearlo con la umask y
 *   corregirlo después.
 * - `jsonParse`/`jsonStringify` — `JSON.parse`/`JSON.stringify` directos.
 */
import { chmodSync, closeSync, fsyncSync, openSync, writeFileSync as fsWriteFileSync } from 'fs'
import { join } from 'path'
import { getErrnoCode, getFsImplementation } from '../fsOperations.js'
import {
  createFileCredentialBackend,
  getHostGenerationState,
  invalidateHostCache,
  isMultiHostAware,
  mutateCredentials,
  PLAINTEXT_WARNING,
  selectBackend,
} from './credentialStoreInternals.js'
import type {
  CredentialBackend,
  ReadFailed,
  SecureStorage,
  SecureStorageData,
  SecureStorageReadOptions,
  SecureStorageReadStrictOptions,
  SecureStorageUpdateResult,
} from './types.js'
import { getConfigHomeDir } from '@thyrox/config/env/configHome.js'

function jsonParse<T = unknown>(raw: string): T {
  return JSON.parse(raw) as T
}

function jsonStringify(value: unknown): string {
  return JSON.stringify(value)
}

/**
 * Sustituto local de `slowOperations.ts`'s `writeFileSync` — misma lógica
 * de `flush` (sin el envoltorio de telemetría `slowLogging`).
 */
function writeFileSync(
  filePath: string,
  data: string,
  options: { encoding: BufferEncoding; flush: boolean },
): void {
  if (options.flush) {
    let fd: number | undefined
    try {
      fd = openSync(filePath, 'w', CREDENTIALS_FILE_MODE)
      fsWriteFileSync(fd, data, { encoding: options.encoding })
      fsyncSync(fd)
    } finally {
      if (fd !== undefined) {
        closeSync(fd)
      }
    }
  } else {
    fsWriteFileSync(filePath, data, { ...options, mode: CREDENTIALS_FILE_MODE })
  }
}

/** Modo del archivo de credenciales, aplicado al crearlo y reafirmado con
 * `chmod` (`An(n, b(e), 384)` y `Li(n, 384)` en `Bi.write`). */
const CREDENTIALS_FILE_MODE = 0o600

/** Puerto de `we`. */
function getStoragePath(): { storageDir: string; storagePath: string } {
  const storageDir = getConfigHomeDir()
  const storageFileName = '.credentials.json'
  return { storageDir, storagePath: join(storageDir, storageFileName) }
}

function defaultBackend(): CredentialBackend {
  return createFileCredentialBackend(getStoragePath)
}

/** La copia por generación de este host, sólo si se pidió
 * (`fromStoreCopy`), el proceso es multi-host y la copia es de esta ruta. */
function storeCopyFor(
  storagePath: string,
  options: SecureStorageReadOptions | undefined,
): { text: string | null } | undefined {
  const wantsCopy = isMultiHostAware() && options?.fromStoreCopy === true
  const copy = wantsCopy ? getHostGenerationState().copy : undefined
  return copy !== undefined && copy.storagePath === storagePath ? copy : undefined
}

export const plainTextStorage = {
  name: 'plaintext',
  osGuarded: false,
  read(options?: SecureStorageReadOptions): SecureStorageData | null {
    const { storagePath } = getStoragePath()
    try {
      const copy = storeCopyFor(storagePath, options)
      if (copy !== undefined) {
        return copy.text === null ? null : jsonParse(copy.text)
      }
      const data = getFsImplementation().readFileSync(storagePath, {
        encoding: 'utf8',
      })
      return jsonParse(data)
    } catch {
      return null
    }
  },
  async readAsync(backend: CredentialBackend = defaultBackend()): Promise<SecureStorageData | null> {
    return selectBackend(getStoragePath, backend).read()
  },
  async readAsyncStrict(
    backend: CredentialBackend = defaultBackend(),
    options?: SecureStorageReadStrictOptions,
  ): Promise<SecureStorageData | null | ReadFailed> {
    return selectBackend(getStoragePath, backend).readStrict(options?.unreadableFileAs === 'failure')
  },
  async mutate(
    mutator: (data: SecureStorageData) => SecureStorageData,
    backend?: CredentialBackend,
  ): Promise<SecureStorageUpdateResult & { transient?: boolean }> {
    return mutateCredentials(plainTextStorage, mutator, backend)
  },
  invalidateCache(): void {
    invalidateHostCache()
  },
  update(data: SecureStorageData): { success: boolean; warning?: string } {
    try {
      const { storageDir, storagePath } = getStoragePath()
      try {
        getFsImplementation().mkdirSync(storageDir)
      } catch (e: unknown) {
        const code = getErrnoCode(e)
        if (code !== 'EEXIST') {
          throw e
        }
      }

      writeFileSync(storagePath, jsonStringify(data), {
        encoding: 'utf8',
        flush: false,
      })
      chmodSync(storagePath, CREDENTIALS_FILE_MODE)
      return {
        success: true,
        warning: PLAINTEXT_WARNING,
      }
    } catch {
      return { success: false }
    } finally {
      if (isMultiHostAware()) invalidateHostCache()
    }
  },
  delete(): boolean {
    const { storagePath } = getStoragePath()
    try {
      getFsImplementation().unlinkSync(storagePath)
      return true
    } catch (e: unknown) {
      const code = getErrnoCode(e)
      if (code === 'ENOENT') {
        return true
      }
      return false
    } finally {
      if (isMultiHostAware()) invalidateHostCache()
    }
  },
} satisfies SecureStorage
