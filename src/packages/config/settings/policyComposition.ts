/**
 * Las piezas puras con que se compone `policySettings`: las funciones
 * auxiliares de `UP` en `chunk-379zyrv7.js` del ejecutable 2.1.283 (extracción
 * en `.claude/workbench/policy-settings-port-20260927T083804/`). La composición
 * lee cuatro fuentes administradas —la remota, el plist o la clave HKLM, el
 * archivo y la ranura del asistente de política—, decide cuál ata y las funde
 * según `managedSourcesBehavior`; estas funciones son las decisiones que no
 * leen nada: qué cuenta como política, cómo se ordenan dos lecturas y qué
 * viaja de un escalón a otro.
 *
 * Cada una lleva el nombre minimizado del ejecutable en su docstring para que
 * la próxima extracción se compare con ella.
 *
 * pendiente: la composición misma (`UP`, `Qq`, `Os`, `aft`/`njr`, la fusión
 * por restricción `jy`/`_d`/`ks` y la porción del padre `J2o`), que depende
 * del esquema de política y de la lectura del directorio administrado; su
 * fase siguiente la declara el banco.
 */

type PolicyDocument = Record<string, unknown>
export type PolicyLoadState = 'loaded' | 'absent' | 'didNotLoad'

/** La lectura de una fuente administrada, con lo que la composición mira de ella. */
export type PolicyRead = {
  settings: PolicyDocument | null
  onlySubstitutes?: boolean
  documentHasPolicyContent?: boolean
  loadState?: PolicyLoadState
  userWritable?: boolean
}

/**
 * Un error de política: el de la validación más lo que 2.1.283 le añade. La
 * gravedad falta en los errores de esquema; `startupFatal` marca el documento
 * que no se pudo leer como objeto, y `errorClass` el archivo ilegible.
 */
export type PolicyError = {
  file: string
  path: string
  message: string
  severity?: 'fatal' | 'error' | 'warning'
  statusOnly?: boolean
  startupFatal?: boolean
  errorClass?: 'unreadable'
}

/** `lt`: las claves que gobiernan la composición y no son política. */
export const NON_POLICY_KEYS = ['managedSourcesBehavior', 'wslInheritsWindowsSettings'] as const
/** `Es`: las listas que la ranura toma del primer escalón que las declara. */
export const SLOT_FALLBACK_KEYS = ['allowedMcpServers', 'availableModels', 'strictKnownMarketplaces'] as const
/** `Fy`: las listas de permitidos que un escalón superior sombrea. */
export const ADMIN_ALLOWLIST_KEYS = [
  'allowedMcpServers',
  'availableModels',
  'strictKnownMarketplaces',
  'allowedChannelPlugins',
  'allowedMarketplaces',
  'allowedHttpHookUrls',
  'httpHookAllowedEnvVars',
] as const
/** `mjr`: las claves del asistente de política. */
export const POLICY_HELPER_KEYS = ['policyHelper', 'policyHelpers'] as const
/** `Kye`: cómo se nombra cada fuente en los avisos. */
export const SOURCE_LABELS = {
  remote: 'server-managed settings',
  plist: 'the managed preferences plist',
  hklm: 'the HKLM policy key',
  file: 'managed-settings.json',
} as const

const isNonPolicyKey = (key: string) => (NON_POLICY_KEYS as readonly string[]).includes(key)

