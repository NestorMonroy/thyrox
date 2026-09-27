/**
 * Turnos canónicos de una conversación y su huella — porte de CLIProxyAPI
 * (`sdk/cliproxy/session/lcp.go`, de `ExtractCanonicalTurns` a
 * `FastTurnFingerprint`, leído como referencia).
 *
 * Cada protocolo de entrada (Messages, OpenAI chat, Gemini y Antigravity,
 * Responses y Codex, Interactions) se reduce a turnos `{rol, partes}` con
 * el mismo vocabulario; la huella de un turno es un SHA-256 de sus campos
 * con longitud prefijada. Una parte de más de 16 KiB se representa con una
 * muestra de 12 KiB (cabeza, centro y cola) y el SHA-256 del valor entero.
 * El sistema enmascara fechas ISO 8601 y UUID, y el razonamiento
 * (`<think>`, partes `thinking`/`reasoning`) no entra en la huella.
 *
 * Los valores se guardan como cadenas de bytes —un carácter por byte, el
 * UTF-8 de la referencia—: longitudes, cortes (que pueden partir un
 * carácter), expresiones y orden coinciden así con los de `string` en Go.
 * La prueba diferencial lo comprueba contra el paquete de Go sin tocar.
 *
 * Divergencias declaradas:
 * - Un cuerpo ya decodificado se vuelve a serializar: un número pierde su
 *   forma escrita (`1.50` pasa a `1.5`). Con el texto de la petición no.
 * - `ToLower` de un rol o un tipo sigue a `toLowerCase`, que sólo difiere
 *   de la referencia en U+0130; se corrige ese caso.
 */
import { createHash } from 'node:crypto'
import { goMarshal } from './goJson.ts'
import type { JsonObject } from './payload.ts'
import { parseRaw, rawArray, rawEach, rawGet, type RawNode, rawString } from './rawJson.ts'

const CANONICAL_TURN_VERSION = 'cpa-session-turn-v1'
export const LARGE_PART_THRESHOLD = 16 * 1024
const SPARSE_FINGERPRINT_BYTES = 12 * 1024
export const MAX_CANONICAL_TURNS = 4096
const MAX_CANONICAL_PARTS_PER_TURN = 256

/** Una parte lógica de un turno; `value` y `digest` son cadenas de bytes. */
export type CanonicalPart = {
  kind: string
  mime: string
  value: string
  digest: string
  originalSize: number
  sampled: boolean
}

export type CanonicalTurn = { role: string; parts: CanonicalPart[] }

/** El UTF-8 de un texto como cadena de bytes. */
export const toBytes = (text: string) => Buffer.from(text, 'utf8').toString('latin1')
const bytesOf = (bytes: string) => Buffer.from(bytes, 'latin1')

/** SHA-256 en hexadecimal de una cadena de bytes. */
export const sha256Hex = (bytes: string) => createHash('sha256').update(bytesOf(bytes)).digest('hex')

/** Escribe un campo con su longitud delante, como `writeFingerprintField`. */
export function writeField(hash: ReturnType<typeof createHash>, bytes: string): void {
  hash.update(`${bytes.length}:`)
  hash.update(bytesOf(bytes))
  hash.update('\0')
}

const part = (fields: Partial<CanonicalPart> & { kind: string; value: string }): CanonicalPart => ({
  mime: '', digest: '', originalSize: 0, sampled: false, ...fields,
})

/** `FastTurnFingerprint`: huella determinista y acotada de un turno. */
export function fastTurnFingerprint(turn: CanonicalTurn): string {
  const normalized = normalizeCanonicalTurn(turn)
  const hash = createHash('sha256')
  writeField(hash, CANONICAL_TURN_VERSION)
  writeField(hash, toBytes(normalized.role))
  for (const p of normalized.parts) {
    writeField(hash, toBytes(p.kind))
    writeField(hash, toBytes(p.mime))
    writeField(hash, String(p.originalSize))
    if (normalized.role !== 'system' || !p.sampled) writeField(hash, p.digest)
    let value = p.value
    if (!p.sampled && (p.originalSize > LARGE_PART_THRESHOLD || value.length > LARGE_PART_THRESHOLD)) value = sparseSample(value, SPARSE_FINGERPRINT_BYTES)
    writeField(hash, value)
  }
  return hash.digest('hex')
}

