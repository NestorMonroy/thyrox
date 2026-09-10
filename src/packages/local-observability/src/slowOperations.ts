/**
 * Puerto de `ccnmt: packages/local-observability/src/slowOperations.ts`
 * (162 líneas fuente, 100 % portado). Envuelve `JSON.stringify`/
 * `JSON.parse`/`structuredClone`/`cloneDeep`/`fs.writeFileSync` con el tag
 * `slowLogging` de `slowLoggingTag.ts` para detectar operaciones lentas —
 * en este árbol el tag siempre resuelve al no-op externo (ver
 * `slowLoggingTag.ts`), así que estas envolturas son transparentes:
 * mismo resultado que la función nativa, sin medición real.
 *
 * `jsonStringify`/`jsonParse` son, junto con el barrel y `debug.js`, de
 * los subpaths más citados por futuros consumidores en el censo del
 * porte (56 líneas hacia `slowOperations.js`).
 */

import type { WriteFileOptions } from 'fs'
import {
  closeSync,
  writeFileSync as fsWriteFileSync,
  fsyncSync,
  openSync,
} from 'fs'
import lodashCloneDeep from 'lodash-es/cloneDeep.js'
import { addSlowOperation } from './internal/pendingCrossPackageDeps.js'
import { logForDebugging } from './debug.js'
import {
  SLOW_OPERATION_THRESHOLD_MS,
  _setSlowOpReporter,
  callerFrame,
  slowLogging,
} from './slowLoggingTag.js'

// Cablea el reporter — slowLoggingTag posee la primitiva de temporización
// pero los sinks de log (debug log + ring buffer de AppState) viven aquí.
// Este split rompe el ciclo slowOperations → debug → fsOperations →
// slowOperations. `addSlowOperation` es un punto de inyección (app-host
// no exporta `./bootstrap/state.js`; ver `pendingCrossPackageDeps.ts`) —
// hoy es no-op, así que este cableado no tiene efecto observable, pero
// preserva el contrato exacto de la fuente.
_setSlowOpReporter(addSlowOperation, logForDebugging)

export { SLOW_OPERATION_THRESHOLD_MS, callerFrame, slowLogging }

// WriteFileOptions extendido para incluir 'flush' (disponible desde
// Node.js 20.1.0+ pero aún no en @types/node).
type WriteFileOptionsWithFlush =
  | WriteFileOptions
  | (WriteFileOptions & { flush?: boolean })

// --- Operaciones envueltas ---

/**
 * `JSON.stringify` envuelto con medición de operación lenta.
 * Usar en vez de `JSON.stringify` directo para detectar problemas de
 * rendimiento.
 */
export function jsonStringify(
  value: unknown,
  replacer?: (this: unknown, key: string, value: unknown) => unknown,
  space?: string | number,
): string
export function jsonStringify(
  value: unknown,
  replacer?: (number | string)[] | null,
  space?: string | number,
): string
export function jsonStringify(
  value: unknown,
  replacer?:
    | ((this: unknown, key: string, value: unknown) => unknown)
    | (number | string)[]
    | null,
  space?: string | number,
): string {
  using _ = slowLogging`JSON.stringify(${value})`
  return JSON.stringify(
    value,
    replacer as Parameters<typeof JSON.stringify>[1],
    space,
  )
}

/**
 * `JSON.parse` envuelto con medición de operación lenta.
 */
export const jsonParse: typeof JSON.parse = (text, reviver) => {
  using _ = slowLogging`JSON.parse(${text})`
  // V8 des-optimiza JSON.parse cuando se pasa un segundo argumento,
  // aunque sea undefined. Se ramifica explícitamente para que el camino
  // común (sin reviver) se quede en el camino rápido.
  return typeof reviver === 'undefined'
    ? JSON.parse(text)
    : JSON.parse(text, reviver)
}

/**
 * `structuredClone` envuelto con medición de operación lenta.
 */
export function clone<T>(value: T, options?: StructuredSerializeOptions): T {
  using _ = slowLogging`structuredClone(${value})`
  return structuredClone(value, options)
}

/**
 * `cloneDeep` de lodash envuelto con medición de operación lenta.
 */
export function cloneDeep<T>(value: T): T {
  using _ = slowLogging`cloneDeep(${value})`
  return lodashCloneDeep(value)
}

/**
 * Envoltura de `fs.writeFileSync` con medición de operación lenta.
 * Soporta la opción `flush` para asegurar que el dato se escriba a disco
 * antes de retornar.
 * @deprecated Usar `fs.promises.writeFile` para escrituras no bloqueantes.
 * Las escrituras sync bloquean el event loop y causan problemas de
 * rendimiento.
 */
export function writeFileSync(
  filePath: string,
  data: string | NodeJS.ArrayBufferView,
  options?: WriteFileOptionsWithFlush,
): void {
  using _ = slowLogging`fs.writeFileSync(${filePath}, ${data})`

  const needsFlush =
    options !== null &&
    typeof options === 'object' &&
    'flush' in options &&
    options.flush === true

  if (needsFlush) {
    // Flush manual: abrir, escribir, fsync, cerrar.
    const encoding =
      typeof options === 'object' && 'encoding' in options
        ? options.encoding
        : undefined
    const mode =
      typeof options === 'object' && 'mode' in options ? options.mode : undefined
    let fd: number | undefined
    try {
      fd = openSync(filePath, 'w', mode)
      fsWriteFileSync(fd, data, { encoding: encoding ?? undefined })
      fsyncSync(fd)
    } finally {
      if (fd !== undefined) {
        closeSync(fd)
      }
    }
  } else {
    fsWriteFileSync(filePath, data, options as WriteFileOptions)
  }
}
