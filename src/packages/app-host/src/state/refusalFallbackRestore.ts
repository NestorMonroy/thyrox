/**
 * Lo que hace la aplicación cuando un cambio de sesión deshace el modelo de
 * respaldo por rechazo: devuelve al estado el modelo que regía, resuelve de
 * nuevo el modo rápido para ese modelo y deja constancia del reinicio.
 *
 * Porte de `wt`, `Pyt` y `b8r` (`chunk-6ff16z73.js`) y de `sA`
 * (`chunk-t6pwageh.js`) de 2.1.283. Las decisiones que dependen del modo
 * rápido (`mo`, `oA`), del canal remoto (`Ea`) y del alcance del modelo
 * (`vV`) llegan como dependencias.
 */
import type { ModelSetting } from '@thyrox/provider/model.js'

import { onSessionSwitch, type RefusalFallbackRestore } from '../bootstrap/state.js'

/** Los tres campos del estado de la aplicación que una restauración reescribe. */
export type RestorableAppState = {
  mainLoopModel: ModelSetting
  mainLoopModelForSession: ModelSetting
  fastMode?: boolean
}

export type AppStateSetter<S extends RestorableAppState> = (updater: (previous: S) => S) => void

export type RefusalFallbackRestoreDeps = {
  /** `mo`. */
  fastModeEnabled: () => boolean
  /** `oA`: el modo rápido que corresponde a `model` partiendo del vigente. */
  resolveFastMode: (model: ModelSetting, fastMode: boolean | undefined) => boolean
  /** `Ea`. */
  hasRemoteControlChannel: () => boolean
  logEvent: (name: string, metadata: Record<string, string | boolean>) => void
  /** `mp`. */
  overrideMainLoopModel: (model: ModelSetting | undefined) => void
  /** `vV`: de dónde sale el permiso del modelo de respaldo. */
  modelScope: (model: ModelSetting) => string
}

/** `sA`: avisa sólo cuando el modo rápido cambia de valor. */
export function reportFastModeToggle(
  previous: boolean | undefined,
  next: boolean,
  deps: Pick<RefusalFallbackRestoreDeps, 'logEvent' | 'hasRemoteControlChannel'>,
): void {
  if (!!previous === next) return
  deps.logEvent('tengu_fast_mode_toggled', {
    enabled: next,
    source: next ? 'model_switch_restore' : 'model_switch_downgrade',
    remote: deps.hasRemoteControlChannel(),
  })
}

/**
 * `wt`. El modo rápido se resuelve contra el modelo que vuelve a regir: el
 * override, si lo hubo; si no, el de la sesión; si no, el del estado. Si nada
 * cambia, el estado se devuelve intacto para no provocar un render.
 */
export function applyRefusalFallbackRestore<S extends RestorableAppState>(
  restore: RefusalFallbackRestore,
  setAppState: AppStateSetter<S>,
  deps: RefusalFallbackRestoreDeps,
): void {
  let previousFastMode: boolean | undefined
  let nextFastMode: boolean | undefined
  setAppState(state => {
    const model = restore.overrideValue ?? restore.forSessionValue ?? restore.appStateModel
    const fastMode = deps.fastModeEnabled() ? deps.resolveFastMode(model, state.fastMode) : !!state.fastMode
    previousFastMode = state.fastMode
    nextFastMode = fastMode
    const unchanged =
      state.mainLoopModel === restore.appStateModel &&
      state.mainLoopModelForSession === restore.forSessionValue &&
      fastMode === !!state.fastMode
    if (unchanged) return state
    return { ...state, mainLoopModel: restore.appStateModel, mainLoopModelForSession: restore.forSessionValue, fastMode }
  })
  if (nextFastMode !== undefined) reportFastModeToggle(previousFastMode, nextFastMode, deps)
  deps.overrideMainLoopModel(restore.overrideValue)
}

/** `Pyt`: aplica cada restauración al estado y registra el reinicio con su motivo. */
export function subscribeRefusalFallbackReset<S extends RestorableAppState>(
  setAppState: AppStateSetter<S>,
  deps: RefusalFallbackRestoreDeps,
): () => void {
  return onSessionSwitch((_sessionId, reason, restore) => {
    if (!restore) return
    applyRefusalFallbackRestore(restore, setAppState, deps)
    deps.logEvent('tengu_refusal_fallback_latch_reset', {
      source: reason,
      restored_to_explicit_override: restore.restoredToExplicitOverride,
      model_scope: deps.modelScope(restore.fallbackModel),
    })
  })
}

/** `b8r`: para quien sólo necesita saber que el modelo volvió al previo. */
export function onRefusalFallbackRestored(callback: () => void): () => void {
  return onSessionSwitch((_sessionId, _reason, restore) => {
    if (restore) callback()
  })
}
