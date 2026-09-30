/**
 * Lo que el proceso padre aporta a la política administrada: `J2o` de
 * `chunk-379zyrv7.js` en el ejecutable 2.1.283, con `Hy`, `Zl` y `Pd`
 * (extracción en `.claude/workbench/policy-settings-port-20260927T083804/`).
 *
 * Un anfitrión que lanza la sesión puede pasarle sus propios ajustes
 * administrados. De ellos sólo viaja lo que restringe: una bandera que apaga
 * algo, una lista que niega. Lo que permite —dominios, lecturas, reglas
 * `allow`— sólo viaja si la política propia no pide exclusividad de lo
 * administrado, y una lista de permitidos sólo si el administrador no
 * declara la suya.
 */
import mergeWith from 'lodash-es/mergeWith.js'
import { getAtPath, setAtPath, SLOT_FALLBACK_KEYS, suppressedAwsPairs } from './policyComposition.ts'
import { RESTRICTIVE_SETTINGS } from './policyMerge.ts'

export { suppressedAwsPairs }

type PolicyDocument = Record<string, unknown>
type AdminView = PolicyDocument & {
  allowManagedPermissionRulesOnly?: unknown
  forceLoginOrgUUID?: unknown
  sandbox?: { network?: { allowManagedDomainsOnly?: unknown }; filesystem?: { allowManagedReadPathsOnly?: unknown } }
}

/** `G5n`: una regla que empieza con «!» exceptúa rutas en vez de restringir. */
const EXCEPTION_RULE = /^(?:Read|Edit)\((?:\.\/)?!/

function pick(source: PolicyDocument, keys: readonly string[]): PolicyDocument {
  return Object.fromEntries(keys.filter(key => source[key] !== undefined).map(key => [key, source[key]]))
}

const asObject = (value: unknown): PolicyDocument | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as PolicyDocument) : undefined

/** `J1r`. */
function declaresTemplates(attribution: PolicyDocument): boolean {
  return attribution.commit !== undefined || attribution.pr !== undefined
}

/** `Zl`: si los remolques de atribución quedan puestos, y por qué. */
export function commitTrailersState(
  attribution: PolicyDocument | undefined,
  includeCoAuthoredBy: boolean | undefined,
): 'explicit-enabled' | 'implicit-enabled' | 'disabled' | undefined {
  const trailers = attribution?.commitTrailers
  if (typeof trailers === 'boolean') return trailers ? 'explicit-enabled' : 'disabled'
  if (attribution !== undefined && declaresTemplates(attribution)) return attribution.commit === '' ? 'disabled' : 'implicit-enabled'
  if (includeCoAuthoredBy !== undefined) return includeCoAuthoredBy ? 'implicit-enabled' : 'disabled'
  return undefined
}

/** `Hy`: las claves del sandbox que el padre fija en su valor restrictivo. */
export function restrictiveSandbox(parent: PolicyDocument): PolicyDocument {
  const kept: PolicyDocument = {}
  for (const { path, restrictive } of RESTRICTIVE_SETTINGS) {
    const value = getAtPath(parent, path)
    const order = (Array.isArray(restrictive) ? restrictive : [restrictive]) as readonly unknown[]
    if (path[0] === 'sandbox' && order.includes(value)) setAtPath(kept, path, value)
  }
  return (kept.sandbox as PolicyDocument | undefined) ?? {}
}

function permissionsSlice(permissions: PolicyDocument, admin: AdminView, warn: (message: string) => void): PolicyDocument {
  const slice = pick(permissions, ['deny', 'ask'])
  for (const kind of ['deny', 'ask'] as const) {
    const rules = slice[kind]
    if (!Array.isArray(rules)) continue
    slice[kind] = rules.filter(rule => {
      if (!EXCEPTION_RULE.test(rule)) return true
      warn(`Ignoring ${kind} rule "${rule}" from the parent process's managed settings: a rule starting with "!" removes paths from the rules listed before it instead of restricting anything, so it is not merged into the policy rules. Spell the deny without the exception instead.`)
      return false
    })
  }
  if (permissions.disableBypassPermissionsMode === 'disable') slice.disableBypassPermissionsMode = 'disable'
  if (permissions.disableAutoMode === 'disable') slice.disableAutoMode = 'disable'
  if (permissions.blockReadsOutsideWorkingDirectories === true) slice.blockReadsOutsideWorkingDirectories = true
  if (admin.allowManagedPermissionRulesOnly !== true) {
    const { allow, additionalDirectories } = permissions
    if (allow && admin.sandbox?.network?.allowManagedDomainsOnly !== true) slice.allow = allow
    if (additionalDirectories) slice.additionalDirectories = additionalDirectories
  }
  return slice
}

