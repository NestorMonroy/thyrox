/**
 * Qué hace la sesión con los mensajes que otras sesiones le mandan
 * (`crossSessionInbound`) y cuándo tiene que decidir si un mensaje es propio.
 *
 * La política sale de las capas de settings: la primera de policy, flag y
 * user que la declare; los settings del repo (local, project) sólo pueden
 * endurecerla; y un valor inválido en algún archivo retiene (`hold`) si nada
 * decidió algo más estricto.
 *
 * Porte de `I`, `B`, `O`, `f`, `zje`, `C`, `S` y `unr` (`chunk-dv9ctjss.js`)
 * y de `V1` y `NL` (`chunk-379zyrv7.js`) de 2.1.283.
 */
import { isSettingSourceEnabled } from '@thyrox/config/constants'
import { getSettingsForSource } from '@thyrox/config/settings'
import { getSettingsWithAllErrors } from '@thyrox/config/settings/allErrors'

import { logForDebugging } from '../debug.ts'

export type InboundPolicyValue = 'accept' | 'hold' | 'refuse'
export type InboundPolicyDecider = 'policySettings' | 'flagSettings' | 'userSettings' | 'repoSettings' | 'invalidSetting'

/** `f`: cuanto mayor, más estricta. */
const LEVELS: Record<InboundPolicyValue, number> = { accept: 0, hold: 1, refuse: 2 }
const EXPLICIT_SOURCES = ['policySettings', 'flagSettings', 'userSettings'] as const
const REPO_SOURCES = ['localSettings', 'projectSettings'] as const
/** `N5n`. */
const POLICY_PATH = 'crossSessionInbound'

/** `NL`: los modos de permisos que el buzón conoce. */
export const PERMISSION_MODES: ReadonlySet<string> = new Set(['acceptEdits', 'auto', 'bypassPermissions', 'default', 'dontAsk', 'plan'])

export interface InboundPolicyReaders {
  isSourceEnabled: (source: string) => boolean
  /** El `crossSessionInbound` ya validado de una fuente, o `undefined`. */
  settingFor: (source: string) => unknown
  /** `B`: si la validación avisó de un `crossSessionInbound` inválido. */
  hasInvalidSettingWarning: () => boolean
}

function isPolicyValue(value: unknown): value is InboundPolicyValue {
  return value === 'accept' || value === 'hold' || value === 'refuse'
}

export const processInboundPolicyReaders: InboundPolicyReaders = {
  isSourceEnabled: source => isSettingSourceEnabled(source),
  settingFor: source => (getSettingsForSource(source as Parameters<typeof getSettingsForSource>[0]) as Record<string, unknown> | null)?.[POLICY_PATH],
  hasInvalidSettingWarning: () =>
    (getSettingsWithAllErrors().errors as Array<{ path?: string; severity?: string; statusOnly?: boolean }>).some(
      error => error.path === POLICY_PATH && error.severity === 'warning' && !error.statusOnly,
    ),
}

/** `I`: el valor de la política y quién lo decidió. */
export function resolveInboundPolicy(readers: InboundPolicyReaders = processInboundPolicyReaders): {
  value: InboundPolicyValue | undefined
  decidedBy: InboundPolicyDecider | undefined
} {
  let value: InboundPolicyValue | undefined
  let decidedBy: InboundPolicyDecider | undefined
  for (const source of EXPLICIT_SOURCES) {
    if (!readers.isSourceEnabled(source)) continue
    const declared = readers.settingFor(source)
    if (isPolicyValue(declared)) {
      value = declared
      decidedBy = source
      break
    }
  }
  for (const source of REPO_SOURCES) {
    if (!readers.isSourceEnabled(source)) continue
    const declared = readers.settingFor(source)
    if (!isPolicyValue(declared)) continue
    if (LEVELS[declared] > LEVELS[value ?? 'accept']) {
      value = declared
      decidedBy = 'repoSettings'
    } else if (declared !== 'accept' && value !== undefined && LEVELS[declared] === LEVELS[value] && decidedBy !== 'policySettings') {
      decidedBy = 'repoSettings'
    }
  }
  if (LEVELS[value ?? 'accept'] < LEVELS.hold && readers.hasInvalidSettingWarning()) {
    value = 'hold'
    decidedBy = 'invalidSetting'
  }
  return { value, decidedBy }
}

/** `zje`: sólo el valor. */
export function inboundPolicyValue(readers: InboundPolicyReaders = processInboundPolicyReaders): InboundPolicyValue | undefined {
  return resolveInboundPolicy(readers).value
}

/** `O`: de dónde salió la decisión, en el vocabulario de la telemetría. */
export function inboundPolicyOrigin(decidedBy: InboundPolicyDecider | undefined): 'managed-setting' | 'repo-setting' | 'invalid-setting' | 'explicit-setting' {
  switch (decidedBy) {
    case 'policySettings':
      return 'managed-setting'
    case 'repoSettings':
      return 'repo-setting'
    case 'invalidSetting':
      return 'invalid-setting'
    default:
      return 'explicit-setting'
  }
}

export type PermissionModeState = { mode: string; isBypassPermissionsModeAvailable?: boolean }

/** `C`: el modo de permisos actual; sin getter, o si lanza, no hay modo (y se retiene). */
export function currentPermissionMode(getCurrentMode: (() => PermissionModeState) | null, log: (message: string) => void = message => logForDebugging(message)): PermissionModeState | null {
  if (getCurrentMode === null) {
    log('[cross-session-inbound] permission-mode getter not wired (fail-closed → hold)')
    return null
  }
  try {
    return getCurrentMode()
  } catch (error) {
    log(`[cross-session-inbound] mode getter threw (${error instanceof Error ? error.message : String(error)}; fail-closed → hold)`)
    return null
  }
}

/** `S`/`V1`: el modo es de la clase bypass. */
export function isBypassClassMode(state: PermissionModeState, nonInteractive: boolean): boolean {
  return state.mode === 'bypassPermissions' || (state.mode === 'plan' && state.isBypassPermissionsModeAvailable === true && !nonInteractive)
}

/** `unr`: sin política declarada y en modo bypass, un mensaje exige decidir si es propio. */
export function needsSelfSentVerdict(input: {
  policyValue: InboundPolicyValue | undefined
  getCurrentMode: (() => PermissionModeState) | null
  nonInteractive: boolean
  log?: (message: string) => void
}): boolean {
  if (input.policyValue !== undefined) return false
  const state = currentPermissionMode(input.getCurrentMode, input.log)
  if (state === null || !PERMISSION_MODES.has(state.mode)) return false
  return isBypassClassMode(state, input.nonInteractive)
}
