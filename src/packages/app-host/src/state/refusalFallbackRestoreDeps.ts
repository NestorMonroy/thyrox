/**
 * Compone las dependencias reales de `subscribeRefusalFallbackReset` /
 * `applyRefusalFallbackRestore` (`./refusalFallbackRestore.ts`) a partir de
 * lo que este árbol ya porta: el modo rápido (`@thyrox/provider/fastMode.js`),
 * el canal remoto propio del host (`./surfaceCapabilities.ts`), el registro
 * de eventos (`@thyrox/local-observability`), el override del modelo del
 * bucle principal (`../bootstrap/state.ts`) y el alcance del modelo (`vV`,
 * `@thyrox/agent/modelScope.js`).
 *
 * DIVERGENCIA DECLARADA: la pieza real de `resolveFastMode` es
 * `resolveFastModeForModel` (`oA`, `chunk-t6pwageh.js`,
 * `provider/src/fastModeSelection.ts`), pero `provider/package.json` no
 * expone ese archivo como subpath propio (medido: `Bun.resolveSync` y
 * `require.resolve` fallan los dos contra
 * `@thyrox/provider/fastModeSelection.js`), y ese `package.json` queda
 * fuera de los archivos que el ítem R-2d nombra. Se reimplementa aquí su
 * misma lógica —y la de su ayudante `shouldEnableFastModeForModel`— contra
 * un `FastModeContext` estructural, alimentado por
 * `processFastModeSelectionContext()`, que sí exporta `fastMode.ts`.
 */
import { isFastModeEnabled, processFastModeSelectionContext } from '@thyrox/provider/fastMode.js'
import type { ModelSetting } from '@thyrox/provider/model.js'
import { classifyModelScope } from '@thyrox/agent/modelScope'
import { logEvent } from '@thyrox/local-observability'

import { setMainLoopModelOverride } from '../bootstrap/state.js'
import { hasRemoteControlChannel } from './surfaceCapabilities.js'
import type { RefusalFallbackRestoreDeps } from './refusalFallbackRestore.js'

/** Forma estructural de `FastModeSelectionContext` — ver DIVERGENCIA DECLARADA. */
export type FastModeContext = {
  fastModeEnabled: boolean
  remoteSurface: boolean
  supportsFastMode: (model: string | null) => boolean
  isAvailableFor: (model?: string | null) => boolean
  preferenceEnabled: boolean
}

/** `Ndn`: el modo habilitado, disponible y soportado, y por último la preferencia. */
export function shouldEnableFastModeForModel(model: string | null, context: FastModeContext): boolean {
  if (!context.fastModeEnabled) return false
  if (!context.isAvailableFor(model)) return false
  if (!context.supportsFastMode(model)) return false
  return context.preferenceEnabled
}

/** `oA`: en superficie remota se conserva el valor previo; en local, sin soporte se apaga. */
export function resolveFastMode(
  model: ModelSetting,
  previousValue: boolean | undefined,
  context: FastModeContext,
): boolean {
  if (context.remoteSurface) {
    if (model === null) return !!previousValue
    return !!previousValue && context.supportsFastMode(model)
  }
  if (!context.supportsFastMode(model)) return false
  return !!previousValue || shouldEnableFastModeForModel(model, context)
}

/** Las piezas reales del host, listas para `subscribeRefusalFallbackReset`/`applyRefusalFallbackRestore`. */
export function createRefusalFallbackRestoreDeps(): RefusalFallbackRestoreDeps {
  return {
    fastModeEnabled: isFastModeEnabled,
    resolveFastMode: (model, fastMode) => resolveFastMode(model, fastMode, processFastModeSelectionContext()),
    hasRemoteControlChannel,
    logEvent,
    overrideMainLoopModel: setMainLoopModelOverride,
    modelScope: model => classifyModelScope(model ?? ''),
  }
}
