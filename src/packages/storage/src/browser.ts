/**
 * Puerto fiel de `ccnmt: packages/storage/src/browser.ts` (1959 bytes
 * fuente, 2 símbolos exportados — porte completo).
 *
 * Divergencias declaradas (DEC-04):
 *
 * - `execFileNoThrow` (de `@claude-code-how-works/shell/execFileNoThrow.js`)
 *   — la fuente real (`shell/src/execFileNoThrow.ts`) trae su propia
 *   resolución de `cwd`, timeout, `stdin`/`input` y captura de
 *   stdout/stderr — superficie mucho mayor que lo que ESTE archivo
 *   consume (sólo `code`, sin leer stdout/stderr, sin opciones). Se
 *   reimplementa aquí, local y privado, con `node:child_process.execFile`
 *   como default — mismo patrón que `secureStorage/execHelpers.ts`
 *   (existente, no mío) ya usa para su propio `execFileNoThrow` — Y se
 *   inyecta vía setter (`setExecFileNoThrowForTests`), mismo patrón de DI
 *   que `fileUtilities.ts` (`setPlatformForTests`, no mío) ya establece
 *   en este paquete. La inyección es necesaria: `mock.module()` sobre
 *   `node:child_process` reemplaza el módulo para TODO el proceso de
 *   `bun test` (no sólo el archivo de test), rompiendo a otros
 *   consumidores reales del `execFile` verdadero
 *   (`getWorktreePathsPortable.ts`, vía git) — medido al intentarlo.
 * - `readEnv` (de `@claude-code-how-works/config/env/utils`) — la de
 *   `./internal/pendingCrossPackageDeps.js` (ya establecida para todo el
 *   paquete).
 */
import { execFile } from 'node:child_process'
import { readEnv } from './internal/pendingCrossPackageDeps.js'

function defaultExecFileNoThrow(
  file: string,
  args: string[],
): Promise<{ code: number }> {
  return new Promise(resolvePromise => {
    execFile(file, args, error => {
      if (!error) {
        resolvePromise({ code: 0 })
        return
      }
      const code =
        'code' in error && typeof error.code === 'number' ? error.code : 1
      resolvePromise({ code })
    })
  })
}

let _execFileNoThrow: (
  file: string,
  args: string[],
) => Promise<{ code: number }> = defaultExecFileNoThrow

/** Sólo para tests — sustituye el lanzador de subprocesos. */
export function setExecFileNoThrowForTests(
  fn: typeof _execFileNoThrow | null,
): void {
  _execFileNoThrow = fn ?? defaultExecFileNoThrow
}

function execFileNoThrow(
  file: string,
  args: string[],
): Promise<{ code: number }> {
  return _execFileNoThrow(file, args)
}

function validateUrl(url: string): void {
  let parsedUrl: URL

  try {
    parsedUrl = new URL(url)
  } catch (_error) {
    throw new Error(`Invalid URL format: ${url}`)
  }

  // Validate URL protocol for security
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error(
      `Invalid URL protocol: must use http:// or https://, got ${parsedUrl.protocol}`,
    )
  }
}

/**
 * Open a file or folder path using the system's default handler.
 * Uses `open` on macOS, `explorer` on Windows, `xdg-open` on Linux.
 */
export async function openPath(path: string): Promise<boolean> {
  try {
    const platform = process.platform
    if (platform === 'win32') {
      const { code } = await execFileNoThrow('explorer', [path])
      return code === 0
    }
    const command = platform === 'darwin' ? 'open' : 'xdg-open'
    const { code } = await execFileNoThrow(command, [path])
    return code === 0
  } catch (_) {
    return false
  }
}

export async function openBrowser(url: string): Promise<boolean> {
  try {
    // Parse and validate the URL
    validateUrl(url)

    const browserEnv = readEnv('BROWSER')
    const platform = process.platform

    if (platform === 'win32') {
      if (browserEnv) {
        // browsers require shell, else they will treat this as a file:/// handle
        const { code } = await execFileNoThrow(browserEnv, [`"${url}"`])
        return code === 0
      }
      const { code } = await execFileNoThrow('rundll32', ['url,OpenURL', url])
      return code === 0
    } else {
      const command =
        browserEnv || (platform === 'darwin' ? 'open' : 'xdg-open')
      const { code } = await execFileNoThrow(command, [url])
      return code === 0
    }
  } catch (_) {
    return false
  }
}
