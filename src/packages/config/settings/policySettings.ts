/**
 * La composición de `policySettings`: `UP` de `chunk-379zyrv7.js` en el
 * ejecutable 2.1.283, con el asistente de política (`BL`, `Id`, `eVo`, `Vy`,
 * `Xy`), el proceso padre (`lft`) y la rama WSL del archivo (`aft`), más los
 * consumidores que dan su documento (`Zy`), sus escalones (`Jy`) y las fuentes
 * fundidas (`Gy`). Extracción en
 * `.claude/workbench/policy-settings-port-20260927T083804/`.
 *
 * Cuatro fuentes compiten por atar: la remota —o el asistente, que ocupa su
 * ranura—, la MDM (plist o HKLM), el archivo administrado y, por debajo de
 * todas, lo que pasa el proceso padre. Ata la de mayor rango (`bs`); con
 * empate, la de más arriba. Una fuente que perdió pero leía valores que no se
 * pudieron aplicar sigue atando al lado de la ganadora —sólo en lo más
 * restrictivo— para fallar cerrado. Si la que ata declara
 * `managedSourcesBehavior: "merge"`, todas se funden.
 *
 * Lo que la composición lee se inyecta en el contexto: las pruebas y el
 * cableado de `settings.ts` deciden de dónde sale cada fuente.
 *
 * Divergencias declaradas:
 * - `MRe` (servidores MCP del anfitrión) se decide con
 *   `honorsHostMcpServers`; en el ejecutable lo decide el punto de entrada.
 * - `Rz` (el anfitrión administra el gateway) se inyecta con
 *   `hostManagesGateway`: su lectura del entorno no se porta todavía.
 * - La caché de lecturas por sesión (`store.parsedFiles`, el listado del
 *   directorio) no se porta; la del asistente fundido sí.
 */
import mergeWith from 'lodash-es/mergeWith.js'
import { getPlatform, type Platform } from '../platform.ts'
import { getPolicyHelperManagedSettings } from '../policyHelper.ts'
import { getHkcuSettings, getMdmSettings } from './mdm/settings.ts'
import { getManagedFilePath, WINDOWS_MANAGED_DIRECTORY } from './managedPath.ts'
import {
  bindsAsAdminSource,
  combineLoadState,
  documentHasPolicyContent,
  hasPolicyValues,
  hostModelOverlay,
  isAuthoredPolicy,
  loadStateOf,
  managedAllowedMcpServers,
  NON_POLICY_KEYS,
  POLICY_HELPER_KEYS,
  type PolicyError,
  policyOrNull,
  policyRank,
  requiresManagedMcpServersOnly,
  SLOT_FALLBACK_KEYS,
  SOURCE_LABELS,
  withoutShadowedAllowlists,
} from './policyComposition.ts'
import { mergeAdminTiers, mergeTierValue, TOP_TIER_ONLY_KEYS } from './policyMerge.ts'
import { parentPolicySlice } from './policyParent.ts'
import {
  NODE_POLICY_FILES,
  type PolicyFiles,
  type PolicySourceContext,
  type PolicySourceRead,
  readFilePolicy,
  readMdmPolicy,
  readPolicyDocument,
  readRemotePolicy,
} from './policySources.ts'

type PolicyDocument = Record<string, unknown>
type MdmLabel = 'plist' | 'hklm'
type TierSource = 'remote' | MdmLabel | 'file'

/** El asistente fundido con su base, una vez por sesión (`store.policy.mergedHelper`). */
export type PolicyStore = { policy: { mergedHelper?: { helper: PolicyDocument; mergedOver: 'remote' | MdmLabel | 'file' | null } } }

export function createPolicyStore(): PolicyStore {
  return { policy: {} }
}

let sessionStore = createPolicyStore()

export function resetPolicyStoreForTesting(): void {
  sessionStore = createPolicyStore()
}

/**
 * Las fuentes de esta sesión: la plataforma detectada, la caché remota (la
 * lectura por defecto de `readRemotePolicy`), la MDM y HKCU ya cargadas, el
 * archivo administrado de la plataforma y la salida del asistente, si corrió.
 *
 * pendiente: de qué fuente se armó el asistente (`helperArmedFromRemote`),
 * si funde su salida y los ajustes que pasa el proceso padre; sin ellos el
 * asistente ocupa la ranura remota y el padre no aporta.
 */
export function defaultPolicyContext(): PolicyContext {
  return {
    platform: getPlatform(),
    store: sessionStore,
    mdm: () => {
      const { settings, errors } = getMdmSettings()
      return { settings, errors }
    },
    hkcu: () => getHkcuSettings(),
    helper: () => getPolicyHelperManagedSettings(),
  }
}

