/**
 * Puerto de `ccnmt: packages/tool-registry/src/toolErrors.ts` (128 líneas,
 * 3 símbolos exportados). Lo que el modelo LEE cuando una herramienta falla.
 *
 * Es la superficie que decide si el reintento va a ciegas o corrige algo.
 * De ahí las tres decisiones que no se leen solas:
 *
 *   - Un abort NO se formatea como un fallo: «te interrumpieron» y «falló»
 *     piden conductas opuestas, y un abort sin mensaje formateado como
 *     cadena vacía se leería como fallo mudo.
 *   - Un error sin nada que decir devuelve un texto, nunca la cadena
 *     vacía: en un resultado de herramienta, la vacía es indistinguible de
 *     «funcionó y no imprimió nada».
 *   - Un error gigante se trunca por LOS DOS EXTREMOS: sólo por el final
 *     perdería el resumen que muchas herramientas imprimen al terminar;
 *     sólo por el principio perdería la causa.
 */
import { INTERRUPT_MESSAGE_FOR_TOOL_USE } from '@thyrox/agent/messages.js'
import { AbortError, ShellError } from '@thyrox/local-observability/errorHelpers.js'
import type { ZodError } from 'zod/v4'

/** Umbral por encima del cual el mensaje se trunca. */
const MAX_ERROR_CHARS = 10_000
/** Cuánto se conserva de cada extremo al truncar. */
const KEPT_PER_SIDE = 5_000

export function formatError(error: unknown): string {
  if (error instanceof AbortError) {
    return error.message || INTERRUPT_MESSAGE_FOR_TOOL_USE
  }
  if (!(error instanceof Error)) {
    return String(error)
  }
  const parts = getErrorParts(error)
  const fullMessage =
    parts.filter(Boolean).join('\n').trim() || 'Command failed with no output'
  if (fullMessage.length <= MAX_ERROR_CHARS) {
    return fullMessage
  }
  const start = fullMessage.slice(0, KEPT_PER_SIDE)
  const end = fullMessage.slice(-KEPT_PER_SIDE)
  const dropped = fullMessage.length - MAX_ERROR_CHARS
  return `${start}\n\n... [${dropped} characters truncated] ...\n\n${end}`
}

/**
 * Las piezas que componen el mensaje, en el orden en que se leen. Un
 * `ShellError` trae las suyas propias; un `Error` corriente puede traer
 * `stderr`/`stdout` colgados —la forma que deja `child_process`— y leer
 * sólo `.message` perdería toda la salida del proceso.
 */
export function getErrorParts(error: Error): string[] {
  if (error instanceof ShellError) {
    return [
      `Exit code ${error.code}`,
      error.interrupted ? INTERRUPT_MESSAGE_FOR_TOOL_USE : '',
      error.stderr,
      error.stdout,
    ]
  }
  const parts = [error.message]
  if ('stderr' in error && typeof error.stderr === 'string') {
    parts.push(error.stderr)
  }
  if ('stdout' in error && typeof error.stdout === 'string') {
    parts.push(error.stdout)
  }
  return parts
}

/**
 * La ruta de validación, escrita como se ESCRIBIRÍA en el JSON:
 * `['todos', 0, 'activeForm']` → `todos[0].activeForm`. El modelo tiene
 * que poder copiarla al reintento, y `todos,0,activeForm` no se copia.
 */
function formatValidationPath(path: PropertyKey[]): string {
  if (path.length === 0) return ''
  return path.reduce<string>((acc, segment, index) => {
    const segmentText = String(segment)
    if (typeof segment === 'number') return `${acc}[${segmentText}]`
    return index === 0 ? segmentText : `${acc}.${segmentText}`
  }, '')
}

/**
 * Traduce un error de esquema a algo que el modelo pueda corregir.
 *
 * Clasifica en tres formas —ausente, inventado, tipo equivocado— porque
 * son las tres correcciones que el modelo puede hacer sin adivinar. Lo que
 * no cae en ninguna conserva el mensaje original de zod: el respaldo es lo
 * que impide que un problema no clasificado llegue como cadena vacía.
 */
export function formatZodValidationError(
  toolName: string,
  error: ZodError,
): string {
  const missingParams = error.issues
    .filter(
      issue =>
        issue.code === 'invalid_type' &&
        issue.message.includes('received undefined'),
    )
    .map(issue => formatValidationPath(issue.path as PropertyKey[]))

  const unexpectedParams = error.issues
    .filter(issue => issue.code === 'unrecognized_keys')
    .flatMap(issue => (issue as unknown as { keys: string[] }).keys)

  const typeMismatchParams = error.issues
    .filter(
      issue =>
        issue.code === 'invalid_type' &&
        !issue.message.includes('received undefined'),
    )
    .map(issue => {
      const received = issue.message.match(/received (\w+)/)?.[1] ?? 'unknown'
      return {
        param: formatValidationPath(issue.path as PropertyKey[]),
        expected: (issue as unknown as { expected: string }).expected,
        received,
      }
    })

  const errorParts: string[] = []
  for (const param of missingParams) {
    errorParts.push(`The required parameter \`${param}\` is missing`)
  }
  for (const param of unexpectedParams) {
    errorParts.push(`An unexpected parameter \`${param}\` was provided`)
  }
  for (const { param, expected, received } of typeMismatchParams) {
    errorParts.push(
      `The parameter \`${param}\` type is expected as \`${expected}\` but provided as \`${received}\``,
    )
  }

  if (errorParts.length === 0) return error.message
  const noun = errorParts.length > 1 ? 'issues' : 'issue'
  return `${toolName} failed due to the following ${noun}:\n${errorParts.join('\n')}`
}