/** `ExtractCanonicalTurns`: los turnos de los cinco protocolos; sin cuerpo válido, ninguno. */
export function extractCanonicalTurns(format: string, payload: string | JsonObject | undefined): CanonicalTurn[] | undefined {
  const text = typeof payload === 'string' ? payload : payload === undefined ? '' : JSON.stringify(payload)
  if (text.length === 0) return undefined
  const root = parseRaw(text)
  if (root === undefined) return undefined
  const resolved = format === '' ? inferCanonicalFormat(root) : format
  const turns: CanonicalTurn[] = []
  const is = (name: string) => formatEqual(resolved, name)
  if (is('claude')) appendMessagesTurns(turns, root, true)
  else if (is('gemini') || is('antigravity')) appendGeminiTurns(turns, root)
  else if (is('interactions')) appendInteractionTurns(turns, root)
  else if (is('openai-response') || is('codex')) appendResponsesTurns(turns, root)
  else appendMessagesTurns(turns, root, false)
  return normalizeCanonicalTurns(turns)
}

const formatEqual = (left: string, right: string) => goTrimSpace(left).toLowerCase() === right

function inferCanonicalFormat(node: RawNode): string {
  let root = node
  const request = rawGet(root, 'request')
  if (request !== undefined && rawGet(root, 'contents') === undefined) root = request
  if (rawGet(root, 'contents')?.kind === 'array' || rawGet(root, 'systemInstruction') !== undefined || rawGet(root, 'system_instruction') !== undefined) return 'gemini'
  if (rawGet(root, 'instructions') !== undefined) return 'openai-response'
  const input = rawGet(root, 'input')
  if (input !== undefined) {
    if (input.kind === 'string') return 'interactions'
    for (const item of rawArray(input)) {
      const type = lower(goTrimSpace(rawString(rawGet(item, 'type'))))
      if (type.includes('user_input') || type.includes('instruction')) return 'interactions'
    }
    return 'openai-response'
  }
  if (rawGet(root, 'system') !== undefined) return 'claude'
  return 'openai'
}

const hasCapacity = (turns: CanonicalTurn[]) => turns.length < MAX_CANONICAL_TURNS

function appendTurn(turns: CanonicalTurn[], role: string, parts: CanonicalPart[]): void {
  if (!hasCapacity(turns) || parts.length === 0) return
  turns.push({ role, parts: limitCanonicalParts([], parts) })
}

function appendMessagesTurns(turns: CanonicalTurn[], root: RawNode, includeTopLevelSystem: boolean): void {
  if (includeTopLevelSystem) {
    const system = rawGet(root, 'system')
    if (system !== undefined) appendTurn(turns, 'system', canonicalPartsFromJson(system))
  }
  for (const message of rawEach(rawGet(root, 'messages'))) {
    if (!hasCapacity(turns)) break
    const role = canonicalRole(rawString(rawGet(message, 'role'))) || 'unknown'
    const content = rawGet(message, 'content')
    let parts = canonicalPartsFromJson(content)
    for (const key of ['tool_calls', 'tool_call', 'function_call', 'tool_use']) {
      const value = rawGet(message, key)
      if (value !== undefined) parts = [...parts, ...canonicalPartsFromJson(value)]
    }
    if (parts.length === 0 && content === undefined) parts = canonicalPartsFromJson(message)
    appendTurn(turns, role, parts)
  }
}

function appendResponsesTurns(turns: CanonicalTurn[], root: RawNode): void {
  const instructions = rawGet(root, 'instructions')
  if (instructions !== undefined) appendTurn(turns, 'system', canonicalPartsFromJson(instructions))
  if (!hasCapacity(turns)) return
  const input = rawGet(root, 'input')
  if (input === undefined) return
  if (input.kind === 'string') {
    appendTurn(turns, 'user', canonicalPartsFromJson(input))
    return
  }
  for (const item of rawEach(input)) {
    if (!hasCapacity(turns)) break
    const type = lower(goTrimSpace(rawString(rawGet(item, 'type'))))
    if (type === 'reasoning' || type === 'response.output_text') continue
    let role = canonicalRole(rawString(rawGet(item, 'role')))
    if (role === '') {
      if (type.includes('function_call_output') || type.includes('tool_result')) role = 'tool'
      else if (type.includes('function_call') || type.includes('tool_call')) role = 'assistant'
      else if (type.includes('compaction')) role = 'system'
      else role = 'unknown'
    }
    const content = rawGet(item, 'content')
    let parts = canonicalPartsFromJson(content)
    if (parts.length === 0 && content === undefined) parts = canonicalPartsFromJson(item)
    appendTurn(turns, role, parts)
  }
}

