/**
 * Puerto de `ccnmt: packages/local-observability/src/errorHelpers.ts` (201
 * líneas fuente, 100 % portado). Helpers de error compartidos, canónicos
 * en todo el árbol ccnmt — la fuente declara "Zero dependencies besides
 * the Anthropic SDK", y este puerto conserva esa propiedad: la única
 * dependencia externa es `@anthropic-ai/sdk` (instalada como dependencia
 * real de este paquete).
 *
 * Es el módulo con más líneas de importación entre los futuros
 * consumidores (`memory`/`swarm`/`mcp-runtime`/…) medidos en el censo del
 * porte — 71 líneas citan `errorHelpers.js`.
 */

import { APIUserAbortError } from '@anthropic-ai/sdk'

export class ClaudeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
  }
}

export class MalformedCommandError extends Error {}

export class AbortError extends Error {
  constructor(message?: string) {
    super(message)
    this.name = 'AbortError'
  }
}

/**
 * `true` sólo si `e` tiene alguna de las formas de "abort" que el árbol
 * produce: nuestra clase `AbortError`, un `DOMException` de
 * `AbortController.abort()` (`.name === 'AbortError'`), o el
 * `APIUserAbortError` del SDK. La clase del SDK se verifica con
 * `instanceof` porque los builds minificados mutilan los nombres de clase
 * — `constructor.name` termina como algo tipo `nJT`, y el SDK nunca fija
 * `this.name`, así que comparar por cadena falla en silencio en
 * producción.
 */
export function isAbortError(e: unknown): boolean {
  return (
    e instanceof AbortError ||
    e instanceof APIUserAbortError ||
    (e instanceof Error && e.name === 'AbortError')
  )
}

/**
 * Error de parseo de un archivo de configuración — incluye la ruta del
 * archivo y la configuración por defecto que debería usarse.
 */
export class ConfigParseError extends Error {
  filePath: string
  defaultConfig: unknown

  constructor(message: string, filePath: string, defaultConfig: unknown) {
    super(message)
    this.name = 'ConfigParseError'
    this.filePath = filePath
    this.defaultConfig = defaultConfig
  }
}

export class ShellError extends Error {
  constructor(
    public readonly stdout: string,
    public readonly stderr: string,
    public readonly code: number,
    public readonly interrupted: boolean,
  ) {
    super('Shell command failed')
    this.name = 'ShellError'
  }
}

export class TeleportOperationError extends Error {
  constructor(
    message: string,
    public readonly formattedMessage: string,
  ) {
    super(message)
    this.name = 'TeleportOperationError'
  }
}

/**
 * Error cuyo mensaje es seguro de loguear a telemetría. El nombre largo
 * exige confirmar explícitamente que el mensaje no contiene datos
 * sensibles (rutas de archivo, URLs, fragmentos de código) antes de
 * usarlo.
 */
export class TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS extends Error {
  readonly telemetryMessage: string

  constructor(message: string, telemetryMessage?: string) {
    super(message)
    this.name = 'TelemetrySafeError'
    this.telemetryMessage = telemetryMessage ?? message
  }
}

export function hasExactErrorMessage(error: unknown, message: string): boolean {
  return error instanceof Error && error.message === message
}

/** Normaliza un valor desconocido a `Error`. */
export function toError(e: unknown): Error {
  return e instanceof Error ? e : new Error(String(e))
}

/** Extrae un mensaje de cadena de un valor tipo-error desconocido. */
export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/** Extrae el código errno (p. ej. `'ENOENT'`, `'EACCES'`) de un error capturado. */
export function getErrnoCode(e: unknown): string | undefined {
  if (e && typeof e === 'object' && 'code' in e && typeof e.code === 'string') {
    return e.code
  }
  return undefined
}

/** `true` si el error es ENOENT (el archivo o directorio no existe). */
export function isENOENT(e: unknown): boolean {
  return getErrnoCode(e) === 'ENOENT'
}

/**
 * Extrae la ruta errno (la ruta del filesystem que disparó el error) de
 * un error capturado. `undefined` si el error no trae ruta.
 */
export function getErrnoPath(e: unknown): string | undefined {
  if (e && typeof e === 'object' && 'path' in e && typeof e.path === 'string') {
    return e.path
  }
  return undefined
}

/** Extrae el mensaje + los primeros N frames del stack de un error desconocido. */
export function shortErrorStack(e: unknown, maxFrames = 5): string {
  if (!(e instanceof Error)) return String(e)
  if (!e.stack) return e.message
  const lines = e.stack.split('\n')
  const header = lines[0] ?? e.message
  const frames = lines.slice(1).filter(l => l.trim().startsWith('at '))
  if (frames.length <= maxFrames) return e.stack
  return [header, ...frames.slice(0, maxFrames)].join('\n')
}

/**
 * `true` si el error significa que la ruta está ausente, inaccesible, o
 * estructuralmente inalcanzable.
 */
export function isFsInaccessible(e: unknown): e is NodeJS.ErrnoException {
  const code = getErrnoCode(e)
  return (
    code === 'ENOENT' ||
    code === 'EACCES' ||
    code === 'EPERM' ||
    code === 'ENOTDIR' ||
    code === 'ELOOP'
  )
}

export type AxiosErrorKind =
  | 'auth' // 401/403 — el llamador típicamente fija skipRetry
  | 'timeout' // ECONNABORTED
  | 'network' // ECONNREFUSED/ENOTFOUND
  | 'http' // otro error de axios (puede traer status)
  | 'other' // no es un error de axios

/** Clasifica un error de una petición axios en uno de estos cubos. */
export function classifyAxiosError(e: unknown): {
  kind: AxiosErrorKind
  status?: number
  message: string
} {
  const message = errorMessage(e)
  if (
    !e ||
    typeof e !== 'object' ||
    !('isAxiosError' in e) ||
    !e.isAxiosError
  ) {
    return { kind: 'other', message }
  }
  const err = e as {
    response?: { status?: number }
    code?: string
  }
  const status = err.response?.status
  if (status === 401 || status === 403) return { kind: 'auth', status, message }
  if (err.code === 'ECONNABORTED') return { kind: 'timeout', status, message }
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    return { kind: 'network', status, message }
  }
  return { kind: 'http', status, message }
}
