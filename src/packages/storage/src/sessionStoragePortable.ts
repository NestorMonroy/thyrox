/**
 * Utilidades portables de almacenamiento de sesión.
 *
 * Node.js puro — sin dependencias internas de logging, experimentos o
 * feature flags (en la fuente, compartido entre el CLI y la extensión de
 * VS Code).
 *
 * Adaptación de ccnmt `packages/storage/src/sessionStoragePortable.ts`
 * (797 líneas).
 *
 * PORTE PARCIAL DECLARADO — se portan seis símbolos: `validateUuid`,
 * `unescapeJsonString`, `extractJsonStringField`,
 * `extractLastJsonStringField`, `extractFirstPromptFromHead`,
 * `sanitizePath`. Son los que el conjunto de tests portado hasta ahora
 * ejerce, y no requieren I/O de disco. El resto del archivo
 * (`readHeadAndTail`, `readSessionLite`, `getProjectsDir`/`getProjectDir`,
 * el parser incremental de boundaries de compactación
 * `scanChunkLines`/`processStraddle`/etc.) depende de `fs/promises`, de
 * `@claude-code-how-works/config/env/utils` (`getClaudeConfigHomeDir`) y de
 * `./getWorktreePathsPortable.js`, ninguno presente en este paquete
 * todavía; queda fuera de este porte.
 *
 * Sustituto local — `djb2Hash` (usado sólo como *fallback* de `sanitizePath`
 * cuando `Bun` no está definido; bajo `bun test` esa rama nunca se ejecuta
 * porque `Bun.hash` sí existe, pero se reimplementa para que el archivo
 * compile igual sin runtime de Bun): DJB2 es el algoritmo de hash más
 * simple y ampliamente documentado que existe (Daniel J. Bernstein, dominio
 * público) — la reimplementación aquí es la fórmula estándar
 * (`hash = hash*33 ^ char`), no una copia del archivo de
 * `@claude-code-how-works/config/hash.ts`.
 */
import type { UUID } from 'crypto'

// ---------------------------------------------------------------------------
// Validación de UUID
// ---------------------------------------------------------------------------

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function validateUuid(maybeUuid: unknown): UUID | null {
  if (typeof maybeUuid !== 'string') return null
  return uuidRegex.test(maybeUuid) ? (maybeUuid as UUID) : null
}

// ---------------------------------------------------------------------------
// Extracción de campo string de JSON — sin parseo completo, funciona sobre
// líneas truncadas
// ---------------------------------------------------------------------------

/**
 * Desescapa un valor string de JSON extraído como texto crudo. Sólo asigna
 * una string nueva cuando hay secuencias de escape presentes.
 */
export function unescapeJsonString(raw: string): string {
  if (!raw.includes('\\')) return raw
  try {
    return JSON.parse(`"${raw}"`)
  } catch {
    return raw
  }
}

/**
 * Extrae un valor simple de campo string de JSON desde texto crudo, sin
 * parseo completo. Busca patrones `"key":"value"` o `"key": "value"`.
 * Devuelve la PRIMERA coincidencia, o `undefined` si no se encuentra.
 */
export function extractJsonStringField(
  text: string,
  key: string,
): string | undefined {
  const patterns = [`"${key}":"`, `"${key}": "`]
  for (const pattern of patterns) {
    const idx = text.indexOf(pattern)
    if (idx < 0) continue

    const valueStart = idx + pattern.length
    let i = valueStart
    while (i < text.length) {
      if (text[i] === '\\') {
        i += 2
        continue
      }
      if (text[i] === '"') {
        return unescapeJsonString(text.slice(valueStart, i))
      }
      i++
    }
  }
  return undefined
}

/**
 * Como `extractJsonStringField` pero encuentra la ÚLTIMA ocurrencia (por
 * offset, no por orden de patrón). Útil para campos que se anexan
 * (customTitle, tag, etc.).
 */
export function extractLastJsonStringField(
  text: string,
  key: string,
): string | undefined {
  const patterns = [`"${key}":"`, `"${key}": "`]
  let lastValue: string | undefined
  let lastIdx = -1
  for (const pattern of patterns) {
    let searchFrom = 0
    while (true) {
      const idx = text.indexOf(pattern, searchFrom)
      if (idx < 0) break

      const valueStart = idx + pattern.length
      let i = valueStart
      while (i < text.length) {
        if (text[i] === '\\') {
          i += 2
          continue
        }
        if (text[i] === '"') {
          if (idx > lastIdx) {
            lastIdx = idx
            lastValue = unescapeJsonString(text.slice(valueStart, i))
          }
          break
        }
        i++
      }
      searchFrom = i + 1
    }
  }
  return lastValue
}

// ---------------------------------------------------------------------------
// Extracción del primer prompt desde un fragmento inicial ("head")
// ---------------------------------------------------------------------------

