/**
 * Si el modo rápido queda encendido para un modelo, como funciones puras:
 * sin leer `process.env` ni el config global, todo lo que necesitan llega
 * por parámetro. Porte de `chunk-t6pwageh.js` (2.1.283).
 */

/** Lo que `Yl` lee de la sesión: la preferencia del usuario. */
export type FastModePreferenceSettings = {
  fastMode?: boolean
  fastModePerSessionOptIn?: boolean
}

/** El origen `policySettings`, tal como `he("policySettings")` lo devolvía. */
export type FastModePolicySettings = {
  fastModePerSessionOptIn?: boolean
}

/** El origen `flagSettings`, tal como `he("flagSettings")` lo devolvía. */
export type FastModeFlagSettings = {
  fastMode?: boolean
}

/**
 * `Yl`: si `settings.fastMode` no es `true`, no hay preferencia. Sin
 * opt-in por sesión, la bandera basta. Con opt-in, la política puede
 * prohibirlo; si no lo prohíbe, decide `flagSettings.fastMode`.
 */
export function fastModePreferenceEnabled(
  settings: FastModePreferenceSettings,
  policySettings: FastModePolicySettings | undefined,
  flagSettings: FastModeFlagSettings | undefined,
): boolean {
  if (settings.fastMode !== true) return false
  if (!settings.fastModePerSessionOptIn) return true
  if (policySettings?.fastModePerSessionOptIn === true) return false
  return flagSettings?.fastMode === true
}

/**
 * El contexto que `shouldEnableFastModeForModel` y `resolveFastModeForModel`
 * reciben en vez de leer el proceso: `fastModeEnabled` es `mo()`,
 * `isAvailableFor` es `Bk`, `supportsFastMode` es `qy`, `remoteSurface` es
 * `Dt()` y `preferenceEnabled` es `Yl(Je())` ya resuelto por el caller.
 */
export type FastModeSelectionContext = {
  fastModeEnabled: boolean
  remoteSurface: boolean
  supportsFastMode: (model: string | null) => boolean
  isAvailableFor: (model: string | null) => boolean
  preferenceEnabled: boolean
}

/**
 * `Ndn`: exige el modo habilitado, la disponibilidad y el soporte del
 * modelo, en ese orden, y por último la preferencia ya resuelta.
 */
export function shouldEnableFastModeForModel(model: string | null, context: FastModeSelectionContext): boolean {
  if (!context.fastModeEnabled) return false
  if (!context.isAvailableFor(model)) return false
  if (!context.supportsFastMode(model)) return false
  return context.preferenceEnabled
}

/**
 * `oA`: en una superficie remota se conserva el valor previo (con modelo,
 * sólo si lo soporta); en local, sin soporte se apaga, y si no, se
 * conserva el valor previo o lo enciende la preferencia.
 */
export function resolveFastModeForModel(
  model: string | null,
  previousValue: boolean | undefined,
  context: FastModeSelectionContext,
): boolean {
  if (context.remoteSurface) {
    if (model === null) return !!previousValue
    return !!previousValue && context.supportsFastMode(model)
  }
  if (!context.supportsFastMode(model)) return false
  return !!previousValue || shouldEnableFastModeForModel(model, context)
}
