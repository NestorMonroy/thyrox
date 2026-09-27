/**
 * Identidad de sesión del proxy local — porte de CLIProxyAPI
 * (`sdk/cliproxy/session/identity.go`, leído como referencia):
 * normalización de ids explícitos, proyección a UUID canónico, lectura del
 * `metadata.user_id` que manda un cliente de la API de Messages, y la
 * identidad derivada del contenido (`deriveId`) para las peticiones que no
 * traen ninguna.
 *
 * Los hashes usan la serialización de Go (`./goJson.ts`) para coincidir con
 * los de la referencia sobre la misma entrada.
 */
import { createHash } from 'node:crypto'
import { goMarshal, goStruct } from './goJson.ts'
import { getPath, isObject, type JsonObject, parsePayload, textAt } from './payload.ts'

const IDENTITY_VERSION = 'cpa-session-root-v1'
const IDENTITY_PREFIX = 'ctx:v1:'
const INSTRUCTION_RUNE_LIMIT = 50
const LEGACY_METADATA_SESSION_PATTERN = /_session_([a-f0-9-]+)$/

export const CANONICAL_UUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

/** Los prefijos de sesión que reconocen la búsqueda de afinidad y el enrutamiento. */
export const CANDIDATE_SESSION_PREFIXES = [
  'lcp:v1:', 'lcp:', 'codex:', 'claude:', 'header:', 'session:', 'affinity:', 'slot:', 'task:', 'conv:',
  'thread:', 'clientreq:', 'geminicache:', 'pck:', 'user:', 'execution:', 'agy:', 'derived:',
] as const

const KNOWN_SESSION_PREFIXES = [
  'lcp:v1:', 'lcp:', 'ctx:v1:', 'ctx:', 'codex:', 'claude:', 'header:', 'session:', 'affinity:', 'slot:', 'task:',
  'conv:', 'thread:', 'clientreq:', 'geminicache:', 'pck:', 'user:', 'execution:', 'agy:', 'derived:',
]

/** Formatos de origen de una petición (`sdktranslator.Format`). */
export type SourceFormat = 'openai' | 'openai-response' | 'claude' | 'gemini' | 'codex' | 'antigravity' | 'interactions' | string

type CanonicalPart = { kind: string; mime?: string; value: string }

const sha256 = (text: string) => createHash('sha256').update(text, 'utf8').digest()