function appendGeminiTurns(turns: CanonicalTurn[], node: RawNode): void {
  let root = node
  const request = rawGet(root, 'request')
  if (request !== undefined && rawGet(root, 'contents') === undefined) root = request
  const cached = rawGet(root, 'cachedContent') ?? rawGet(root, 'cached_content')
  if (cached !== undefined) appendTurn(turns, 'system', [{ ...canonicalTextPart(cached), kind: 'resource' }])
  const system = rawGet(root, 'systemInstruction') ?? rawGet(root, 'system_instruction')
  if (system !== undefined) appendTurn(turns, 'system', canonicalPartsFromJson(system))
  for (const content of rawEach(rawGet(root, 'contents'))) {
    if (!hasCapacity(turns)) break
    const role = canonicalRole(rawString(rawGet(content, 'role'))) || 'unknown'
    const contentParts = rawGet(content, 'parts')
    let parts = canonicalPartsFromJson(contentParts)
    if (parts.length === 0 && contentParts === undefined) parts = canonicalPartsFromJson(content)
    appendTurn(turns, role, parts)
  }
}

function appendInteractionTurns(turns: CanonicalTurn[], root: RawNode): void {
  const system = rawGet(root, 'system_instruction') ?? rawGet(root, 'systemInstruction')
  if (system !== undefined) appendTurn(turns, 'system', canonicalPartsFromJson(system))
  appendInteractionValue(turns, rawGet(root, 'input'), '')
}

function appendInteractionValue(turns: CanonicalTurn[], value: RawNode | undefined, inheritedRole: string): boolean {
  if (value === undefined) return true
  if (!hasCapacity(turns)) return false
  if (value.kind === 'array') {
    for (const child of value.items) if (!appendInteractionValue(turns, child, inheritedRole)) break
    return hasCapacity(turns)
  }
  if (value.kind !== 'object') {
    appendTurn(turns, defaultInteractionRole(inheritedRole), canonicalPartsFromJson(value))
    return hasCapacity(turns)
  }
  const steps = rawGet(value, 'steps')
  if (steps?.kind === 'array') {
    const role = canonicalRole(rawString(rawGet(value, 'role'))) || inheritedRole
    for (const child of steps.items) if (!appendInteractionValue(turns, child, role)) break
    return hasCapacity(turns)
  }
  const type = lower(goTrimSpace(rawString(rawGet(value, 'type'))))
  let role = canonicalRole(rawString(rawGet(value, 'role')))
  if (role === '') {
    if (type.includes('system') || type.includes('developer')) role = 'system'
    else if (type.includes('user')) role = 'user'
    else if (type.includes('model') || type.includes('assistant')) role = 'assistant'
    else if (type.includes('tool') || type.includes('function')) role = 'tool'
    else role = defaultInteractionRole(inheritedRole)
  }
  const content = rawGet(value, 'content')
  let parts = canonicalPartsFromJson(content)
  if (parts.length === 0 && content === undefined) parts = canonicalPartsFromJson(value)
  appendTurn(turns, role, parts)
  return hasCapacity(turns)
}

const defaultInteractionRole = (inheritedRole: string) => canonicalRole(inheritedRole) || 'user'

