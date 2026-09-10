/**
 * Puerto de `ccnmt: packages/storage/src/secureStorage/plainTextStorage.ts`
 * (2369 bytes fuente, 1 símbolo exportado — porte completo). Fallback de
 * `SecureStorage` que guarda credenciales en texto plano bajo el directorio
 * de config de Claude, con permisos `0o600`.
 *
 * Divergencias declaradas (DEC-04), todas triviales:
 *
 * - `getClaudeConfigHomeDir` (de `@claude-code-how-works/config/env/utils`)
 *   — se reimplementa localmente, SIN memoización. La fuente la memoiza
 *   (`lodash-es/memoize`, resolver = `process.env.CLAUDE_CONFIG_DIR`)
 *   porque tiene 150+ llamadores de alto tráfico; este porte tiene un solo
 *   consumidor (este archivo), así que memoizar aquí sólo complicaría los
 *   tests que cambian `CLAUDE_CONFIG_DIR` entre casos sin aportar nada.
 * - `getErrnoCode` — la de `./fsOperations.js` de este mismo paquete
 *   (verbatim a la fuente de `local-observability/errorHelpers.js`, ya
 *   consolidada ahí).
 * - `jsonParse`/`jsonStringify` (de
 *   `@claude-code-how-works/local-observability/slowOperations.js`) —
 *   `JSON.parse`/`JSON.stringify` directos; la fuente los envuelve para
 *   telemetría de operaciones lentas (`slowLogging`, no-op fuera de un
 *   build ant — ver `../fsOperations.ts`), que no aplica aquí.
 * - `writeFileSync` (idem, `slowOperations.ts:124-155`) — reimplementado
 *   fiel a su lógica de `flush` (el único valor que este archivo usa es
 *   `flush: false`, que en la fuente cae al `fs.writeFileSync` normal).
 * - `SecureStorage`/`SecureStorageData` (de
 *   `@claude-code-how-works/mcp-runtime/secureStorageTypes.js`) — el tipo
 *   local `./types.js`, YA EXISTENTE en este árbol (no mío, ver su
 *   docstring: mismo sustituto que usan `fallbackStorage.ts` y
 *   `macOsKeychainStorage.ts`).
 */
import { chmodSync, closeSync, fsyncSync, openSync, writeFileSync as fsWriteFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { getErrnoCode, getFsImplementation } from '../fsOperations.js'
import type { SecureStorage, SecureStorageData } from './types.js'

/**
 * Sustituto local de
 * `@claude-code-how-works/config/env/utils`'s `getClaudeConfigHomeDir` —
 * misma fórmula, sin memoización (ver docstring del módulo).
 */
function getClaudeConfigHomeDir(): string {
  return (process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude')).normalize('NFC')
}

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
      fd = openSync(filePath, 'w')
      fsWriteFileSync(fd, data, { encoding: options.encoding })
      fsyncSync(fd)
    } finally {
      if (fd !== undefined) {
        closeSync(fd)
      }
    }
  } else {
    fsWriteFileSync(filePath, data, options)
  }
}

function getStoragePath(): { storageDir: string; storagePath: string } {
  const storageDir = getClaudeConfigHomeDir()
  const storageFileName = '.credentials.json'
  return { storageDir, storagePath: join(storageDir, storageFileName) }
}

export const plainTextStorage = {
  name: 'plaintext',
  read(): SecureStorageData | null {
    const { storagePath } = getStoragePath()
    try {
      const data = getFsImplementation().readFileSync(storagePath, {
        encoding: 'utf8',
      })
      return jsonParse(data)
    } catch {
      return null
    }
  },
  async readAsync(): Promise<SecureStorageData | null> {
    const { storagePath } = getStoragePath()
    try {
      const data = await getFsImplementation().readFile(storagePath, {
        encoding: 'utf8',
      })
      return jsonParse(data)
    } catch {
      return null
    }
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
      chmodSync(storagePath, 0o600)
      return {
        success: true,
        warning: 'Warning: Storing credentials in plaintext.',
      }
    } catch {
      return { success: false }
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
    }
  },
} satisfies SecureStorage