export type PolicyContext = PolicySourceContext & {
  platform: Platform
  store: PolicyStore
  /** La lectura del archivo administrado, si no la hace `aft`. */
  file?: () => PolicySourceRead
  managedDirectory?: string
  windowsManagedDirectory?: string
  files?: PolicyFiles
  wslInherits?: () => boolean
  helper?: () => PolicyDocument | null
  helperArmedFromRemote?: () => boolean
  helperMergesOutput?: () => boolean
  parentManaged?: PolicyDocument
  hostManagesGateway?: () => boolean
  hostManagedProvider?: boolean
  honorsHostMcpServers?: () => boolean
  hkcu?: () => { settings: PolicyDocument } | null
  warn?: (message: string) => void
}

export type ComposedPolicy = {
  tiers: PolicyDocument[]
  tierSources: TierSource[]
  admin: PolicyDocument | null
  parentSlice: PolicyDocument | null
  hostModelOverlay: PolicyDocument | null
  errors: PolicyError[]
  present: { remote: boolean; mdm: boolean; file: boolean }
  mode: unknown
  merged: boolean
  composed: { remote: boolean; mdm: boolean; file: boolean }
  snapshotFirst: boolean
  parentNeverShutOut: boolean
  shadowedHelperSources: TierSource[]
  parentIncluded: boolean
  heldEmpty: boolean
}

const PARENT_SOURCE = 'parent managed settings'
/** `dgn`: lo que el padre no puede aportar. */
const MANAGED_ONLY_KEYS = ['managedMcpServers', 'isolation'] as const
/** `Yy`: lo que el asistente reemplaza entero al fundirse. */
const HELPER_REPLACED_KEYS = ['forceLoginOrgUUID', 'gatewayInternalNetworks', 'allowedHttpHookUrls', 'httpHookAllowedEnvVars', 'allowRead'] as const

const isNonPolicyKey = (key: string) => (NON_POLICY_KEYS as readonly string[]).includes(key)

function omit(document: PolicyDocument, keys: readonly string[]): PolicyDocument {
  return Object.fromEntries(Object.entries(document).filter(([key]) => !keys.includes(key)))
}

function pick(document: PolicyDocument, keys: readonly string[]): PolicyDocument {
  return Object.fromEntries(keys.filter(key => key in document).map(key => [key, document[key]]))
}

/** Una ruta de Windows vista desde WSL: `C:\a\b` → `/mnt/c/a/b`. */
export function wslMountOf(windowsPath: string): string {
  const [, drive, rest] = /^([A-Za-z]):\\(.*)$/.exec(windowsPath) ?? []
  return drive ? `/mnt/${drive.toLowerCase()}/${rest!.replaceAll('\\', '/')}` : windowsPath
}

/** `$e`. */
function mdmLabel(platform: Platform): MdmLabel {
  return platform === 'macos' ? 'plist' : 'hklm'
}

/** `aft`: en WSL, una MDM que ata deja fuera el archivo, y se puede heredar el de Windows. */
function readManagedFile(context: PolicyContext): PolicySourceRead {
  const files = context.files ?? NODE_POLICY_FILES
  const linux = () => readFilePolicy(context.managedDirectory ?? getManagedFilePath(), files)
  if (context.platform !== 'wsl') return linux()
  const mdmBinds = bindsAsAdminSource(readMdmPolicy(context))
  if (context.wslInherits?.()) {
    const windows = readFilePolicy(context.windowsManagedDirectory ?? wslMountOf(WINDOWS_MANAGED_DIRECTORY), files)
    if (bindsAsAdminSource(windows) || mdmBinds) return windows
    const fallback = linux()
    return { ...fallback, errors: [...windows.errors, ...fallback.errors], loadState: combineLoadState(loadStateOf(windows), loadStateOf(fallback)) }
  }
  if (mdmBinds) return { settings: null, errors: [], documentHasPolicyContent: false, loadState: 'absent' }
  return linux()
}

