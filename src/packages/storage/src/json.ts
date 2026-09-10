/**
 * Porte de `ccnmt: packages/storage/src/json.ts`.
 *
 * DIVERGENCIA DE ALCANCE, declarada (medido con
 * `ls /home/user/thyrox/src/packages/`, 2026-09-06): la fuente importa
 * tres símbolos de paquetes hermanos ausentes en este árbol. Se
 * reimplementa el mínimo con el que el test corre para cada uno:
 *
 * - `logError` de `@claude-code-how-works/local-observability/logging`
 *   — reimplementado en `./logging.ts` (ver su propio docstring; ningún
 *   test de este pase observa su contenido real, sólo lo mockea a
 *   no-op).
 * - `jsonStringify` de
 *   `@claude-code-how-works/local-observability/slowOperations.js` — la
 *   fuente (`ccnmt: packages/local-observability/src/slowOperations.ts`)
 *   es un wrapper de `JSON.stringify` instrumentado con `slowLogging`
 *   (telemetría de operaciones lentas). Aquí es `JSON.stringify` sin
 *   instrumentar — mismo valor de retorno, sin la telemetría de
 *   performance, que ningún test de este pase ejercita.
 * - `memoizeWithLRU` de `@claude-code-how-works/config/memoize` — la
 *   fuente usa el paquete npm `lru-cache` con un objeto `.cache` que
 *   expone `clear/size/delete/get(peek)/has` para introspección externa.
 *   Aquí es una LRU mínima sobre `Map` (division: en el hit, `.get()`
 *   promueve recencia moviendo la entrada al final; al superar
 *   `maxCacheSize` se evict la entrada menos reciente — la del frente
 *   del Map, que itera en orden de inserción). Ningún test de este pase
 *   inspecciona `.cache` ni depende de la política exacta de eviction
 *   (con 50 entradas y JSON cortos, ninguno de los 28 casos se acerca al
 *   límite); el contrato observable — cachear por clave, devolver el
 *   mismo valor — es idéntico.
 *
 * `jsonc-parser@3.3.1` (real, MIT, Microsoft) SÍ se instaló como
 * dependencia real bajo `node_modules/` (sin tocar ningún
 * `package.json`, que otro agente de esta tanda está escribiendo ahora
 * mismo) — no es un paquete hermano `@claude-code-how-works`, es la
 * misma librería de terceros que la fuente usa para editar JSONC
 * preservando comentarios, y reimplementarla habría sido inventar un
 * parser JSONC en vez de portar el mínimo necesario.
 */
import { open, readFile, stat } from 'fs/promises'
import {
  applyEdits,
  modify,
  parse as parseJsonc,
} from 'jsonc-parser/lib/esm/main.js'
import { stripBOM } from './jsonRead.js'
import { logError } from './logging.js'

type CachedParse = { ok: true; value: unknown } | { ok: false }

/**
 * Reimplementación local mínima de
 * `@claude-code-how-works/local-observability/slowOperations.js:jsonStringify`
 * — ver docstring del módulo.
 */
function jsonStringify(
  value: unknown,
  replacer?: ((this: unknown, key: string, value: unknown) => unknown) | (number | string)[] | null,
  space?: string | number,
): string {
  return JSON.stringify(
    value,
    replacer as Parameters<typeof JSON.stringify>[1],
    space,
  )
}

type LRUMemoizedFunction<Args extends unknown[], Result> = {
  (...args: Args): Result
  cache: {
    clear: () => void
    size: () => number
    delete: (key: string) => boolean
    get: (key: string) => Result | undefined
    has: (key: string) => boolean
  }
}

/**
 * Reimplementación local mínima de
 * `@claude-code-how-works/config/memoize.js:memoizeWithLRU` — ver
 * docstring del módulo. LRU sobre `Map`: el orden de iteración de un
 * `Map` es el de inserción, así que promover una clave (delete + set)
 * la mueve al final, y la más vieja siempre está al frente.
 */
function memoizeWithLRU<
  Args extends unknown[],
  Result extends NonNullable<unknown>,
>(
  f: (...args: Args) => Result,
  cacheFn: (...args: Args) => string,
  maxCacheSize: number = 100,
): LRUMemoizedFunction<Args, Result> {
  const cache = new Map<string, Result>()

  const memoized = (...args: Args): Result => {
    const key = cacheFn(...args)
    const cached = cache.get(key)
    if (cached !== undefined) {
      // Promueve recencia: re-insertar mueve la clave al final.
      cache.delete(key)
      cache.set(key, cached)
      return cached
    }

    const result = f(...args)
    cache.set(key, result)
    if (cache.size > maxCacheSize) {
      const oldest = cache.keys().next().value
      if (oldest !== undefined) cache.delete(oldest)
    }
    return result
  }

  memoized.cache = {
    clear: () => cache.clear(),
    size: () => cache.size,
    delete: (key: string) => cache.delete(key),
    // peek-like: no promueve recencia, sólo observa.
    get: (key: string) => cache.get(key),
    has: (key: string) => cache.has(key),
  }

  return memoized
}