function credentialsSlice(credentials: PolicyDocument): PolicyDocument {
  const files = ((credentials.files as PolicyDocument[] | undefined) ?? [])
    .map(file => (file.mode === 'deny' ? { path: file.path, mode: 'deny' } : { path: file.path, mode: 'mask', injectHosts: [] }))
  const envVars = ((credentials.envVars as PolicyDocument[] | undefined) ?? [])
    .filter(variable => variable.mode === 'deny')
    .map(variable => ({ name: variable.name, mode: 'deny' }))
  const slice: PolicyDocument = { ...(files.length > 0 && { files }), ...(envVars.length > 0 && { envVars }) }
  const sigv4 = asObject(credentials.sigv4)
  if (sigv4) {
    const denied: PolicyDocument = {}
    for (const flavor of ['streaming', 'presigned', 'sigv4a']) if (sigv4[flavor] === 'deny') denied[flavor] = 'deny'
    slice.sigv4 = denied
  }
  const pairs = suppressedAwsPairs((credentials.awsPairs as unknown[] | undefined) ?? [], [])
  if (pairs.length > 0) slice.awsPairs = pairs
  return slice
}

function sandboxSlice(parent: PolicyDocument, sandbox: PolicyDocument, admin: AdminView): PolicyDocument {
  const network = asObject(sandbox.network)
  const filesystem = asObject(sandbox.filesystem)
  const credentials = asObject(sandbox.credentials)
  const slice: PolicyDocument = {}
  const networkSlice = network ? pick(network, ['deniedDomains']) : {}
  const filesystemSlice = filesystem ? pick(filesystem, ['denyRead', 'denyWrite']) : {}
  if (network && admin.sandbox?.network?.allowManagedDomainsOnly !== true && network.allowedDomains) networkSlice.allowedDomains = network.allowedDomains
  if (Object.keys(networkSlice).length > 0) slice.network = networkSlice
  if (filesystem && admin.sandbox?.filesystem?.allowManagedReadPathsOnly !== true && filesystem.allowRead) filesystemSlice.allowRead = filesystem.allowRead
  if (Object.keys(filesystemSlice).length > 0) slice.filesystem = filesystemSlice
  if (credentials) {
    const credentialSlice = credentialsSlice(credentials)
    if (Object.keys(credentialSlice).length > 0) slice.credentials = credentialSlice
  }
  mergeWith(slice, restrictiveSandbox(parent))
  return slice
}

/**
 * `J2o`: la porción de los ajustes del padre que entra en la política.
 * `admin` es la vista del administrador propio que decide qué permisos del
 * padre pueden viajar; `warn` recibe las reglas descartadas.
 */
export function parentPolicySlice(parent: PolicyDocument, admin: AdminView, warn: (message: string) => void = () => {}): PolicyDocument {
  const slice: PolicyDocument = {}
  for (const key of ['allowManagedHooksOnly', 'disableCommandPluginSources', 'allowManagedMcpServersOnly', 'disableThyroxAiConnectors']) {
    if (parent[key] === true) slice[key] = true
  }
  if (parent.syncThyroxAiSkills === false) slice.syncThyroxAiSkills = false
  if (parent.syncThyroxAiPlugins === false) slice.syncThyroxAiPlugins = false
  if (asObject(parent.remoteTools)?.allowUnattendedServing === false) {
    slice.remoteTools = { ...asObject(slice.remoteTools), allowUnattendedServing: false }
  }
  if (parent.allowManagedPermissionRulesOnly === true) slice.allowManagedPermissionRulesOnly = true
  if (parent.disableAutoMode === 'disable') slice.disableAutoMode = 'disable'
  const shareHostProfile = asObject(parent.remoteControl)?.shareHostProfile
  if (shareHostProfile === 'off' || shareHostProfile === 'basic') slice.remoteControl = { ...asObject(slice.remoteControl), shareHostProfile }
  const attribution = asObject(parent.attribution)
  if (commitTrailersState(attribution, parent.includeCoAuthoredBy as boolean | undefined) === 'disabled') {
    slice.attribution = { ...asObject(slice.attribution), commitTrailers: false }
  }
  if (attribution?.sessionUrl === false) slice.attribution = { ...asObject(slice.attribution), sessionUrl: false }
  const strict = parent.strictPluginOnlyCustomization
  if (strict === true || (Array.isArray(strict) && strict.length > 0)) slice.strictPluginOnlyCustomization = strict
  if (parent.deniedMcpServers) slice.deniedMcpServers = parent.deniedMcpServers
  if (Array.isArray(parent.blockedMarketplaces) && parent.blockedMarketplaces.length > 0) slice.blockedMarketplaces = parent.blockedMarketplaces
  if (Array.isArray(parent.deniedModels) && parent.deniedModels.length > 0) slice.deniedModels = parent.deniedModels
  if (admin.forceLoginOrgUUID === undefined && parent.forceLoginOrgUUID) slice.forceLoginOrgUUID = parent.forceLoginOrgUUID
  for (const key of SLOT_FALLBACK_KEYS) if (admin[key] === undefined && parent[key]) slice[key] = parent[key]
  if (parent.enforceAvailableModels === true) slice.enforceAvailableModels = true
  if (parent.availableModelsMatch === 'exact') slice.availableModelsMatch = 'exact'
  const permissions = asObject(parent.permissions)
  if (permissions) {
    const permissionSlice = permissionsSlice(permissions, admin, warn)
    if (Object.keys(permissionSlice).length > 0) slice.permissions = permissionSlice
  }
  const sandbox = asObject(parent.sandbox)
  if (sandbox) {
    const sandboxPart = sandboxSlice(parent, sandbox, admin)
    if (Object.keys(sandboxPart).length > 0) slice.sandbox = sandboxPart
  }
  return slice
}
