/**
 * Porte fiel de `ccnmt: packages/shell/src/which.ts` (paquete `shell`,
 * licencia UNLICENSED — reimplementación, no copia). Porte COMPLETO: los
 * dos símbolos exportados de la fuente — `which` y `whichSync` — están
 * ambos presentes, con las mismas dos funciones internas
 * (`whichNodeAsync`/`whichNodeSync`) que sirven de respaldo cuando
 * `Bun.which` no está disponible.
 *
 * En ESTE árbol el runtime ES Bun, así que `Bun.which` siempre existe y
 * el camino `whichNodeAsync`/`whichNodeSync` es código muerto en la
 * práctica — se porta de todas formas porque «porte completo» exige los
 * símbolos exportados y su comportamiento en cualquier runtime, no sólo
 * en el de hoy.
 *
 * Divergencia medida y documentada: la fuente usa `execa` (no resuelve
 * aquí — mismo hallazgo que `execFileNoThrow.ts`, hermano de este
 * módulo). El camino async se reimplementa con
 * `node:child_process.execFile` corrido por shell (`shell: true`,
 * equivalente al de execa); el camino sync usa
 * `node:child_process.execSync`. La fuente delega el camino sync a un
 * módulo hermano propio, `./execSyncWrapper.js` (39 líneas: sólo envuelve
 * `execSync` de Node con telemetría `slowLogging` — no es uno de los 6
 * módulos pedidos y no tiene consumidor propio fuera de este archivo), así
 * que aquí se inlinea en vez de crear un archivo aparte.
 */
import { execFile, execSync } from 'node:child_process'

type SlowLoggingTag = (strings: TemplateStringsArray, ...values: unknown[]) => Disposable

function requireSlowOperations(): { slowLogging: SlowLoggingTag } {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/local-observability/slowOperations.js')
}

function noopDisposable(): Disposable {
  return { [Symbol.dispose]() {} }
}

function slowLoggingDeferred(): SlowLoggingTag {
  try {
    return requireSlowOperations().slowLogging
  } catch {
    return noopDisposable
  }
}

/**
 * Envoltura de `node:child_process.execSync` con telemetría de operación
 * lenta — inlineado desde `ccnmt: packages/shell/src/execSyncWrapper.ts`
 * (ver docstring del módulo).
 */
function execSyncWrapped(command: string, options: { encoding: 'utf-8'; stdio: [string, string, string] }): string {
  using _slowSpan = slowLoggingDeferred()`execSync: ${command.slice(0, 100)}`
  return execSync(command, options as Parameters<typeof execSync>[1]).toString()
}

async function whichNodeAsync(command: string): Promise<string | null> {
  if (process.platform === 'win32') {
    // En Windows, usa where.exe y devuelve el primer resultado.
    const result = await new Promise<{ code: number; stdout: string }>(resolve => {
      execFile('where.exe', [command], { shell: true, encoding: 'utf8' }, (error, stdout) => {
        resolve({ code: error ? (typeof error.code === 'number' ? error.code : 1) : 0, stdout: stdout || '' })
      })
    })
    if (result.code !== 0 || !result.stdout) {
      return null
    }
    // where.exe devuelve varias rutas separadas por saltos de línea;
    // se devuelve la primera.
    return result.stdout.trim().split(/\r?\n/)[0] || null
  }

  // En sistemas POSIX (macOS, Linux, WSL), usa which.
  const result = await new Promise<{ code: number; stdout: string }>(resolve => {
    execFile('which', [command], { shell: true, encoding: 'utf8' }, (error, stdout) => {
      resolve({ code: error ? (typeof error.code === 'number' ? error.code : 1) : 0, stdout: stdout || '' })
    })
  })
  if (result.code !== 0 || !result.stdout) {
    return null
  }
  return result.stdout.trim()
}

function whichNodeSync(command: string): string | null {
  if (process.platform === 'win32') {
    try {
      const output = execSyncWrapped(`where.exe ${command}`, {
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim()
      return output.split(/\r?\n/)[0] || null
    } catch {
      return null
    }
  }

  try {
    const output = execSyncWrapped(`which ${command}`, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    return output.trim() || null
  } catch {
    return null
  }
}

const bunWhich = typeof Bun !== 'undefined' && typeof Bun.which === 'function' ? Bun.which : null

/**
 * Encuentra la ruta completa a un ejecutable. Usa `Bun.which` cuando
 * corre en Bun (rápido, sin lanzar un proceso); si no, lanza el comando
 * apropiado para la plataforma.
 *
 * @param command - el nombre del comando a buscar
 * @returns la ruta completa al comando, o `null` si no se encuentra
 */
export const which: (command: string) => Promise<string | null> = bunWhich
  ? async command => bunWhich(command)
  : whichNodeAsync

/**
 * Versión síncrona de `which`.
 *
 * @param command - el nombre del comando a buscar
 * @returns la ruta completa al comando, o `null` si no se encuentra
 */
export const whichSync: (command: string) => string | null = bunWhich ?? whichNodeSync
