/**
 * La fusión de los escalones administrados de `policySettings`: cómo se
 * combinan la fuente que ata y las demás cuando `managedSourcesBehavior` es
 * `merge`, y qué toma la que ata de las otras aunque no lo sea. Porte de `jy`,
 * `_d`, `ks`, `Wy`, `xd`, `Md`, `S6`, `Qe` y `tVo` de `chunk-379zyrv7.js` en
 * el ejecutable 2.1.283 (extracción en
 * `.claude/workbench/policy-settings-port-20260927T083804/`).
 *
 * La regla que atraviesa el módulo: en las claves que restringen, gana el
 * valor más restrictivo de cualquier escalón, aunque el escalón superior diga
 * otra cosa. En el resto gana el superior, y las listas se unen.
 *
 * pendiente: la reescritura de `awsPairs` (`Pd`), que renombra los pares de
 * credenciales AWS de los escalones inferiores; aquí se reemplazan como
 * cualquier otra lista de `xd`.
 */
import mergeWith from 'lodash-es/mergeWith.js'
import type { Platform } from '../platform.ts'
import { getAtPath, inheritModelOverrides, NON_POLICY_KEYS, POLICY_HELPER_KEYS, setAtPath } from './policyComposition.ts'

type PolicyDocument = Record<string, unknown>
type Restrictive = boolean | string | readonly string[]

/** `wd`: los niveles de esfuerzo, del más al menos restrictivo. */
const EFFORT_LEVELS = ['low', 'medium', 'high', 'xhigh', 'max'] as const

/**
 * `Qe`: cada clave que restringe y su valor restrictivo. Una lista ordena los
 * valores del más al menos restrictivo. Las tres claves `*ThyroxAi*` llevan en
 * el ejecutable el nombre del producto de la referencia; aquí dicen thyrox, por
 * la decisión que `src/verify/check_product_word.py` aplica.
 */
export const RESTRICTIVE_SETTINGS: readonly { path: readonly string[]; restrictive: Restrictive }[] = [
  ...[
    'allowManagedPermissionRulesOnly', 'allowManagedHooksOnly', 'allowManagedMcpServersOnly', 'enforceAvailableModels',
    'disableAllHooks', 'disableThyroxAiConnectors', 'disableCommandPluginSources', 'disableSideloadFlags',
    'disableSkillShellExecution', 'disableRemoteControl', 'disableAgentView', 'disableWorkflows', 'disableArtifact',
    'disableBundledSkills', 'fastModePerSessionOptIn', 'isolatePeerMachines', 'strictPluginOnlyCustomization',
  ].map(key => ({ path: [key], restrictive: true })),
  { path: ['disableAutoMode'], restrictive: 'disable' },
  { path: ['disableDeepLinkRegistration'], restrictive: 'disable' },
  { path: ['permissions', 'disableBypassPermissionsMode'], restrictive: 'disable' },
  { path: ['permissions', 'disableAutoMode'], restrictive: 'disable' },
  { path: ['permissions', 'blockReadsOutsideWorkingDirectories'], restrictive: true },
  { path: ['autoMode', 'classifyAllShell'], restrictive: true },
  { path: ['worktree', 'bgIsolation'], restrictive: 'worktree' },
  ...[
    'enableArtifact', 'enableWorkflows', 'syncThyroxAiSkills', 'syncThyroxAiPlugins', 'useAutoModeDuringPlan',
    'skipDangerousModePermissionPrompt', 'skipAutoPermissionPrompt', 'enableAllProjectMcpServers', 'channelsEnabled',
    'skipWebFetchPreflight', 'skipWorkflowUsageWarning', 'autoUploadSessions', 'remoteControlAtStartup',
  ].map(key => ({ path: [key], restrictive: false })),
  { path: ['remoteTools', 'allowUnattendedServing'], restrictive: false },
  { path: ['autoContinueAtUsageLimit'], restrictive: false },
  { path: ['attribution', 'sessionUrl'], restrictive: false },
  { path: ['crossSessionInbound'], restrictive: ['refuse', 'hold'] },
  { path: ['remoteControl', 'shareHostProfile'], restrictive: ['off', 'basic'] },
  { path: ['modelProposedGoals'], restrictive: ['disabled', 'alwaysAsk'] },
  { path: ['maxEffortLevel'], restrictive: EFFORT_LEVELS },
  { path: ['feedbackDrafts'], restrictive: 'off' },
  { path: ['availableModelsMatch'], restrictive: 'exact' },
  { path: ['askUserQuestionTimeout'], restrictive: 'never' },
  { path: ['dialogExpiry'], restrictive: 'never' },
  { path: ['sandbox', 'enabled'], restrictive: true },
  { path: ['sandbox', 'failIfUnavailable'], restrictive: true },
  ...['autoAllowBashIfSandboxed', 'allowUnsandboxedCommands', 'enableWeakerNestedSandbox', 'enableWeakerNetworkIsolation', 'allowAppleEvents']
    .map(key => ({ path: ['sandbox', key], restrictive: false })),
  { path: ['sandbox', 'network', 'allowManagedDomainsOnly'], restrictive: true },
  { path: ['sandbox', 'network', 'strictAllowlist'], restrictive: true },
  { path: ['sandbox', 'network', 'allowAllUnixSockets'], restrictive: false },
  { path: ['sandbox', 'network', 'allowLocalBinding'], restrictive: false },
  { path: ['sandbox', 'filesystem', 'allowManagedReadPathsOnly'], restrictive: true },
  { path: ['sandbox', 'filesystem', 'disabled'], restrictive: false },
  { path: ['sandbox', 'credentials', 'allowPlaintextInject'], restrictive: false },
  ...['streaming', 'presigned', 'sigv4a'].map(key => ({ path: ['sandbox', 'credentials', 'sigv4', key], restrictive: 'deny' })),
  { path: ['isolation', 'required'], restrictive: true },
  { path: ['isolation', 'persistHome'], restrictive: false },
]