function canonicalPartsFromJson(value: RawNode | undefined): CanonicalPart[] {
  if (value === undefined) return []
  if (value.kind === 'string') return [canonicalTextPart(value)]
  if (value.kind === 'number' || value.kind === 'true' || value.kind === 'false') {
    const raw = toBytes(value.raw)
    return [part({ kind: 'value', value: raw, originalSize: raw.length })]
  }
  if (value.kind === 'null') return [canonicalJsonPart('value', value)]
  if (isReasoningJsonPart(value)) return []
  if (value.kind === 'array') {
    let parts: CanonicalPart[] = []
    let dropped = 0
    for (const child of value.items) {
      if (parts.length >= MAX_CANONICAL_PARTS_PER_TURN) {
        dropped++
        continue
      }
      parts = limitCanonicalParts(parts, canonicalPartsFromJson(child))
    }
    return dropped > 0 ? limitCanonicalPartsCount(parts, dropped) : parts
  }
  const text = rawGet(value, 'text')
  if (text?.kind === 'string') return [canonicalTextPart(text)]
  const content = rawGet(value, 'content')
  if (content !== undefined) return canonicalPartsFromJson(content)
  const parts = rawGet(value, 'parts')
  if (parts !== undefined) return canonicalPartsFromJson(parts)
  const type = lower(goTrimSpace(rawString(rawGet(value, 'type'))))
  if ((type === 'input_text' || type === 'output_text' || type === 'text') && text !== undefined) return [canonicalTextPart(text)]
  if (isToolPartType(type)) return [canonicalJsonPart(`tool:${type}`, value)]
  const geminiKind = geminiToolPartKind(value)
  if (geminiKind) return [canonicalJsonPart(geminiKind, value)]
  if (['image_url', 'inlineData', 'inline_data', 'fileData', 'file_data', 'source'].some(key => rawGet(value, key) !== undefined)) {
    return [canonicalJsonPart('media', value)]
  }
  return [canonicalJsonPart('json', value)]
}

function canonicalTextPart(value: RawNode): CanonicalPart {
  const text = normalizeText(toBytes(rawString(value)), false)
  if (text.length > LARGE_PART_THRESHOLD) {
    return part({ kind: 'text', value: sparseSample(text, SPARSE_FINGERPRINT_BYTES), digest: sha256Hex(text), originalSize: text.length, sampled: true })
  }
  return part({ kind: 'text', value: text, originalSize: text.length })
}

function canonicalJsonPart(kind: string, value: RawNode): CanonicalPart {
  let raw = toBytes(value.raw)
  if (raw.length > LARGE_PART_THRESHOLD) {
    return part({ kind, value: sparseSample(raw, SPARSE_FINGERPRINT_BYTES), digest: sha256Hex(raw), originalSize: raw.length, sampled: true })
  }
  // `json.Unmarshal` + `json.Marshal`; un número fuera de rango hace fallar el primero y el crudo se queda.
  const decoded: unknown = JSON.parse(value.raw)
  if (allFinite(decoded)) raw = toBytes(goMarshal(decoded))
  return part({ kind, value: raw, originalSize: raw.length })
}

function allFinite(value: unknown): boolean {
  if (typeof value === 'number') return Number.isFinite(value)
  if (Array.isArray(value)) return value.every(allFinite)
  if (value !== null && typeof value === 'object') return Object.values(value).every(allFinite)
  return true
}

const TRUNCATED_PREFIX = '<truncated:'
const isTruncationMarker = (p: CanonicalPart | undefined) => p !== undefined && p.kind === 'value' && p.value.startsWith(TRUNCATED_PREFIX)

/** `limitCanonicalParts`: un turno no pasa de 256 partes; las que sobran se cuentan en una marca. */
function limitCanonicalParts(parts: CanonicalPart[], added: CanonicalPart[]): CanonicalPart[] {
  if (added.length === 0) return parts
  let existingDropped = 0
  let hasAddedMarker = false
  if (isTruncationMarker(added[added.length - 1])) {
    hasAddedMarker = true
    existingDropped = added[added.length - 1]!.originalSize
    added = added.slice(0, -1)
  }
  const space = MAX_CANONICAL_PARTS_PER_TURN - parts.length
  if (space <= 0) return limitCanonicalPartsCount(parts, added.length + existingDropped)
  if (added.length > space) return limitCanonicalPartsCount([...parts, ...added.slice(0, space)], added.length - space + existingDropped)
  const joined = [...parts, ...added]
  return hasAddedMarker || existingDropped > 0 ? limitCanonicalPartsCount(joined, existingDropped) : joined
}

function limitCanonicalPartsCount(parts: CanonicalPart[], dropped: number): CanonicalPart[] {
  if (dropped <= 0) return parts
  const last = parts[parts.length - 1]
  if (isTruncationMarker(last)) {
    const size = last!.originalSize + dropped
    return [...parts.slice(0, -1), { ...last!, originalSize: size, value: `${TRUNCATED_PREFIX}${size} parts>` }]
  }
  return [...parts, part({ kind: 'value', value: `${TRUNCATED_PREFIX}${dropped} parts>`, originalSize: dropped })]
}