/** `NormalizeToCanonicalUUID`. */
export function normalizeToCanonicalUuid(rawId: string): string {
  let clean = rawId.trim()
  if (clean === '') return ''
  if (CANONICAL_UUID_PATTERN.test(clean)) return clean.toLowerCase()
  for (let stripped = true; stripped; ) {
    stripped = false
    for (const prefix of KNOWN_SESSION_PREFIXES) {
      if (clean.startsWith(prefix)) {
        clean = clean.slice(prefix.length).trim()
        stripped = true
        break
      }
    }
  }
  if (clean === '') return ''
  if (CANONICAL_UUID_PATTERN.test(clean)) return clean.toLowerCase()
  const colon = clean.indexOf(':')
  if (colon > 0) {
    const candidate = clean.slice(colon + 1).trim()
    if (CANONICAL_UUID_PATTERN.test(candidate)) return candidate.toLowerCase()
  }
  const u = sha256(`cpa:canonical-uuid:v1\x00${clean}`).subarray(0, 16)
  u[6] = (u[6]! & 0x0f) | 0x80
  u[8] = (u[8]! & 0x3f) | 0x80
  const hex = u.toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

/** `NormalizeExplicitID`: rechaza control, vacío y más de 256 bytes. */
export function normalizeExplicitId(raw: string): string {
  if (/\p{Cc}/u.test(raw)) return ''
  const trimmed = raw.trim()
  if (trimmed === '' || Buffer.byteLength(trimmed, 'utf8') > 256) return ''
  return trimmed
}

export type MetadataIdentities = { sessionId: string; parentSessionId: string; agentId: string }

/** Identidades del metadata de Messages: sesión, sesión padre y agente del `metadata.user_id`. */
export function metadataIdentities(payload: string | JsonObject | undefined): MetadataIdentities {
  const none = { sessionId: '', parentSessionId: '', agentId: '' }
  const root = parsePayload(payload)
  if (root === undefined) return none
  let userId = textAt(root, 'metadata.user_id').trim()
  if (userId === '') {
    const request = getPath(root, 'request')
    if (request !== undefined && getPath(root, 'contents') === undefined) userId = textAt(request, 'metadata.user_id').trim()
  }
  if (userId === '') return none
  if (userId.startsWith('{')) {
    const parsed = parsePayload(userId)
    const first = (...keys: string[]) => {
      for (const key of keys) {
        const value = normalizeExplicitId(textAt(parsed, key))
        if (value) return value
      }
      return ''
    }
    return {
      sessionId: first('session_id'),
      parentSessionId: first('parent_session_id', 'parent_agent_id', 'parent_id'),
      agentId: first('agent_id', 'subagent_id'),
    }
  }
  const match = LEGACY_METADATA_SESSION_PATTERN.exec(userId)
  if (match) {
    const first = (...paths: string[]) => {
      for (const path of paths) {
        const value = normalizeExplicitId(textAt(root, path))
        if (value) return value
      }
      return ''
    }
    return {
      sessionId: normalizeExplicitId(match[1]!),
      parentSessionId: first('metadata.parent_agent_id', 'metadata.parent_session_id', 'metadata.parent_id'),
      agentId: first('metadata.agent_id', 'metadata.subagent_id'),
    }
  }
  return none
}

/** `CallerScope`: un espacio de nombres irreversible para la credencial del llamador. */
export function callerScope(value: string): string {
  const trimmed = value.trim()
  if (trimmed === '') return ''
  return sha256(`cli-proxy-api:caller-scope:v1\x00${trimmed}`).toString('hex')
}

/** `DeriveID`: identidad estable desde las instrucciones iniciales y el primer usuario completo. */
export function deriveId(format: SourceFormat, payload: string | JsonObject | undefined, scope: string): string {
  const body = parsePayload(payload)
  if (!isObject(body)) return ''
  const is = (...formats: SourceFormat[]) => formats.some(f => f.toLowerCase() === format.trim().toLowerCase())
  let resource = ''
  if (is('gemini', 'antigravity')) {
    const request = isObject(body.request) ? body.request : body
    resource = stringField(request, 'cachedContent', 'cached_content')
  }
  let root: [string[], CanonicalPart[]]
  if (is('gemini', 'antigravity')) root = geminiRoot(body)
  else if (is('interactions')) root = interactionsRoot(body)
  else if (is('openai-response', 'codex')) root = responsesRoot(body)
  else if (is('claude')) root = messagesRoot(body, true)
  else root = messagesRoot(body, false)
  const [instructions, user] = root
  if (user.length === 0) return ''
  const encoded = goMarshal(
    goStruct([
      { name: 'version', value: IDENTITY_VERSION },
      { name: 'format', value: format },
      { name: 'caller_scope', value: scope.trim() },
      { name: 'instructions', value: instructions, omitEmpty: true },
      {
        name: 'user',
        value: user.map(part =>
          goStruct([
            { name: 'kind', value: part.kind },
            { name: 'mime', value: part.mime ?? '', omitEmpty: true },
            { name: 'value', value: part.value },
          ]),
        ),
        omitEmpty: true,
      },
      { name: 'resource', value: resource, omitEmpty: true },
    ]),
  )
  return IDENTITY_PREFIX + sha256(encoded).toString('hex')
}

function messagesRoot(body: JsonObject, includeTopLevelSystem: boolean): [string[], CanonicalPart[]] {
  let instructions: string[] = []
  if (includeTopLevelSystem && 'system' in body) instructions = appendInstruction(instructions, body.system)
  const messages = Array.isArray(body.messages) ? body.messages : []
  for (const message of messages) {
    if (!isObject(message)) continue
    const role = normalizedString(message.role)
    if (role === 'system' || role === 'developer') instructions = appendInstruction(instructions, message.content)
    else if (role === 'user') {
      const parts = canonicalParts(message.content)
      if (parts.length > 0) return [instructions, parts]
    }
  }
  return [instructions, []]
}

function responsesRoot(body: JsonObject): [string[], CanonicalPart[]] {
  let instructions: string[] = []
  if ('instructions' in body) instructions = appendInstruction(instructions, body.instructions)
  if (!('input' in body)) return [instructions, []]
  const input = body.input
  if (typeof input === 'string') return [instructions, canonicalParts(input)]
  for (const item of Array.isArray(input) ? input : []) {
    if (!isObject(item)) continue
    const role = normalizedString(item.role)
    if (role === 'system' || role === 'developer') instructions = appendInstruction(instructions, item.content)
    else if (role === 'user') {
      const parts = canonicalParts(item.content)
      if (parts.length > 0) return [instructions, parts]
    }
  }
  return [instructions, []]
}

function geminiRoot(original: JsonObject): [string[], CanonicalPart[]] {
  const body = isObject(original.request) ? original.request : original
  let instructions: string[] = []
  const system = firstField(body, 'systemInstruction', 'system_instruction')
  if (system.found) instructions = appendInstruction(instructions, contentValue(system.value))
  for (const content of Array.isArray(body.contents) ? body.contents : []) {
    if (!isObject(content) || normalizedString(content.role) !== 'user') continue
    const parts = canonicalParts(contentValue(content))
    if (parts.length > 0) return [instructions, parts]
  }
  return [instructions, []]
}

function interactionsRoot(body: JsonObject): [string[], CanonicalPart[]] {
  let instructions: string[] = []
  const system = firstField(body, 'system_instruction', 'systemInstruction')
  if (system.found) instructions = appendInstruction(instructions, contentValue(system.value))
  if (!('input' in body)) return [instructions, []]
  const input = body.input
  if (typeof input === 'string') return [instructions, canonicalParts(input)]
  for (const entry of flattenInteractionEntries(input)) {
    if (typeof entry === 'string') return [instructions, canonicalParts(entry)]
    if (!isObject(entry)) continue
    const role = normalizedString(entry.role)
    const type = normalizedString(entry.type)
    if (role === 'system' || role === 'developer' || type === 'system_instruction' || type === 'developer_instruction') {
      instructions = appendInstruction(instructions, contentValue(entry))
      continue
    }
    if (role === 'user' || type === 'user_input' || ((type === 'message' || type === '') && role === '')) {
      return [instructions, canonicalParts(contentValue(entry))]
    }
  }
  return [instructions, []]
}

function flattenInteractionEntries(value: unknown): unknown[] {
  const entries: unknown[] = []
  const visit = (current: unknown, inheritedRole: string): void => {
    if (Array.isArray(current)) {
      for (const child of current) visit(child, inheritedRole)
      return
    }
    if (isObject(current)) {
      const role = normalizedString(current.role) || inheritedRole
      if (Array.isArray(current.steps)) {
        for (const child of current.steps) visit(child, role)
        return
      }
      entries.push(role !== '' && normalizedString(current.role) === '' ? { ...current, role } : current)
      return
    }
    entries.push(current)
  }
  visit(value, '')
  return entries
}

function appendInstruction(instructions: string[], value: unknown): string[] {
  const text = canonicalParts(value)
    .filter(part => part.kind === 'text' && part.value !== '')
    .map(part => part.value)
    .join('\n')
  return text === '' ? instructions : [...instructions, truncateRunes(text, INSTRUCTION_RUNE_LIMIT)]
}

function canonicalParts(value: unknown): CanonicalPart[] {
  const parts: CanonicalPart[] = []
  appendCanonicalParts(parts, value)
  return parts
}

function appendCanonicalParts(parts: CanonicalPart[], value: unknown): void {
  if (value === null || value === undefined) return
  if (typeof value === 'string') {
    if (value !== '') parts.push({ kind: 'text', value })
    return
  }
  if (Array.isArray(value)) {
    for (const child of value) appendCanonicalParts(parts, child)
    return
  }
  if (isObject(value)) {
    if (typeof value.text === 'string') return appendCanonicalParts(parts, value.text)
    if ('content' in value) return appendCanonicalParts(parts, value.content)
    if ('parts' in value) return appendCanonicalParts(parts, value.parts)
    if ('image_url' in value) return appendMediaPart(parts, 'image', value.image_url, '')
    const inline = firstField(value, 'inlineData', 'inline_data')
    if (inline.found) return appendMediaPart(parts, 'inline_data', inline.value, '')
    const file = firstField(value, 'fileData', 'file_data')
    if (file.found) return appendMediaPart(parts, 'file', file.value, '')
    if ('source' in value) return appendMediaPart(parts, normalizedString(value.type), value.source, normalizedString(value.media_type))
    parts.push({ kind: 'json', value: goMarshal(normalizeJsonValue(value)) })
    return
  }
  parts.push({ kind: 'json', value: goMarshal(value) })
}

function appendMediaPart(parts: CanonicalPart[], rawKind: string, value: unknown, fallbackMime: string): void {
  const kind = rawKind.trim() || 'media'
  if (typeof value === 'string') {
    if (value !== '') parts.push({ kind, mime: fallbackMime, value })
    return
  }
  if (isObject(value)) {
    const mime = stringField(value, 'mimeType', 'mime_type', 'media_type') || fallbackMime
    const media = stringField(value, 'url', 'uri', 'fileUri', 'file_uri', 'data')
    if (media !== '') parts.push({ kind, mime, value: media })
    return
  }
  appendCanonicalParts(parts, value)
}

function contentValue(value: unknown): unknown {
  if (!isObject(value)) return value
  if ('content' in value) return value.content
  if ('parts' in value) return value.parts
  if ('text' in value) return value.text
  return value
}

function normalizeJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeJsonValue)
  if (isObject(value)) {
    const normalized: JsonObject = {}
    for (const [key, child] of Object.entries(value)) {
      if (key.trim().toLowerCase() === 'cache_control') continue
      normalized[key] = normalizeJsonValue(child)
    }
    return normalized
  }
  return value
}

function firstField(object: JsonObject, ...keys: string[]): { found: boolean; value?: unknown } {
  for (const key of keys) if (key in object) return { found: true, value: object[key] }
  return { found: false }
}

function stringField(object: JsonObject, ...keys: string[]): string {
  const field = firstField(object, ...keys)
  return field.found && typeof field.value === 'string' ? field.value.trim() : ''
}

function normalizedString(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function truncateRunes(value: string, limit: number): string {
  if (limit <= 0) return ''
  const runes = [...value]
  return runes.length <= limit ? value : runes.slice(0, limit).join('')
}