/**
 * Patrón que empareja mensajes auto-generados o de sistema que se saltan al
 * buscar el primer prompt significativo del usuario. Coincide con cualquier
 * cosa que empiece con una etiqueta XML en minúsculas (contexto de IDE,
 * salida de hook, notificaciones de tarea, mensajes de canal, etc.) o un
 * marcador sintético de interrupción.
 */
const SKIP_FIRST_PROMPT_PATTERN =
  /^(?:\s*<[a-z][\w-]*[\s>]|\[Request interrupted by user[^\]]*\])/

const COMMAND_NAME_RE = /<command-name>(.*?)<\/command-name>/

/**
 * Extrae el primer prompt significativo del usuario de un fragmento inicial
 * (JSONL). Salta mensajes tool_result, isMeta, isCompactSummary, mensajes
 * command-name, y patrones auto-generados. Trunca a 200 caracteres.
 */
export function extractFirstPromptFromHead(head: string): string {
  let start = 0
  let commandFallback = ''
  while (start < head.length) {
    const newlineIdx = head.indexOf('\n', start)
    const line =
      newlineIdx >= 0 ? head.slice(start, newlineIdx) : head.slice(start)
    start = newlineIdx >= 0 ? newlineIdx + 1 : head.length

    if (!line.includes('"type":"user"') && !line.includes('"type": "user"'))
      continue
    if (line.includes('"tool_result"')) continue
    if (line.includes('"isMeta":true') || line.includes('"isMeta": true'))
      continue
    if (
      line.includes('"isCompactSummary":true') ||
      line.includes('"isCompactSummary": true')
    )
      continue

    try {
      const entry = JSON.parse(line) as Record<string, unknown>
      if (entry.type !== 'user') continue

      const message = entry.message as Record<string, unknown> | undefined
      if (!message) continue

      const content = message.content
      const texts: string[] = []
      if (typeof content === 'string') {
        texts.push(content)
      } else if (Array.isArray(content)) {
        for (const block of content as Record<string, unknown>[]) {
          if (block.type === 'text' && typeof block.text === 'string') {
            texts.push(block.text as string)
          }
        }
      }

      for (const raw of texts) {
        let result = raw.replace(/\n/g, ' ').trim()
        if (!result) continue

        // Salta mensajes de slash-command pero recuerda el primero como
        // fallback.
        const cmdMatch = COMMAND_NAME_RE.exec(result)
        if (cmdMatch) {
          if (!commandFallback) commandFallback = cmdMatch[1]!
          continue
        }

        // Formatea la entrada de bash con prefijo ! antes del salto
        // genérico de XML.
        const bashMatch = /<bash-input>([\s\S]*?)<\/bash-input>/.exec(result)
        if (bashMatch) return `! ${bashMatch[1]!.trim()}`

        if (SKIP_FIRST_PROMPT_PATTERN.test(result)) continue

        if (result.length > 200) {
          result = result.slice(0, 200).trim() + '…'
        }
        return result
      }
    } catch {
      // Extracción del primer mensaje best-effort; cae al commandFallback
      // de abajo.
    }
  }
  if (commandFallback) return commandFallback
  return ''
}

// ---------------------------------------------------------------------------
// Sanitización de rutas
// ---------------------------------------------------------------------------

/**
 * Longitud máxima para un componente único de ruta de filesystem (directorio
 * o nombre de archivo). La mayoría de filesystems (ext4, APFS, NTFS) limitan
 * componentes individuales a 255 bytes. Se usa 200 para dejar espacio al
 * sufijo hash y al separador.
 */
export const MAX_SANITIZED_LENGTH = 200

/**
 * DJB2 — ver docstring del módulo. Fórmula estándar de dominio público
 * (Daniel J. Bernstein), no una copia del archivo fuente.
 */
function djb2Hash(str: string): number {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i)
  }
  return hash
}

function simpleHash(str: string): string {
  return Math.abs(djb2Hash(str)).toString(36)
}

/**
 * Hace que una string sea segura para usarse como nombre de directorio o
 * archivo. Reemplaza todos los caracteres no-alfanuméricos por guiones. Esto
 * asegura compatibilidad entre plataformas, incluyendo Windows donde
 * caracteres como los dos puntos están reservados.
 *
 * Para rutas profundamente anidadas que excederían los límites de
 * filesystem (255 bytes), trunca y añade un sufijo hash para unicidad.
 */
export function sanitizePath(name: string): string {
  const sanitized = name.replace(/[^a-zA-Z0-9]/g, '-')
  if (sanitized.length <= MAX_SANITIZED_LENGTH) {
    return sanitized
  }
  const hash =
    typeof Bun !== 'undefined' ? Bun.hash(name).toString(36) : simpleHash(name)
  return `${sanitized.slice(0, MAX_SANITIZED_LENGTH)}-${hash}`
}