function isReasoningJsonPart(value: RawNode): boolean {
  if (value.kind !== 'object') return false
  const type = lower(goTrimSpace(rawString(rawGet(value, 'type'))))
  if (type === 'thinking' || type === 'reasoning' || type === 'thought' || type.includes('reasoning')) return true
  return rawGet(value, 'thought')?.kind === 'true'
}

const isToolPartType = (type: string) => type.includes('tool') || type.includes('function_call') || type === 'function'

function geminiToolPartKind(value: RawNode): string {
  if (rawGet(value, 'functionCall') !== undefined || rawGet(value, 'function_call') !== undefined) return 'tool:function_call'
  if (rawGet(value, 'functionResponse') !== undefined || rawGet(value, 'function_response') !== undefined) return 'tool:function_response'
  return ''
}

/** `canonicalRole`: el vocabulario común de roles. */
export function canonicalRole(role: string): string {
  const normalized = lower(goTrimSpace(role))
  if (normalized === 'system' || normalized === 'developer') return 'system'
  if (normalized === 'assistant' || normalized === 'model' || normalized === 'ai') return 'assistant'
  if (normalized === 'tool' || normalized === 'function') return 'tool'
  return normalized
}

function normalizeCanonicalTurns(turns: CanonicalTurn[]): CanonicalTurn[] | undefined {
  if (turns.length === 0) return undefined
  const normalized: CanonicalTurn[] = []
  for (const turn of turns) {
    const next = normalizeCanonicalTurn(turn)
    if (next.role === '' || next.parts.length === 0) continue
    normalized.push(next)
    if (normalized.length >= MAX_CANONICAL_TURNS) break
  }
  return normalized
}

function normalizeCanonicalTurn(turn: CanonicalTurn): CanonicalTurn {
  const role = canonicalRole(turn.role)
  const kept: CanonicalPart[] = []
  for (const original of turn.parts) {
    if (original.value === '') continue
    const p = { ...original, kind: lower(goTrimSpace(original.kind)), mime: lower(goTrimSpace(original.mime)) }
    if (p.originalSize <= 0) p.originalSize = p.value.length
    if (p.kind === 'text') {
      if (role === 'system') p.value = normalizeText(p.value, true)
      else if (!p.sampled) p.value = normalizeText(p.value, false)
      if (!p.sampled) p.originalSize = p.value.length
    }
    if (p.value !== '') kept.push(p)
  }
  const parts = limitCanonicalParts([], kept)
  const toolIndexes = parts.flatMap((p, index) => (p.kind.startsWith('tool:') || p.kind.includes('function_call') ? [index] : []))
  if (toolIndexes.length > 1) {
    const sorted = toolIndexes.map(index => parts[index]!).sort((a, b) => compareBytes(a.value, b.value) || compareBytes(a.digest, b.digest))
    toolIndexes.forEach((partIndex, index) => {
      parts[partIndex] = sorted[index]!
    })
  }
  return { role, parts }
}

const compareBytes = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

// `\s` de Go es [\t\n\f\r ]; `(?i)k` también casa U+212A (KELVIN SIGN), aquí en sus bytes UTF-8.
const K = '(?:[kK]|\u00e2\u0084\u00aa)'
const THINK_TAG = `(?:[tT][hH][iI][nN]${K}|[tT][hH][iI][nN]${K}[iI][nN][gG])`
const THINK_PATTERN = new RegExp(`[\\t\\n\\f\\r ]*<${THINK_TAG}>[\\s\\S]*?</${THINK_TAG}>[\\t\\n\\f\\r ]*`, 'g')
const ISO8601_PATTERN = /\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?\b/g
const UUID_PATTERN = /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\b/g

/** `normalizeText` sobre una cadena de bytes. */
function normalizeText(value: string, maskSystemDynamics: boolean): string {
  let text = value.replaceAll('\r\n', '\n').replaceAll('\r', '\n').replace(THINK_PATTERN, ' ')
  if (maskSystemDynamics) text = text.replace(ISO8601_PATTERN, '<timestamp>').replace(UUID_PATTERN, '<uuid>')
  return goTrimSpaceBytes(text)
}

/** `sparseSample`: cabeza, centro y cola, en bytes. */
export function sparseSample(value: string, limit: number): string {
  if (limit <= 0 || value.length <= limit) return value
  const head = Math.floor(limit / 3)
  const middle = Math.floor(limit / 3)
  const tail = limit - head - middle
  const middleStart = Math.floor((value.length - middle) / 2)
  return value.slice(0, head) + value.slice(middleStart, middleStart + middle) + value.slice(value.length - tail)
}

