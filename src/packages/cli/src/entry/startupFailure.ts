/**
 * La linea `result` que un arranque fallido deja en `stream-json`, portada de
 * la capa `cli` del binario 2.1.282/2.1.283 (`chunk-s3wcjm1d.js`, que
 * reexporta de `chunk-mpjg7e0m.js`; extraido con `bin/binary symbol` a
 * `.claude/workbench/entry-point-<fecha>/symbol/startupFailure-*.out`):
 *
 * | Binario | Aqui |
 * |---|---|
 * | `sut` + `ez` | `buildStartupFailureResult` |
 * | `out` | `isStartupFailureResultRequested` |
 * | `Fqn` + `Yun` | `isStreamJsonLaunch` |
 * | `d` | `sessionIdFor` |
 * | `WV` | `writeStartupFailureResult` |
 *
 * Un cliente que lanza `-p --output-format stream-json` espera leer una linea
 * `result`; si el proceso muere antes del bucle, no hay ninguna y el cliente
 * no distingue «fallo al arrancar» de «se colgo». Por eso se escribe, y solo
 * cuando se pide y el lanzamiento es `stream-json`.
 *
 * DIVERGENCIAS DECLARADAS:
 * - la variable es `THYROX_CODE_STARTUP_FAILURE_RESULTS`, no la
 *   `CLAUDE_CODE_…` del cliente de origen (regla de nombres del arbol);
 * - `usage` va con sus contadores en cero en vez del objeto `gf` del binario,
 *   que este arbol no porta;
 * - `ux`/`kle`/`Uqn` (lectores de argv) se reescriben aqui en dos funciones
 *   locales: aceptan `--bandera valor` y `--bandera=valor`.
 */
import { randomUUID } from 'node:crypto'
import { isEnvTruthy } from '@thyrox/config/env/utils'

const FLUSH_TIMEOUT_MS = 1000
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Env = Record<string, string | undefined>

export type StartupFailure = {
  sessionId: string
  message: string
  reason?: string
  resultIndex?: number | null
}

export type ResultStream = {
  write(chunk: string, callback?: () => void): boolean
  once(event: 'error', listener: () => void): unknown
  writableEnded: boolean
  destroyed: boolean
}

function hasFlag(flag: string, argv: readonly string[]): boolean {
  return argv.some(a => a === flag || a.startsWith(`${flag}=`))
}

/** El ultimo valor de una bandera, en sus dos formas (`kle(...).at(-1)`). */
function lastFlagValue(flag: string, argv: readonly string[]): string | undefined {
  let value: string | undefined
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] as string
    if (arg === flag && i + 1 < argv.length) value = argv[++i]
    else if (arg.startsWith(`${flag}=`)) value = arg.slice(flag.length + 1)
  }
  return value
}

/** `sut` sobre `ez`: el `result` de error con la razon del fallo. */
export function buildStartupFailureResult({ sessionId, message, reason, resultIndex = 0 }: StartupFailure) {
  return {
    type: 'result' as const,
    subtype: 'error_during_execution' as const,
    duration_ms: 0,
    duration_api_ms: 0,
    is_error: true,
    num_turns: 0,
    stop_reason: null,
    session_id: sessionId,
    total_cost_usd: 0,
    usage: { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
    modelUsage: {},
    permission_denials: [],
    uuid: randomUUID(),
    errors: [message],
    ...(reason !== undefined && { startup_failure_reason: reason }),
    ...(resultIndex !== null && { result_index: resultIndex }),
  }
}

/** `out`: el cliente lo pide explicitamente. */
export function isStartupFailureResultRequested(env: Env = process.env): boolean {
  return isEnvTruthy(env.THYROX_CODE_STARTUP_FAILURE_RESULTS)
}

/** `Fqn` con `Yun`: no interactivo, y con `--output-format stream-json`. */
export function isStreamJsonLaunch(argv: readonly string[] = process.argv.slice(2),
  isTTY: boolean = Boolean(process.stdout.isTTY)): boolean {
  const nonInteractive = hasFlag('-p', argv) || hasFlag('--print', argv) || hasFlag('--init-only', argv)
    || argv.some(a => a.startsWith('--sdk-url')) || !isTTY
  return nonInteractive && lastFlagValue('--output-format', argv) === 'stream-json'
}

/** `d`: el `--session-id` de argv gana si es un UUID (o si hay `--sdk-url`). */
export function sessionIdFor(fallback: string, argv: readonly string[] = process.argv.slice(2)): string {
  const declared = lastFlagValue('--session-id', argv)
  const accepted = lastFlagValue('--sdk-url', argv) === undefined
    ? (declared !== undefined && UUID.test(declared) ? declared : undefined)
    : declared
  return accepted || fallback
}

/** `WV`: una linea, con la escritura acotada a un segundo. */
export async function writeStartupFailureResult(failure: StartupFailure, io: {
  stdout?: ResultStream
  env?: Env
  argv?: readonly string[]
  isTTY?: boolean
} = {}): Promise<void> {
  const stdout = io.stdout ?? (process.stdout as unknown as ResultStream)
  const argv = io.argv ?? process.argv.slice(2)
  if (!isStartupFailureResultRequested(io.env ?? process.env)
    || !isStreamJsonLaunch(argv, io.isTTY ?? Boolean(process.stdout.isTTY))
    || stdout.writableEnded || stdout.destroyed) return
  const line = `${JSON.stringify(buildStartupFailureResult({ ...failure, sessionId: sessionIdFor(failure.sessionId, argv) }))}\n`
  let done = () => {}
  const flushed = new Promise<void>(resolve => { done = resolve })
  stdout.once('error', done)
  try {
    stdout.write(line, () => done())
  } catch {
    return
  }
  await Promise.race([flushed, new Promise<void>(resolve => setTimeout(resolve, FLUSH_TIMEOUT_MS).unref?.())])
}
