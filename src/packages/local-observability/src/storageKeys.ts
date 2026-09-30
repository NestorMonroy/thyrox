/**
 * Las claves con que se nombra cada objeto del storage de sesión, su forma
 * canónica para compararlas, y las reglas que un segmento de ruta cumple.
 *
 * Porte completo de `chunk-qbkceaaj.js` de 2.1.283: `Re`, `K`, `mhn`, `SUo`,
 * `bUo`, `wUo`, `vUo`, `jn`, `sR`, `qBt`, `_Uo`, `KBt`, `cK` y `YBt`.
 */

/** `l`. */
const NUL = String.fromCharCode(0)
/** `p`: el nombre que la escritura atómica usa para apartar el original. */
const ASIDE_NAME = /^\.[0-9a-f]{16}\.aside$/
/** `g`: los temporales de escritura atómica y de purga. */
const TEMP_ARTIFACT_NAME = /(^\.[0-9a-f]{16}\.tmp~?$)|(\.tmp[.~][0-9a-f]{8}$)|(\.purge\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.tmp$)/
/** `d`. */
export const NAME_VARIANT_CACHE_LIMIT = 32768
/** `YBt`. */
export const TEAM_SEGMENT = 'team'

/** `s`. */
const nameVariantCache = new Map<string, readonly string[]>()

/** `i`: sin los puntos y espacios del final, que el sistema de archivos ignora. */
function trimTrailingDotsAndSpaces(name: string): string {
  let end = name.length
  while (end > 0) {
    const code = name.charCodeAt(end - 1)
    if (code !== 46 && code !== 32) break
    end -= 1
  }
  return end === name.length ? name : name.slice(0, end)
}

/** `m`: el nombre en minúsculas y, si lleva `:`, también lo que va antes (un flujo alterno). */
function computeNameVariants(name: string): string[] {
  const lower = name.toLowerCase()
  const colon = lower.indexOf(':')
  return colon === -1 ? [trimTrailingDotsAndSpaces(lower)] : [trimTrailingDotsAndSpaces(lower), trimTrailingDotsAndSpaces(lower.slice(0, colon))]
}

/** `cK`: las formas con que un sistema de archivos permisivo leería el nombre. */
export function nameVariants(name: string): readonly string[] {
  const cached = nameVariantCache.get(name)
  if (cached !== undefined) return cached
  const variants = Object.freeze(computeNameVariants(name))
  if (nameVariantCache.size >= NAME_VARIANT_CACHE_LIMIT) nameVariantCache.clear()
  nameVariantCache.set(name, variants)
  return variants
}

/** El tamaño de la caché de `cK`, para comprobar su tope. */
export function nameVariantCacheSize(): number {
  return nameVariantCache.size
}

/** `qBt`: un nombre de apartado de la escritura atómica. */
export function isAsideName(name: string): boolean {
  if (name.charCodeAt(0) !== 46) return false
  return nameVariants(name).some(variant => ASIDE_NAME.test(variant))
}

/** `_Uo`: un temporal que dejó una escritura o una purga. */
export function isTempArtifactName(name: string): boolean {
  return nameVariants(name).some(variant => TEMP_ARTIFACT_NAME.test(variant))
}

/** `u`: sólo puntos y espacios. */
function isDotsOrSpacesOnly(name: unknown): boolean {
  return typeof name === 'string' && /^[. ]+$/.test(name)
}

/** `jn`: un segmento de ruta válido: no vacío, sin separadores ni NUL, y no reservado. */
export function isValidPathSegment(segment: unknown): segment is string {
  return !(
    typeof segment !== 'string' ||
    segment.length === 0 ||
    isDotsOrSpacesOnly(segment) ||
    segment.includes('/') ||
    segment.includes('\\') ||
    segment.includes(NUL) ||
    isAsideName(segment)
  )
}

/** `sR`. */
export function isValidPathSegments(segments: readonly unknown[]): boolean {
  return segments.length > 0 && segments.every(isValidPathSegment)
}

/** `KBt`. */
export function isJsonlName(name: string): boolean {
  return nameVariants(name).some(variant => variant.endsWith('.jsonl'))
}

/** `r`: añade el campo sólo si tiene valor. */
function withOptional<T extends object, K extends string, V>(base: T, field: K, value: V | undefined): T & Partial<Record<K, V>> {
  return value === undefined ? base : { ...base, [field]: value }
}

export type SessionLogDate = { year: string | number; month: string | number; day: string | number }
export type LogKeyOptions = { agentId?: string; runId?: string }

/** `f`. */
function transcriptKey(projectKey: string, sessionId: string, agentId?: string, agentRelPath?: readonly string[]) {
  const base = withOptional({ namespace: 'transcript' as const, projectKey, sessionId }, 'agentId', agentId)
  return withOptional(base, 'agentRelPath', agentRelPath)
}