/** `z`. */
function isPlainObject(value: unknown): value is PolicyDocument {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** `Lt`: un objeto cuyas hojas son todas objetos vacíos no fija nada. */
function isEmptyObjectTree(value: unknown): boolean {
  return isPlainObject(value) && Object.values(value).every(isEmptyObjectTree)
}

/** `cft`. */
export function hasPolicyKeys(settings: PolicyDocument): boolean {
  return Object.keys(settings).some(key => !isNonPolicyKey(key))
}

/** `ggn`. */
export function hasPolicyValues(settings: PolicyDocument): boolean {
  return Object.entries(settings).some(([key, value]) => !isNonPolicyKey(key) && !isEmptyObjectTree(value))
}

/** `_s`. */
export function policyOrNull(settings: PolicyDocument | null): PolicyDocument | null {
  return settings && hasPolicyKeys(settings) ? settings : null
}

/** `mUe`: la lectura trae valores escritos por el administrador, no sólo sustitutos. */
export function isAuthoredPolicy(read: PolicyRead): boolean {
  return read.settings !== null && hasPolicyValues(read.settings) && !read.onlySubstitutes
}

/** `bs`: el orden entre fuentes; gana la de rango mayor. */
export function policyRank(settings: PolicyDocument | null, authored: boolean): number {
  if (settings === null) return -1
  if (authored) return 2
  return hasPolicyValues(settings) ? 1 : 0
}

/** `gUe`. */
export function documentHasPolicyContent(read: PolicyRead): boolean {
  return read.documentHasPolicyContent ?? (read.settings !== null && hasPolicyKeys(read.settings))
}

/** `WUt`. */
export function loadStateOf(read: PolicyRead): PolicyLoadState {
  return read.loadState ?? (read.settings !== null ? 'loaded' : 'absent')
}

/** `Yye`: una lectura que falló deja la fuente sin cargar aunque otra cargue. */
export function combineLoadState(a: PolicyLoadState, b: PolicyLoadState): PolicyLoadState {
  if (a === 'didNotLoad' || b === 'didNotLoad') return 'didNotLoad'
  return a === 'loaded' || b === 'loaded' ? 'loaded' : 'absent'
}

/** `dft`: la fuente ata como administrada; una que falló también, para fallar cerrado. */
export function bindsAsAdminSource(read: PolicyRead): boolean {
  return read.userWritable !== true && (documentHasPolicyContent(read) || read.loadState === 'didNotLoad')
}

type McpTiers = { slot: PolicyDocument | null; adminTiers: readonly PolicyDocument[] }

/** `uUe`. */
export function requiresManagedMcpServersOnly({ slot, adminTiers }: McpTiers): boolean {
  return slot?.allowManagedMcpServersOnly === true || adminTiers.some(tier => tier.allowManagedMcpServersOnly === true)
}

/** `h8e`. */
export function managedAllowedMcpServers({ slot, adminTiers }: McpTiers): unknown {
  return slot?.allowedMcpServers ?? adminTiers.find(tier => tier.allowedMcpServers !== undefined)?.allowedMcpServers
}

/**
 * `Z2o`: las claves de modelo que el proceso padre fija cuando el anfitrión
 * administra el proveedor.
 */
export function hostModelOverlay(parent: PolicyDocument | null, hostManagedProvider: boolean): PolicyDocument | null {
  if (!hostManagedProvider || !parent) return null
  const overlay: PolicyDocument = {}
  if (parent.model !== undefined) overlay.model = parent.model
  if (parent.availableModels !== undefined) overlay.availableModels = parent.availableModels
  if (parent.availableModelsMatch === 'exact' || (parent.availableModelsMatch !== undefined && parent.availableModels !== undefined)) {
    overlay.availableModelsMatch = parent.availableModelsMatch
  }
  if (parent.enforceAvailableModels !== undefined) overlay.enforceAvailableModels = parent.enforceAvailableModels
  if (Array.isArray(parent.deniedModels) && parent.deniedModels.length > 0) overlay.deniedModels = parent.deniedModels
  if (parent.fallbackModel !== undefined) overlay.fallbackModel = parent.fallbackModel
  if (parent.modelPicker !== undefined) overlay.modelPicker = parent.modelPicker
  return Object.keys(overlay).length > 0 ? overlay : null
}

/** `Ee`. */
export function getAtPath(value: unknown, path: readonly string[]): unknown {
  let current = value
  for (const key of path) {
    if (current === null || typeof current !== 'object') return undefined
    current = (current as PolicyDocument)[key]
  }
  return current
}

/**
 * `Ve`: escribe copiando cada nivel intermedio, para no tocar un objeto que
 * otro escalón comparte. Escribir `undefined` borra la clave y los padres que
 * quedan vacíos.
 */
export function setAtPath(target: PolicyDocument, path: readonly string[], value: unknown): void {
  const chain: PolicyDocument[] = [target]
  let current = target
  for (const key of path.slice(0, -1)) {
    const copy = { ...(current[key] as PolicyDocument | undefined) }
    current[key] = copy
    current = copy
    chain.push(current)
  }
  const last = path.at(-1)!
  if (value !== undefined) {
    current[last] = value
    return
  }
  delete current[last]
  for (let level = chain.length - 1; level > 0; level--) {
    if (Object.keys(chain[level]!).length > 0) break
    delete chain[level - 1]![path[level - 1]!]
  }
}

/**
 * `Ky`: `modelOverrides` viaja desde el primer escalón que la declara salvo
 * que un escalón anterior fije `availableModels`; con la instantánea remota
 * primero, el `availableModels` del escalón 0 no la retira.
 */
export function inheritModelOverrides(target: PolicyDocument, tiers: readonly PolicyDocument[], snapshotFirst: boolean): void {
  const models = tiers.findIndex(tier => tier.availableModels !== undefined)
  const overrides = tiers.findIndex(tier => tier.modelOverrides !== undefined)
  if (overrides !== -1 && (models === -1 || overrides <= models || (snapshotFirst && models === 0))) {
    target.modelOverrides = { ...(tiers[overrides]!.modelOverrides as PolicyDocument) }
  } else {
    delete target.modelOverrides
  }
}

/** `fd`. */
export function isFatalWslInheritError(error: PolicyError): boolean {
  return error.path === 'wslInheritsWindowsSettings' && error.severity === 'fatal'
}

/**
 * `B5n`: el error fatal de `wslInheritsWindowsSettings` baja a aviso cuando
 * la capa remota trae política autorada, porque entonces esa capa ata y la
 * sesión no queda sin política. La remota sólo se lee si hay algo que bajar.
 */
export function downgradeWslInheritErrors(errors: PolicyError[], remote: () => PolicyRead): PolicyError[] {
  if (!errors.some(isFatalWslInheritError)) return errors
  if (!isAuthoredPolicy(remote())) return errors
  return errors.map(error => (isFatalWslInheritError(error) ? { ...error, severity: 'warning' } : error))
}

/**
 * `By`: con la instantánea remota primero, el escalón superior deja de
 * imponer las listas de permitidos que otro escalón declara, para que la
 * lista del escalón inferior no quede sombreada por una copia en caché.
 */
export function withoutShadowedAllowlists(
  tier: PolicyDocument | null,
  snapshotFirst: boolean,
  others: readonly (PolicyDocument | null)[],
): PolicyDocument | null {
  if (tier === null || !snapshotFirst) return tier
  const shadowed = ADMIN_ALLOWLIST_KEYS.filter(key => others.some(other => other?.[key] !== undefined))
  if (shadowed.length === 0) return tier
  const kept = { ...tier }
  for (const key of shadowed) delete kept[key]
  return kept
}
