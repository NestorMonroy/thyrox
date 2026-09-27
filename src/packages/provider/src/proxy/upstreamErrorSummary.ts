/**
 * El resumen del último error del upstream, sin credenciales ni rutas y con
 * tope de 256 caracteres — porte de `ExtractUpstreamErrorSummary` y
 * `SanitizeUpstreamErrorSummary` de CLIProxyAPI
 * (`sdk/cliproxy/auth/selector.go`, MIT). Es lo que el error de enfriamiento
 * de todas las credenciales cuenta como causa.
 *
 * Si el texto trae un JSON (entero, o tras un prefijo corto seguido de `: {`),
 * el resumen es su código y su mensaje; si no, el texto mismo. En los dos
 * casos se redactan autorización en URL, parámetros de consulta sensibles,
 * rutas de Unix y Windows, cookies, cabeceras de autorización, claves `sk-` y
 * `ghp_`, portadores y pares clave-valor secretos.
 *
 * Divergencias declaradas:
 * - `\s` de RE2 es sólo espacio ASCII (`[\t\n\f\r ]`); el de JavaScript cubre
 *   Unicode. Las expresiones se construyen con la clase ASCII para medir lo
 *   mismo que la referencia.
 * - `sanitizerUnixPathBeforeColonPattern` y
 *   `sanitizerUnixPathBeforeNextPathPattern` se declaran en la referencia y
 *   ninguna función los usa: no se portan.
 * - Un valor no textual del JSON se resume como su JSON, que es lo que
 *   `gjson.Result.String` da para un objeto; para un número o un booleano,
 *   su texto.
 */

const ASCII_SPACE = '\\t\\n\\f\\r '

/** Una expresión de RE2 en JavaScript: `\s` pasa a la clase ASCII, dentro y fuera de una clase. */
function re2(source: string, flags = ''): RegExp {
  let out = ''
  let inClass = false
  for (let i = 0; i < source.length; i++) {
    const c = source[i]!
    if (c === '\\') {
      const next = source[i + 1]
      out += next === 's' ? (inClass ? ASCII_SPACE : `[${ASCII_SPACE}]`) : c + (next ?? '')
      i += 1
      continue
    }
    if (c === '[' && !inClass) inClass = true
    else if (c === ']' && inClass) inClass = false
    out += c
  }
  return new RegExp(out, flags)
}