/** `lft`: los ajustes que pasa el proceso padre, con aviso de lo que no puede aportar. */
function readParentPolicy(context: PolicyContext): { settings: PolicyDocument | null; errors: PolicyError[] } {
  const parent = context.parentManaged
  if (!parent || Object.keys(parent).length === 0) return { settings: null, errors: [] }
  const read = readPolicyDocument(parent, PARENT_SOURCE)
  const honored = (key: string) => key === 'managedMcpServers' && context.honorsHostMcpServers?.() === true
  for (const key of MANAGED_ONLY_KEYS) {
    if (read.settings?.[key] !== undefined && !honored(key)) {
      read.errors.push({
        file: PARENT_SOURCE,
        path: key,
        message: `"${key}" is only honored from the organization's managed settings sources (server-managed, MDM, managed-settings.json), not from settings a host passes in, and was ignored here.`,
        severity: 'warning',
        statusOnly: true,
      })
    }
  }
  return { settings: read.settings, errors: read.errors }
}

/** `Vy`: las variables del asistente pisan las de la base sin distinguir mayúsculas. */
function mergeHelperEnv(base: PolicyDocument, helper: PolicyDocument): PolicyDocument {
  const byUpper = new Map<string, unknown>()
  for (const [name, value] of Object.entries(helper)) if (!byUpper.has(name.toUpperCase())) byUpper.set(name.toUpperCase(), value)
  const merged: PolicyDocument = {}
  for (const [name, value] of Object.entries(base)) merged[name] = byUpper.get(name.toUpperCase()) ?? value
  return Object.assign(merged, helper)
}

/** `Xy`. */
function mergeHelperValue(target: unknown, source: unknown, key: string): unknown {
  const merged = key !== undefined && source !== undefined && (HELPER_REPLACED_KEYS as readonly string[]).includes(key)
    ? source
    : mergeTierValue(target, source, key)
  return merged === source && Array.isArray(merged) ? [...merged] : merged
}

/** `eVo`: la salida del asistente fundida sobre su base, sin las claves del asistente. */
function mergeHelperOutput(base: PolicyDocument | null, helper: PolicyDocument): PolicyDocument {
  const withoutHelper = omit(base ?? {}, POLICY_HELPER_KEYS)
  const merged = mergeWith({}, withoutHelper, helper, mergeHelperValue) as PolicyDocument
  const baseEnv = withoutHelper.env as PolicyDocument | undefined
  const helperEnv = helper.env as PolicyDocument | undefined
  if (baseEnv && helperEnv) merged.env = mergeHelperEnv(baseEnv, helperEnv)
  return merged
}

/** `Id`: la base de un asistente que es escalón propio. */
function helperTierBase(context: PolicyContext): { base: PolicyDocument | null; mergedOver: MdmLabel | 'file' } {
  const mdm = readMdmPolicy(context)
  if (composePolicySettings({ ...context, helper: undefined }).present.mdm) return { base: mdm.settings, mergedOver: mdmLabel(context.platform) }
  const file = context.file?.() ?? readManagedFile(context)
  return { base: file.settings, mergedOver: 'file' }
}

export type HelperSlot =
  | { composes: 'none' }
  | { composes: 'remoteSlot' | 'tier'; helper: PolicyDocument; mergedOver: 'remote' | MdmLabel | 'file' | null }

/**
 * `BL`: el asistente de política. Armado desde la remota ocupa su ranura; si
 * no, es un escalón propio. Si funde su salida, se funde una vez por sesión
 * sobre la fuente que reemplaza.
 */
export function helperSlot(context: PolicyContext): HelperSlot {
  const helper = context.helper?.() ?? null
  if (!helper) return { composes: 'none' }
  const composes = context.helperArmedFromRemote?.() === false ? 'tier' : 'remoteSlot'
  if (context.helperMergesOutput?.() !== true) return { composes, helper, mergedOver: null }
  if (!context.store.policy.mergedHelper) {
    const { base, mergedOver } = composes === 'remoteSlot'
      ? { base: readRemotePolicy(context).settings, mergedOver: 'remote' as const }
      : helperTierBase(context)
    context.store.policy.mergedHelper = {
      helper: mergeHelperOutput(base, helper),
      mergedOver: Object.keys(omit(base ?? {}, POLICY_HELPER_KEYS)).length > 0 ? mergedOver : null,
    }
  }
  return { composes, ...context.store.policy.mergedHelper }
}

/** `A$o`. */
function parentMerges(admin: PolicyDocument, context: PolicyContext): boolean {
  return (admin.parentSettingsBehavior ?? (context.hostManagesGateway?.() ? 'merge' : 'first-wins')) === 'merge'
}