/** `h`. */
function logKey(sessionId: string, channel: string, options?: LogKeyOptions) {
  const base = withOptional({ namespace: 'log' as const, sessionId, channel }, 'agentId', options?.agentId)
  return withOptional(base, 'runId', options?.runId)
}

/** `Re`: una clave por clase de objeto del storage. */
export const storageKeys = {
  transcript: transcriptKey,
  journal: (projectKey: string, sessionId: string, agentRelPath: readonly string[]) => ({ namespace: 'transcript' as const, projectKey, sessionId, agentRelPath, journal: true as const }),
  sessionJournal: (projectKey: string, sessionId: string, sessionJournal: string) => ({ namespace: 'transcript' as const, projectKey, sessionId, sessionJournal }),
  history: () => ({ namespace: 'history' as const }),
  log: logKey,
  globalConfig: () => ({ namespace: 'globalConfig' as const }),
  globalConfigCopy: (kind: string, stamp: string) => ({ namespace: 'globalConfig' as const, kind, stamp }),
  userSettings: () => ({ namespace: 'settings' as const, layer: 'user' as const }),
  projectSettings: (projectKey: string) => ({ namespace: 'settings' as const, layer: 'project' as const, projectKey }),
  localSettings: (consentRootKey: string) => ({ namespace: 'settings' as const, layer: 'local' as const, consentRootKey }),
  task: (listId: string, taskId: string) => ({ namespace: 'task' as const, listId, taskId }),
  taskListMeta: (listId: string) => ({ namespace: 'task' as const, listId, meta: true as const }),
  taskListHighWaterMark: (listId: string) => ({ namespace: 'task' as const, listId, highWaterMark: true as const }),
  memory: (projectKey: string, relPath: readonly string[]) => ({ namespace: 'memory' as const, projectKey, relPath }),
  pluginRegistry: (file: string) => ({ namespace: 'pluginRegistry' as const, file }),
  marketplaceCache: (marketplace: string, form: string) => ({ namespace: 'marketplaceCache' as const, marketplace, form }),
  marketplaceTree: (marketplace: string, relPath: readonly string[]) => ({ namespace: 'marketplaceCache' as const, marketplace, relPath }),
  pluginCache: (marketplace: string, plugin: string, version: string, relPath: readonly string[]) => ({ namespace: 'pluginCache' as const, marketplace, plugin, version, relPath }),
  cache: (store: string, id: string) => ({ namespace: 'cache' as const, store, id }),
  paste: (id: string) => ({ namespace: 'paste' as const, id }),
  state: (id: string) => ({ namespace: 'state' as const, id }),
  pluginAssetCache: (digest: string) => ({ namespace: 'pluginAssetCache' as const, digest }),
  plan: (name: string) => ({ namespace: 'plan' as const, name }),
  daemon: (relPath: readonly string[]) => ({ namespace: 'daemon' as const, relPath }),
  feedbackDraft: (draftId: string) => ({ namespace: 'feedbackDraft' as const, draftId }),
  agentMemory: (agentType: string, relPath: readonly string[]) => ({ namespace: 'agentMemory' as const, layer: 'user' as const, agentType, relPath }),
  identity: () => ({ namespace: 'identity' as const }),
  team: (team: string) => ({ namespace: 'team' as const, team }),
  sidecar: (projectKey: string, sessionId: string, relPath: readonly string[]) => ({ namespace: 'sidecar' as const, projectKey, sessionId, relPath }),
  mailbox: (team: string, teammate: string) => ({ namespace: 'mailbox' as const, team, teammate }),
  scratch: (sessionId: string, relPath: readonly string[]) => ({ namespace: 'scratch' as const, sessionId, relPath }),
  userConfigDir: (dir: string, relPath: readonly string[]) => ({ namespace: 'userConfigDir' as const, dir, relPath }),
  fileHistory: (sessionId: string, backupFileName: string) => ({ namespace: 'fileHistory' as const, sessionId, backupFileName }),
  job: (jobId: string, relPath: readonly string[]) => ({ namespace: 'job' as const, jobId, relPath }),
  jobTimeline: (jobId: string) => ({ namespace: 'jobTimeline' as const, jobId }),
  recording: (projectKey: string, sessionId: string, stamp: string) => ({ namespace: 'recording' as const, projectKey, sessionId, stamp }),
  sessionLog: (projectKey: string, date: SessionLogDate, logName: string) => ({ namespace: 'sessionLog' as const, projectKey, year: date.year, month: date.month, day: date.day, logName }),
  jobPins: () => ({ namespace: 'jobsRoot' as const, file: 'pins' }),
  jobDraft: (draftKey: string) => ({ namespace: 'jobsRoot' as const, draftKey }),
  session: (file: string) => ({ namespace: 'session' as const, file }),
  bridgePointer: (projectKey: string) => ({ namespace: 'bridgePointer' as const, projectKey }),
  sessionAliases: (projectKey: string) => ({ namespace: 'sessionAliases' as const, projectKey }),
  dirSyncRecord: (projectKey: string, sessionId: string) => ({ namespace: 'dirSyncRecord' as const, projectKey, sessionId }),
}