const SCHEME_AUTH = re2(String.raw`((?:[A-Za-z0-9.+_\-]+:)?//)(?:[^:\s/@]+:[^@\s]+|[^@\s/]+)@`, 'gi')
const QUERY_PARAM = re2(String.raw`([?&][A-Za-z0-9_.-]*(?:key|token|secret|password|auth|sig|signature)=)[^&\s,\r\n;]+`, 'gi')
const COOKIE = re2(String.raw`\b(?:set-)?cookie\s*:[^\r\n]+`, 'gi')
const AUTH_HEADER = re2(String.raw`\bauthorization\s*[:=]\s*[^\r\n]+`, 'gi')
const NATURAL_SECRET = re2(String.raw`\b([A-Za-z0-9_.-]*(?:api[ _-]?key|access[ _-]?token|client[ _-]?secret|private[ _-]?key|secret[ _-]?key|password|secret|token|credentials?|sessionid))\s*(?:(?:is|was|provided|used)?\s*[:= ]\s*|\s+is\s+|\s+was\s+|\s+provided\s+|\s+)(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|(?:[^\r\n;,|]+?(?:\s+(?:and|with|for|via)\s+|[,;|]|\r|\n|$)|[^\r\n;,|]+))`, 'gi')
const KEY_VALUE = re2(String.raw`((?:'|")?(?:[A-Za-z0-9_.-]*(?:key|token|secret|password|credential|credentials|bearer|sessionid|auth|signature|sig))(?:'|")?\s*[=:]\s*)(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|(?:[^\r\n;,|]+?(?:\s+(?:and|with|for|via)\s+|[,;|]|\r|\n|$)|[^\r\n;,|]+))`, 'gi')
const INVALID_TOKEN = re2(String.raw`\b(invalid|bad|expired|unknown)\s+(?:api\s+key|access\s+token|refresh\s+token|token|key|secret|password|credentials?|bearer)\s*(?:[:= ]\s*)?(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[^\s,\r\n;]+)`, 'gi')
const SK_KEY = re2(String.raw`\b(?:sk-[A-Za-z0-9._~+/=-]{6,}|ghp_[A-Za-z0-9._~+/=-]{6,})\b`, 'g')
const BEARER = re2(String.raw`\b(?:bearer|basic)\s+[A-Za-z0-9._~+/=-]+`, 'gi')
const DOUBLE_QUOTED_PATH = re2(String.raw`"/[^"\r\n]+"`, 'g')
const SINGLE_QUOTED_PATH = re2(String.raw`'/[^'\r\n]+'`, 'g')
const BACKTICK_QUOTED_PATH = re2('`/[^`\\r\\n]+`', 'g')
const PATH_CONNECTOR = re2(String.raw`\s+(to|from|into|onto|for|via|with|and)\s+/`, 'i')
const UNIX_PATH = re2(String.raw`(^|[\s\(\[\{<"';,=])(/(?:[^/\s\r\n"',;?#()<>{}\[\]]+(?:\s+[^/\s\r\n"',;?#()<>{}\[\]]+)*/)*[^/:\s\r\n"',;?#()<>{}\[\]]+(?::[^/:\s\r\n"',;?#()<>{}\[\]]+)?)`, 'g')
const FILE_EXT_PATH = re2(String.raw`(^|[\s"'` + '`' + String.raw`(\[,;=])(/[^\s:\r\n"'` + '`' + String.raw`,;\])>]+(?:\s+[^\s:\r\n"'` + '`' + String.raw`,;\])>]+)*\.(?:json|yaml|yml|key|pem|txt|log|toml|conf|env|crt|cer))`, 'g')
const WINDOWS_PATH = re2(String.raw`\b[A-Za-z]:\\[^\r\n:,;'"<>]+`, 'gi')
const WINDOWS_UNC_PATH = re2(String.raw`\\\\[^\r\n:,;'"<>]+\\[^\r\n:,;'"<>]+`, 'g')

/** Las palabras de error tras las que empieza la explicación: la ruta está antes. */
const KNOWN_ERROR_PREFIXES = [
  'permission denied', 'no such file', 'file not found', 'access denied',
  'operation not permitted', 'denied', 'read-only', 'is a directory',
  'not a directory', 'cannot find', 'no space', 'connection refused',
  'timeout', 'failed', 'error', 'not supported', 'invalid argument',
]
const PATH_OPENERS = new Set([' ', '\t', '(', '[', '{', '<', '"', "'", '`', '='])
const PATH_CLOSERS = new Set([')', ']', '}', '>'])

/** El resumen saneado de un error del upstream, o cadena vacía. */
export function extractUpstreamErrorSummary(raw: string): string {
  const text = raw.trim()
  if (!text) return ''
  let jsonPart = text
  const idx = text.indexOf(': {')
  if (idx !== -1 && idx < 50) jsonPart = text.slice(idx + 2).trim()
  const summary = summaryFromJson(jsonPart)
  return sanitizeUpstreamErrorSummary(summary || text)
}

/** Lo que `gjson.Result.String` da para un valor: texto, número o JSON; vacío si falta. */
function gjsonString(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

function summaryFromJson(jsonPart: string): string {
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonPart)
  } catch {
    return ''
  }
  const root = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {}
  let code = ''
  let message = ''
  const error = root.error
  if (error && typeof error === 'object' && !Array.isArray(error)) {
    const node = error as Record<string, unknown>
    code = gjsonString(node.code).trim() || gjsonString(node.type).trim()
    message = gjsonString(node.message).trim()
  } else if (typeof error === 'string') {
    message = error.trim()
  }
  if (!code && !message) {
    code = gjsonString(root.code).trim() || gjsonString(root.type).trim()
    message = gjsonString(root.message).trim()
  }
  if (code && message) {
    const sameOrContained = code.toLowerCase() === message.toLowerCase() || message.toLowerCase().includes(code.toLowerCase())
    return sameOrContained ? message : `${code}: ${message}`
  }
  return message || code
}