/** `UP`. */
export function composePolicySettings(context: PolicyContext): ComposedPolicy {
  const errors: PolicyError[] = []
  const label = mdmLabel(context.platform)
  const remote = readRemotePolicy(context)
  const { settings: remoteSettings, servedSnapshot } = remote
  errors.push(...remote.errors)
  const slot = helperSlot(context)
  const inRemoteSlot = slot.composes === 'remoteSlot'
  const slotDocument = inRemoteSlot ? slot.helper : policyOrNull(remoteSettings)
  const mdm = readMdmPolicy(context)
  const mdmSettings = mdm.settings
  errors.push(...mdm.errors)
  const mdmDocument = policyOrNull(mdmSettings)
  const file = context.file?.() ?? readManagedFile(context)
  const fileSettings = file.settings
  errors.push(...file.errors)
  const fileDocument = policyOrNull(fileSettings)

  const slotAuthored = inRemoteSlot ? slotDocument !== null : isAuthoredPolicy(remote)
  const mdmAuthored = isAuthoredPolicy(mdm)
  const fileAuthored = isAuthoredPolicy(file)
  const slotRank = policyRank(slotDocument, slotAuthored)
  const mdmRank = policyRank(mdmDocument, mdmAuthored)
  const fileRank = policyRank(fileDocument, fileAuthored)
  const slotBinds = slotDocument !== null && slotRank >= Math.max(mdmRank, fileRank)
  const mdmBinds = mdmDocument !== null && mdmRank >= fileRank

  const candidates: [PolicyDocument | null, boolean][] = [[remoteSettings, slotBinds], [mdmSettings, mdmBinds], [fileSettings, fileDocument !== null]]
  const modeSource = inRemoteSlot
    ? slot.helper
    : candidates.find(([settings, binds]) => settings !== null && (settings === remoteSettings && servedSnapshot ? binds : settings.managedSourcesBehavior !== undefined || binds))?.[0]
  const mode = modeSource?.managedSourcesBehavior

  const slotLost = slotDocument !== null && !slotBinds
  const slotTier = slotLost ? null : slotDocument
  const mdmLost = mdmDocument !== null && !mdmBinds && slotTier === null
  const mdmTier = mdmLost ? null : mdmDocument
  const beside: [PolicyDocument, TierSource][] = []
  for (const [lost, source, document] of [[slotLost, 'remote', slotDocument], [mdmLost, label, mdmDocument]] as const) {
    if (!lost || document === null) continue
    beside.push([document, source])
    if (!hasPolicyValues(document)) continue
    const supplier = source === 'remote' && mdmAuthored ? label : 'file'
    errors.push({
      file: SOURCE_LABELS[source],
      path: Object.keys(document).find(key => !isNonPolicyKey(key)) ?? '',
      message: `${SOURCE_LABELS[source]} holds only values that could not be applied as written, so ${SOURCE_LABELS[supplier]} supplies the managed settings while that fail-closed reading still binds beside it (the most restrictive value of each such key applies), until it is fixed.`,
      severity: 'warning',
      statusOnly: true,
    })
  }

  const parent = readParentPolicy(context)
  errors.push(...parent.errors)
  const parentSettings = parent.settings
  const authoredBelow = (mdmAuthored ? mdmTier : null) ?? (fileAuthored ? fileDocument : null)
  const parentAllowlists = parentSettings !== null && (authoredBelow === null || parentMerges(authoredBelow, context))
  const snapshotFirst = slotTier !== null && servedSnapshot && !inRemoteSlot
  const tiers = [
    withoutShadowedAllowlists(slotTier, servedSnapshot && !inRemoteSlot, [mdmTier, fileDocument, ...(parentAllowlists ? [pick(parentSettings!, SLOT_FALLBACK_KEYS)] : [])]),
    mdmTier,
    fileDocument,
    ...beside.map(([document]) => document),
  ].filter((tier): tier is PolicyDocument => tier !== null)
  const tierSources: TierSource[] = [
    ...(slotTier !== null ? ['remote' as const] : []),
    ...(mdmTier !== null ? [label] : []),
    ...(fileDocument !== null ? ['file' as const] : []),
    ...beside.map(([, source]) => source),
  ]
  const { admin: merged, merged: didMerge } = mergeAdminTiers(tiers, mode, snapshotFirst, beside.length, context.platform)
  const heldBy = merged === null ? [remote, mdm, file].find(documentHasPolicyContent) : undefined
  const admin = merged ?? (heldBy ? {} : null)
  const present = { remote: slotTier !== null || heldBy === remote, mdm: mdmTier !== null || heldBy === mdm, file: fileDocument !== null || heldBy === file }
  const parentNeverShutOut = !(slotTier !== null && slotAuthored && !snapshotFirst) && !(mdmTier !== null && mdmAuthored) && !fileAuthored

  const shadowedHelperSources: TierSource[] = []
  if (didMerge) {
    const reader = present.remote ? 'remote' : present.mdm ? label : 'file'
    for (const [document, source] of [[mdmTier, label], [fileDocument, 'file']] as const) {
      if (document === null || document === tiers[0] || (snapshotFirst && document === tiers[1])) continue
      const configured = POLICY_HELPER_KEYS.filter(key => Object.values((document[key] as PolicyDocument | undefined) ?? {}).some(value => value !== undefined && value !== null))
      const [first] = configured
      if (first === undefined) continue
      shadowedHelperSources.push(source)
      errors.push({
        file: SOURCE_LABELS[source],
        path: first,
        message: `${configured.map(key => `"${key}"`).join(' and ')} in ${SOURCE_LABELS[source]} ignored: policy helper configuration is read from the highest managed settings source only (${SOURCE_LABELS[reader]} here), even with managedSourcesBehavior "merge". Configure the helper in that source instead.`,
        severity: 'warning',
        statusOnly: true,
      })
    }
  }

  const contributes = (document: PolicyDocument | null) =>
    document !== null && (document === tiers[0] || Object.keys(omit(document, TOP_TIER_ONLY_KEYS)).length > 0)
  const composed = { remote: contributes(slotTier), mdm: contributes(mdmTier), file: contributes(fileDocument) }
  const adminTiers = { slot: admin, adminTiers: tiers }
  const adminView = {
    allowManagedPermissionRulesOnly: tiers.some(tier => tier.allowManagedPermissionRulesOnly === true) || undefined,
    forceLoginOrgUUID: admin?.forceLoginOrgUUID,
    ...pick(admin ?? {}, SLOT_FALLBACK_KEYS),
    allowedMcpServers: requiresManagedMcpServersOnly(adminTiers) || (parentSettings?.allowManagedMcpServersOnly === true && admin?.allowManagedMcpServersOnly !== false)
      ? managedAllowedMcpServers(adminTiers)
      : admin?.allowedMcpServers,
    sandbox: {
      network: { allowManagedDomainsOnly: tiers.some(tier => (tier.sandbox as { network?: PolicyDocument } | undefined)?.network?.allowManagedDomainsOnly === true) || undefined },
      filesystem: { allowManagedReadPathsOnly: tiers.some(tier => (tier.sandbox as { filesystem?: PolicyDocument } | undefined)?.filesystem?.allowManagedReadPathsOnly === true) || undefined },
    },
  }
  const parentIncluded = merged === null || parentMerges(merged, context) || parentNeverShutOut
  const slice = parentSettings && parentIncluded ? parentPolicySlice(parentSettings, adminView, context.warn) : null
  return {
    tiers,
    tierSources,
    admin,
    parentSlice: slice && Object.keys(slice).length > 0 ? slice : null,
    hostModelOverlay: hostModelOverlay(parentSettings, context.hostManagedProvider === true),
    errors,
    present,
    mode,
    merged: didMerge,
    composed,
    snapshotFirst,
    parentNeverShutOut,
    shadowedHelperSources,
    parentIncluded,
    heldEmpty: heldBy !== undefined,
  }
}