// Memoized inner parse. Uses a discriminated-union wrapper because:
// 1. memoizeWithLRU requires NonNullable<unknown>, but JSON.parse can return
//    null (e.g. JSON.parse("null")).
// 2. Invalid JSON must also be cached — otherwise repeated calls with the same
//    bad string re-parse and re-log every time (behavioral regression vs the
//    old lodash memoize which wrapped the entire try/catch).
// Bounded to 50 entries to prevent unbounded memory growth — previously this
// used lodash memoize which cached every unique JSON string forever (settings,
// .mcp.json, notebooks, tool results), causing a significant memory leak.
// Note: shouldLogError is intentionally excluded from the cache key (matching
// lodash memoize default resolver = first arg only).
// Skip caching above this size — the LRU stores the full string as the key,
// so a 200KB config file would pin ~10MB in #keyList across 50 slots. Large
// inputs like ~/.claude.json also change between reads (numStartups bumps on
// every CC startup), so the cache never hits anyway.
const PARSE_CACHE_MAX_KEY_BYTES = 8 * 1024

function parseJSONUncached(json: string, shouldLogError: boolean): CachedParse {
  try {
    return { ok: true, value: JSON.parse(stripBOM(json)) }
  } catch (e) {
    if (shouldLogError) {
      logError(e)
    }
    return { ok: false }
  }
}

const parseJSONCached = memoizeWithLRU(parseJSONUncached, json => json, 50)

// Important: memoized for performance (LRU-bounded to 50 entries, small inputs only).
export const safeParseJSON = Object.assign(
  function safeParseJSON(
    json: string | null | undefined,
    shouldLogError: boolean = true,
  ): unknown {
    if (!json) return null
    const result =
      json.length > PARSE_CACHE_MAX_KEY_BYTES
        ? parseJSONUncached(json, shouldLogError)
        : parseJSONCached(json, shouldLogError)
    return result.ok ? result.value : null
  },
  { cache: parseJSONCached.cache },
)

/**
 * Safely parse JSON with comments (jsonc).
 * This is useful for VS Code configuration files like keybindings.json
 * which support comments and other jsonc features.
 */
export function safeParseJSONC(json: string | null | undefined): unknown {
  if (!json) {
    return null
  }
  try {
    // Strip BOM before parsing - PowerShell 5.x adds BOM to UTF-8 files
    return parseJsonc(stripBOM(json))
  } catch (e) {
    logError(e)
    return null
  }
}

/**
 * Modify a jsonc string by adding a new item to an array, preserving comments and formatting.
 * @param content The jsonc string to modify
 * @param newItem The new item to add to the array
 * @returns The modified jsonc string
 */
/**
 * Bun.JSONL.parseChunk if available, false otherwise.
 * Supports both strings and Buffers, minimizing memory usage and copies.
 * Also handles BOM stripping internally.
 */
type BunJSONLParseChunk = (
  data: string | Buffer,
  offset?: number,
) => { values: unknown[]; error: null | Error; read: number; done: boolean }

const bunJSONLParse: BunJSONLParseChunk | false = (() => {
  if (typeof Bun === 'undefined') return false
  const b = Bun as Record<string, unknown>
  const jsonl = b.JSONL as Record<string, unknown> | undefined
  if (!jsonl?.parseChunk) return false
  return jsonl.parseChunk as BunJSONLParseChunk
})()

function parseJSONLBun<T>(data: string | Buffer): T[] {
  const parse = bunJSONLParse as BunJSONLParseChunk
  const len = data.length
  const result = parse(data)
  if (!result.error || result.done || result.read >= len) {
    return result.values as T[]
  }
  // Had an error mid-stream — collect what we got and keep going
  let values = result.values as T[]
  let offset = result.read
  while (offset < len) {
    const newlineIndex =
      typeof data === 'string'
        ? data.indexOf('\n', offset)
        : data.indexOf(0x0a, offset)
    if (newlineIndex === -1) break
    offset = newlineIndex + 1
    const next = parse(data, offset)
    if (next.values.length > 0) {
      values = values.concat(next.values as T[])
    }
    if (!next.error || next.done || next.read >= len) break
    offset = next.read
  }
  return values
}