/** Saneado y acotado a 256 caracteres: 253 y puntos suspensivos. */
export function sanitizeUpstreamErrorSummary(s: string): string {
  const runes = [...sanitizeNoTruncate(s)]
  return runes.length > 256 ? runes.slice(0, 253).join('') + '...' : runes.join('')
}

function sanitizeNoTruncate(input: string): string {
  let s = input.trim()
  if (!s) return ''
  s = s.replace(SCHEME_AUTH, '$1[REDACTED_AUTH]@')
    .replace(QUERY_PARAM, '$1[REDACTED]')
    .replace(DOUBLE_QUOTED_PATH, '"[REDACTED_PATH]"')
    .replace(SINGLE_QUOTED_PATH, "'[REDACTED_PATH]'")
    .replace(BACKTICK_QUOTED_PATH, '`[REDACTED_PATH]`')
    .replace(WINDOWS_PATH, '[REDACTED_PATH]')
    .replace(WINDOWS_UNC_PATH, '[REDACTED_PATH]')

  // Dos rutas unidas por un conector («copy /tmp/a to /tmp/b: denied»): cada mitad por separado.
  const connector = PATH_CONNECTOR.exec(s)
  if (connector) {
    const end = connector.index + connector[0].length
    return sanitizeNoTruncate(s.slice(0, connector.index)) + s.slice(connector.index, end - 1) + sanitizeNoTruncate('/' + s.slice(end))
  }

  s = redactPathBeforeColon(s)
  for (let i = 0; i < 3; i++) {
    const previous = s
    s = s.replace(UNIX_PATH, '$1[REDACTED_PATH]')
    if (s === previous) break
  }
  return s.replace(FILE_EXT_PATH, '$1[REDACTED_PATH]')
    .replace(COOKIE, 'Cookie: [REDACTED]')
    .replace(AUTH_HEADER, 'Authorization: [REDACTED]')
    .replace(SK_KEY, 'sk-[REDACTED]')
    .replace(BEARER, 'Bearer [REDACTED]')
    .replace(INVALID_TOKEN, '$1 token [REDACTED]')
    .replace(NATURAL_SECRET, '$1: [REDACTED]')
    .replace(KEY_VALUE, '$1[REDACTED]')
}

/** La primera ruta antes del delimitador del error («/etc/x: permission denied»), redactada. */
function redactPathBeforeColon(s: string): string {
  const lower = s.toLowerCase()
  let colon = -1
  for (const word of KNOWN_ERROR_PREFIXES) {
    const at = lower.indexOf(': ' + word)
    if (at !== -1 && (colon === -1 || at < colon)) colon = at
  }
  if (colon === -1) colon = s.indexOf(': ')
  if (colon === -1) return s
  const prefix = s.slice(0, colon)
  const suffix = s.slice(colon)
  let slash = -1
  for (let i = 0; i < prefix.length; i++) {
    if (prefix[i] !== '/') continue
    if (i > 0 && prefix[i - 1] === '/') continue
    const before = prefix.slice(0, i)
    if (i >= 6 && (before.endsWith('http:/') || before.endsWith('https:/') || before.endsWith('://'))) continue
    if (i === 0 || PATH_OPENERS.has(prefix[i - 1]!)) {
      slash = i
      break
    }
  }
  if (slash === -1) return s
  let pathPart = prefix.slice(slash)
  let trailing = ''
  while (pathPart.length > 0 && PATH_CLOSERS.has(pathPart.at(-1)!)) {
    trailing = pathPart.at(-1)! + trailing
    pathPart = pathPart.slice(0, -1)
  }
  pathPart = pathPart.includes(' /') ? pathPart.split(' /').map(() => '[REDACTED_PATH]').join(' ') : '[REDACTED_PATH]'
  return prefix.slice(0, slash) + pathPart + trailing + suffix
}