/** `Zy`: el documento de la fuente `policySettings`. */
export function policySettingsDocument(context: PolicyContext): PolicyDocument | null {
  const slot = helperSlot(context)
  if (slot.composes === 'tier') return slot.helper
  const { admin, parentSlice } = composePolicySettings(context)
  if (admin) return admin
  if (parentSlice) return null
  const hkcu = context.hkcu?.()
  return hkcu && Object.keys(hkcu.settings).length > 0 ? hkcu.settings : null
}

/** `Jy`: los escalones que aplican, con la porción del padre al final. */
export function policyTierDocuments(context: PolicyContext): PolicyDocument[] {
  const slot = helperSlot(context)
  if (slot.composes === 'tier') return [slot.helper]
  const { tiers, parentSlice } = composePolicySettings(context)
  return parentSlice ? [...tiers, parentSlice] : tiers
}

/** `Gy`: con fusión, qué fuentes aportaron algo. */
export function policyMergedSources(context: PolicyContext): TierSource[] | null {
  if (helperSlot(context).composes === 'tier') return null
  const { merged, composed } = composePolicySettings(context)
  if (!merged) return null
  const label = mdmLabel(context.platform)
  return [...(composed.remote ? ['remote' as const] : []), ...(composed.mdm ? [label] : []), ...(composed.file ? ['file' as const] : [])]
}
