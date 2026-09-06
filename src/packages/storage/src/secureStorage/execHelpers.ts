/**
 * Sustitutos locales de dependencias externas ausentes en este árbol, para
 * que `macOsKeychainStorage.ts` sea autocontenido:
 *
 *   - `execaSync` (paquete npm `execa`) — reimplementado con
 *     `node:child_process.spawnSync`, mismo contrato de retorno
 *     (`{ exitCode, stdout, stderr }`) para los dos únicos usos que la
 *     fuente hace: `input`/`stdio` (write vía stdin) y `stdio` simple
 *     (write vía argv, probe de `show-keychain-info`). `reject` no se
 *     honra — la fuente sólo la usa en `false`, así que nunca hace falta
 *     lanzar.
 *   - `execSyncWithDefaults` (`@claude-code-how-works/shell/execFileNoThrow.js`)
 *     — reimplementado con `node:child_process.execSync` (shell), que es
 *     exactamente lo que la fuente ejercita: un STRING de comando con
 *     comillas embebidas, no un argv array.
 *   - `execFileNoThrow` (idem) — reimplementado con
 *     `node:child_process.execFile`, sin lanzar en caso de error.
 *   - `jsonParse`/`jsonStringify` (`@claude-code-how-works/local-observability/slowOperations.js`)
 *     — `JSON.parse`/`JSON.stringify` directos; la fuente los envuelve para
 *     telemetría de operaciones lentas, que no aplica aquí.
 *   - `logForDebugging` (`@claude-code-how-works/local-observability/debug.js`)
 *     — `console.error` mínimo.
 *
 * Ninguna de estas funciones se ejercita por los tests de este pase (el
 * único test que toca `macOsKeychainStorage.ts` es un source-pin que sólo
 * lee el archivo como texto), pero se implementan de forma real —no un
 * stub que lance— para que el módulo sea funcionalmente correcto si algún
 * consumidor futuro lo invoca.
 */
import { execFile, execSync, spawnSync } from 'node:child_process'

export type ExecaSyncResult = {
  exitCode: number | null
  stdout: string
  stderr: string
}

export function execaSync(
  file: string,
  args: string[],
  opts: {
    input?: string
    stdio?: unknown
    reject?: boolean
    timeout?: number
  } = {},
): ExecaSyncResult {
  const result = spawnSync(file, args, {
    input: opts.input,
    timeout: opts.timeout,
    encoding: 'utf-8',
  })
  return {
    exitCode: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  }
}

export function execSyncWithDefaults(
  command: string,
  opts: { timeout?: number } = {},
): string {
  const result = execSync(command, {
    timeout: opts.timeout,
    encoding: 'utf-8',
  })
  return result.toString().trim()
}

export async function execFileNoThrow(
  file: string,
  args: string[],
  _opts: { useCwd?: boolean; preserveOutputOnError?: boolean } = {},
): Promise<{ stdout: string; code: number }> {
  return await new Promise(resolvePromise => {
    execFile(file, args, { encoding: 'utf-8' }, (error, stdout) => {
      if (!error) {
        resolvePromise({ stdout: stdout ?? '', code: 0 })
        return
      }
      const code =
        'code' in error && typeof error.code === 'number' ? error.code : 1
      resolvePromise({ stdout: stdout ?? '', code })
    })
  })
}

export function jsonParse<T = unknown>(raw: string): T {
  return JSON.parse(raw) as T
}

export function jsonStringify(value: unknown): string {
  return JSON.stringify(value)
}

export function logForDebugging(
  message: string,
  _opts: { level?: 'info' | 'warn' | 'error' } = {},
): void {
  console.error(message)
}