/** `tVo`: lo que sólo se lee del escalón superior; los inferiores no lo aportan. */
export const TOP_TIER_ONLY_KEYS = [
  'apiKeyHelper', 'awsAuthRefresh', 'awsCredentialExport', 'gcpAuthRefresh', 'otelHeadersHelper', 'proxyAuthHelper',
  'forceLoginOrgUUID', 'forceLoginMethod', 'forceLoginGatewayUrl', 'gatewayInternalNetworks', 'parentSettingsBehavior',
  'env', 'modelPicker', ...POLICY_HELPER_KEYS, ...NON_POLICY_KEYS,
] as const

/** `X2o`: las rutas que un escalón inferior tampoco aporta. */
const TOP_TIER_ONLY_PATHS = [['permissions', 'defaultMode'], ['modelPicker', 'replaceBuiltInOptions']] as const
/** `Td`: las listas de permitidos, que se reemplazan en vez de unirse. */
const REPLACED_ALLOWLISTS = ['allowedMcpServers', 'availableModels', 'strictKnownMarketplaces', 'allowedChannelPlugins'] as const
/** `$y`: otras listas que entre escalones también se reemplazan. */
const REPLACED_TIER_LISTS = ['awsPairs', 'ripgrep'] as const

function isPlainObject(value: unknown): value is PolicyDocument {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const unique = <T>(values: T[]) => [...new Set(values)]

/** `Hd`: una copia de `modelPicker` que no comparte sus opciones. */
function copyModelPicker(picker: unknown): unknown {
  if (!isPlainObject(picker)) return picker
  const options = picker.options
  return { ...picker, ...(Array.isArray(options) && { options: options.map(option => (isPlainObject(option) ? { ...option } : option)) }) }
}

/** `S6`: la fusión de valores dentro de una misma fuente (fragmentos, capas). */
export function mergeManagedValue(target: unknown, source: unknown, key: string): unknown {
  if (key === 'modelPicker' && source !== undefined) return copyModelPicker(source)
  if (Array.isArray(target) && Array.isArray(source)) return key === 'fallbackModel' ? source : unique([...target, ...source])
  if ((key === 'extraKnownMarketplaces' || key === 'managedMcpServers') && isPlainObject(target) && isPlainObject(source)) {
    return { ...target, ...source }
  }
  return undefined
}

/** `Md`: entre escalones, la lista del que se funde va delante. */
function mergeListFirst(target: unknown, source: unknown, key: string): unknown {
  if (Array.isArray(target) && Array.isArray(source) && key !== 'fallbackModel') return unique([...source, ...target])
  return mergeManagedValue(target, source, key)
}

/** `xd`: el valor se reemplaza entero, con copia de sus listas. */
function replaceValue(target: unknown, source: unknown): unknown {
  if (source === undefined) return target
  if (Array.isArray(source)) return [...source]
  if (!isPlainObject(source)) return source
  return Object.fromEntries(Object.entries(source).map(([key, value]) => [key, Array.isArray(value) ? [...value] : value]))
}

/** `ks`: la fusión entre escalones. */
export function mergeTierValue(target: unknown, source: unknown, key: string): unknown {
  if ((REPLACED_ALLOWLISTS as readonly string[]).includes(key) || (REPLACED_TIER_LISTS as readonly string[]).includes(key)) {
    return replaceValue(target, source)
  }
  return mergeListFirst(target, source, key)
}

/** `Wy`: la fusión del escalón superior sobre la instantánea remota. */
export function mergeSlotValue(target: unknown, source: unknown, key: string): unknown {
  if ((REPLACED_ALLOWLISTS as readonly string[]).includes(key)) return replaceValue(target, source)
  return mergeListFirst(target, source, key)
}

/**
 * `_d`: cada clave que restringe toma el valor más restrictivo de todos los
 * escalones; si ninguno lo escribe y el primero tampoco, se retira. Las listas
 * de `strictPluginOnlyCustomization` se unen salvo que ya sea `true`.
 */
export function applyMostRestrictive(target: PolicyDocument, tiers: readonly PolicyDocument[]): void {
  const first = tiers[0]
  for (const { path, restrictive } of RESTRICTIVE_SETTINGS) {
    const order = (Array.isArray(restrictive) ? restrictive : [restrictive]) as readonly unknown[]
    const best = Math.min(...tiers.map(tier => order.indexOf(getAtPath(tier, path))).filter(index => index !== -1))
    if (Number.isFinite(best)) setAtPath(target, path, order[best])
    else if (getAtPath(first, path) === undefined && getAtPath(target, path) !== undefined) setAtPath(target, path, undefined)
  }
  if (target.strictPluginOnlyCustomization !== true) {
    const lists = unique(tiers.flatMap(tier => (Array.isArray(tier.strictPluginOnlyCustomization) ? tier.strictPluginOnlyCustomization : [])))
    if (lists.length > 0) target.strictPluginOnlyCustomization = lists
    else if (first?.strictPluginOnlyCustomization === undefined) delete target.strictPluginOnlyCustomization
  }
}

/** Un escalón inferior, sin lo que sólo aporta el superior y sin un sandbox de otra plataforma. */
function lowerTier(tier: PolicyDocument, keepAll: boolean, platform: Platform): PolicyDocument {
  const kept: PolicyDocument = keepAll ? { ...tier } : Object.fromEntries(Object.entries(tier).filter(([key]) => !(TOP_TIER_ONLY_KEYS as readonly string[]).includes(key)))
  if (!keepAll) for (const path of TOP_TIER_ONLY_PATHS) if (getAtPath(kept, path) !== undefined) setAtPath(kept, path, undefined)
  const platforms = getAtPath(kept.sandbox, ['enabledPlatforms'])
  if (Array.isArray(platforms) && platforms.includes(platform)) setAtPath(kept, ['sandbox', 'enabledPlatforms'], undefined)
  else if (platforms !== undefined) delete kept.sandbox
  return kept
}

/**
 * `jy`: el administrador resultante de los escalones, el primero el que ata.
 * Con `merge` y al menos dos escalones se funden todos; si no, el primero
 * gana y de los `extraCount` últimos sólo toma lo más restrictivo. Con la
 * instantánea remota primero, el escalón bajo ella conserva todas sus claves.
 */
export function mergeAdminTiers(
  tiers: readonly PolicyDocument[],
  mode: unknown,
  snapshotFirst: boolean,
  extraCount: number,
  platform: Platform,
): { admin: PolicyDocument | null; merged: boolean } {
  const top = tiers[0]
  if (!top) return { admin: null, merged: false }
  const { managedSourcesBehavior, ...withoutMode } = top
  const merging = mode === 'merge' && tiers.length >= 2
  if (!merging && extraCount === 0) return { admin: managedSourcesBehavior === undefined ? top : withoutMode, merged: false }
  const lower = tiers.slice(merging ? 1 : tiers.length - extraCount)
    .map((tier, index) => lowerTier(tier, merging && snapshotFirst && index === 0, platform))
  if (!merging) {
    applyMostRestrictive(withoutMode, [top, ...lower])
    return { admin: withoutMode, merged: false }
  }
  const admin: PolicyDocument = {}
  for (const tier of [...lower].reverse()) mergeWith(admin, tier, mergeTierValue)
  mergeWith(admin, withoutMode, snapshotFirst ? mergeSlotValue : mergeTierValue)
  applyMostRestrictive(admin, [top, ...lower])
  inheritModelOverrides(admin, [top, ...lower], snapshotFirst)
  return { admin, merged: true }
}