/** Cualquier clave del storage: un objeto con su `namespace` y sus campos. */
export type StorageKey = { namespace: string } & Record<string, unknown>

/** `bUo`: la raíz de las transcripciones de agentes de una sesión. */
export function transcriptRootKey(projectKey: string, sessionId: string) {
  return { namespace: 'transcript' as const, projectKey, sessionId, agentRelPath: [] as string[] }
}

/** `wUo`. */
export function bridgeSpawnKey() {
  return { namespace: 'bridgeSpawn' as const }
}

/** `vUo`: el caché de un marketplace, o un subárbol si hay ruta. */
export function marketplaceCacheKey(marketplace: string, relPath?: readonly string[]) {
  return relPath === undefined || relPath.length === 0 ? { namespace: 'marketplaceCache' as const, marketplace } : { namespace: 'marketplaceCache' as const, marketplace, relPath }
}

/** `K`: la tupla canónica de la clave, que no depende del orden de sus campos. */
export function storageKeyTuple(key: StorageKey): unknown[] | undefined {
  const e = key as Record<string, any>
  switch (e.namespace) {
    case 'transcript':
      return e.journal === true
        ? [e.namespace, e.projectKey, e.sessionId, null, e.agentRelPath, 'journal']
        : e.sessionJournal !== undefined
          ? [e.namespace, e.projectKey, e.sessionId, null, null, e.sessionJournal]
          : [e.namespace, e.projectKey, e.sessionId, e.agentId ?? null, e.agentRelPath ?? null]
    case 'history':
    case 'identity':
      return [e.namespace]
    case 'globalConfig':
      return 'kind' in e ? [e.namespace, e.kind, e.stamp] : [e.namespace]
    case 'settings':
      return e.layer === 'user' ? [e.namespace, e.layer] : e.layer === 'project' ? [e.namespace, e.layer, e.projectKey] : [e.namespace, e.layer, e.consentRootKey]
    case 'task':
      return 'meta' in e ? [e.namespace, e.listId, e.meta] : 'highWaterMark' in e ? [e.namespace, e.listId, ['highWaterMark']] : [e.namespace, e.listId, e.taskId]
    case 'memory':
      return [e.namespace, e.projectKey, e.relPath]
    case 'pluginRegistry':
      return [e.namespace, e.file]
    case 'marketplaceCache':
      return 'relPath' in e ? [e.namespace, e.marketplace, e.relPath] : [e.namespace, e.marketplace, e.form]
    case 'pluginCache':
      return [e.namespace, e.marketplace, e.plugin, e.version, e.relPath]
    case 'cache':
      return [e.namespace, e.store, e.id]
    case 'paste':
      return [e.namespace, e.id]
    case 'pluginAssetCache':
      return [e.namespace, e.digest]
    case 'state':
      return [e.namespace, e.id]
    case 'plan':
      return [e.namespace, e.name]
    case 'feedbackDraft':
      return [e.namespace, e.draftId]
    case 'agentMemory':
      return [e.namespace, e.layer, e.layer === 'user' ? null : e.projectKey, e.agentType, e.relPath]
    case 'team':
      return [e.namespace, e.team]
    case 'sidecar':
      return [e.namespace, e.projectKey, e.sessionId, e.relPath]
    case 'scratch':
      return [e.namespace, e.sessionId, e.relPath]
    case 'userConfigDir':
      return [e.namespace, e.dir, e.relPath]
    case 'fileHistory':
      return [e.namespace, e.sessionId, e.backupFileName]
    case 'job':
      return [e.namespace, e.jobId, e.relPath]
    case 'daemon':
      return [e.namespace, e.relPath]
    case 'jobsRoot':
      return 'file' in e ? [e.namespace, e.file] : [e.namespace, 'draft', e.draftKey]
    case 'session':
      return [e.namespace, e.file]
    case 'bridgePointer':
    case 'sessionAliases':
      return [e.namespace, e.projectKey]
    case 'dirSyncRecord':
      return [e.namespace, e.projectKey, e.sessionId]
    case 'mailbox':
      return [e.namespace, e.team, e.teammate]
    case 'log':
      return [e.namespace, e.sessionId, e.channel, e.agentId ?? null, e.runId ?? null]
    case 'jobTimeline':
      return [e.namespace, e.jobId]
    case 'recording':
      return [e.namespace, e.projectKey, e.sessionId, e.stamp]
    case 'sessionLog':
      return [e.namespace, e.projectKey, e.year, e.month, e.day, e.logName]
  }
  return undefined
}

/** `mhn`. */
export function storageKeyIdentity(key: StorageKey): string | undefined {
  return JSON.stringify(storageKeyTuple(key))
}

/** `SUo`. */
export function sameStorageKey(left: StorageKey, right: StorageKey): boolean {
  return storageKeyIdentity(left) === storageKeyIdentity(right)
}