// `unicode.IsSpace`: los ASCII de `\s`, `\v`, U+0085, U+00A0 y los White_Space de la categoría Z.
const GO_SPACE = '\\t\\n\\v\\f\\r \\u0085\\u00a0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000'
const GO_TRIM = new RegExp(`^[${GO_SPACE}]+|[${GO_SPACE}]+$`, 'g')

/** `strings.TrimSpace` sobre texto. */
export const goTrimSpace = (text: string) => text.replace(GO_TRIM, '')

const SPACE_SEQUENCES = ['\t', '\n', '\v', '\f', '\r', ' ', '\u0085', '\u00a0', '\u1680', '\u2000', '\u2001', '\u2002', '\u2003', '\u2004', '\u2005', '\u2006', '\u2007', '\u2008', '\u2009', '\u200a', '\u2028', '\u2029', '\u202f', '\u205f', '\u3000']
  .map(toBytes)

/** `strings.TrimSpace` sobre una cadena de bytes: sólo quita secuencias UTF-8 válidas de espacio. */
function goTrimSpaceBytes(bytes: string): string {
  let start = 0
  let end = bytes.length
  for (let found = true; found && start < end;) {
    found = false
    for (const space of SPACE_SEQUENCES) {
      if (bytes.startsWith(space, start) && start + space.length <= end) {
        start += space.length
        found = true
        break
      }
    }
  }
  for (let found = true; found && end > start;) {
    found = false
    for (const space of SPACE_SEQUENCES) {
      if (end - space.length >= start && bytes.slice(end - space.length, end) === space) {
        end -= space.length
        found = true
        break
      }
    }
  }
  return bytes.slice(start, end)
}

/** `strings.ToLower`: `toLowerCase` salvo U+0130, que Go baja a `i` sin punto combinante. */
const lower = (text: string) => text.replaceAll('\u0130', 'i').toLowerCase()

/**
 * Una cadena de bytes como la escribe `encoding/json`: un byte que no forma
 * UTF-8 válido sale como U+FFFD, uno por byte.
 */
export function goJsonString(bytes: string): string {
  const buffer = bytesOf(bytes)
  let out = ''
  let index = 0
  while (index < buffer.length) {
    const width = utf8Width(buffer, index)
    out += width === 0 ? '\ufffd' : buffer.subarray(index, index + width).toString('utf8')
    index += width === 0 ? 1 : width
  }
  return out
}

/** El ancho de la secuencia UTF-8 válida en `index`, o 0 si no lo es (`utf8.DecodeRune`). */
function utf8Width(buffer: Buffer, index: number): number {
  const first = buffer[index]!
  if (first < 0x80) return 1
  const continuation = (offset: number, low = 0x80, high = 0xbf) => {
    const value = buffer[index + offset]
    return value !== undefined && value >= low && value <= high
  }
  if (first >= 0xc2 && first <= 0xdf) return continuation(1) ? 2 : 0
  if (first >= 0xe0 && first <= 0xef) {
    const low = first === 0xe0 ? 0xa0 : 0x80
    const high = first === 0xed ? 0x9f : 0xbf
    return continuation(1, low, high) && continuation(2) ? 3 : 0
  }
  if (first >= 0xf0 && first <= 0xf4) {
    const low = first === 0xf0 ? 0x90 : 0x80
    const high = first === 0xf4 ? 0x8f : 0xbf
    return continuation(1, low, high) && continuation(2) && continuation(3) ? 4 : 0
  }
  return 0
}

/** `EnvironmentDigest`: SHA-256 de las huellas de todos los turnos de sistema, o vacío sin sistema. */
export function environmentDigest(turns: CanonicalTurn[]): string {
  const hash = createHash('sha256')
  let hasSystem = false
  for (const turn of turns) {
    if (canonicalRole(turn.role) !== 'system') continue
    hasSystem = true
    writeField(hash, fastTurnFingerprint(turn))
  }
  return hasSystem ? hash.digest('hex') : ''
}

/** `minimumAffinityPrefixLength`: hasta el primer turno que no es de sistema, incluido. */
export function minimumAffinityPrefixLength(turns: CanonicalTurn[]): number {
  const index = turns.findIndex(turn => canonicalRole(turn.role) !== 'system')
  return index === -1 ? 0 : index + 1
}