function parseJSONLBuffer<T>(buf: Buffer): T[] {
  const bufLen = buf.length
  let start = 0

  // Strip UTF-8 BOM (EF BB BF)
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    start = 3
  }

  const results: T[] = []
  while (start < bufLen) {
    let end = buf.indexOf(0x0a, start)
    if (end === -1) end = bufLen

    const line = buf.toString('utf8', start, end).trim()
    start = end + 1
    if (!line) continue
    try {
      results.push(JSON.parse(line) as T)
    } catch {
      // Skip malformed lines
    }
  }
  return results
}

function parseJSONLString<T>(data: string): T[] {
  const stripped = stripBOM(data)
  const len = stripped.length
  let start = 0

  const results: T[] = []
  while (start < len) {
    let end = stripped.indexOf('\n', start)
    if (end === -1) end = len

    const line = stripped.substring(start, end).trim()
    start = end + 1
    if (!line) continue
    try {
      results.push(JSON.parse(line) as T)
    } catch {
      // Skip malformed lines
    }
  }
  return results
}

/**
 * Parses JSONL data from a string or Buffer, skipping malformed lines.
 * Uses Bun.JSONL.parseChunk when available for better performance,
 * falls back to indexOf-based scanning otherwise.
 */
export function parseJSONL<T>(data: string | Buffer): T[] {
  if (bunJSONLParse) {
    return parseJSONLBun<T>(data)
  }
  if (typeof data === 'string') {
    return parseJSONLString<T>(data)
  }
  return parseJSONLBuffer<T>(data)
}

const MAX_JSONL_READ_BYTES = 100 * 1024 * 1024

/**
 * Reads and parses a JSONL file, reading at most the last 100 MB.
 * For files larger than 100 MB, reads the tail and skips the first partial line.
 *
 * 100 MB is more than sufficient since the longest context window we support
 * is ~2M tokens, which is well under 100 MB of JSONL.
 */
export async function readJSONLFile<T>(filePath: string): Promise<T[]> {
  const { size } = await stat(filePath)
  if (size <= MAX_JSONL_READ_BYTES) {
    return parseJSONL<T>(await readFile(filePath))
  }
  await using fd = await open(filePath, 'r')
  const buf = Buffer.allocUnsafe(MAX_JSONL_READ_BYTES)
  let totalRead = 0
  const fileOffset = size - MAX_JSONL_READ_BYTES
  while (totalRead < MAX_JSONL_READ_BYTES) {
    const { bytesRead } = await fd.read(
      buf,
      totalRead,
      MAX_JSONL_READ_BYTES - totalRead,
      fileOffset + totalRead,
    )
    if (bytesRead === 0) break
    totalRead += bytesRead
  }
  // Skip the first partial line
  const newlineIndex = buf.indexOf(0x0a)
  if (newlineIndex !== -1 && newlineIndex < totalRead - 1) {
    return parseJSONL<T>(buf.subarray(newlineIndex + 1, totalRead))
  }
  return parseJSONL<T>(buf.subarray(0, totalRead))
}

export function addItemToJSONCArray(content: string, newItem: unknown): string {
  try {
    // If the content is empty or whitespace, create a new JSON file
    if (!content || content.trim() === '') {
      return jsonStringify([newItem], null, 4)
    }

    // Strip BOM before parsing - PowerShell 5.x adds BOM to UTF-8 files
    const cleanContent = stripBOM(content)

    // Parse the content to check if it's valid JSON
    const parsedContent = parseJsonc(cleanContent)

    // If the parsed content is a valid array, modify it
    if (Array.isArray(parsedContent)) {
      // Get the length of the array
      const arrayLength = parsedContent.length

      // Determine if we are dealing with an empty array
      const isEmpty = arrayLength === 0

      // If it's an empty array we want to add at index 0, otherwise append to the end
      const insertPath = isEmpty ? [0] : [arrayLength]

      // Generate edits - we're using isArrayInsertion to add a new item without overwriting existing ones
      const edits = modify(cleanContent, insertPath, newItem, {
        formattingOptions: { insertSpaces: true, tabSize: 4 },
        isArrayInsertion: true,
      })

      // If edits could not be generated, fall back to manual JSON string manipulation
      if (!edits || edits.length === 0) {
        const copy = [...parsedContent, newItem]
        return jsonStringify(copy, null, 4)
      }

      // Apply the edits to preserve comments (use cleanContent without BOM)
      return applyEdits(cleanContent, edits)
    }
    // If it's not an array at all, create a new array with the item
    else {
      // If the content exists but is not an array, we'll replace it completely
      return jsonStringify([newItem], null, 4)
    }
  } catch (e) {
    // If parsing fails for any reason, log the error and fallback to creating a new JSON array
    logError(e)
    return jsonStringify([newItem], null, 4)
  }
}
