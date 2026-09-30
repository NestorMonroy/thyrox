/**
 * El alcance del modelo de respaldo: si un modelo pedido cae en acceso
 * temprano, en la bandera de respaldo del catálogo, en la lista propia de
 * modelos habilitados, o en ninguna de las anteriores.
 *
 * Porte de `vV` (`chunk-5t3x93y6.js`), con sus ayudantes `ahe`
 * (`chunk-ps9bsv64.js`), `MNe` y `Tle` (`chunk-k8zfq8xg.js`), `$5`
 * (`chunk-t6pwageh.js`) e `izn` con su comparación `$x`/`Jt`
 * (`chunk-ps9bsv64.js`, `chunk-s7awe3vb.js`), todas de 2.1.283.
 *
 * `Be` (la canonicalización previa a `$h`/`MNe`/`Tle`) reusa
 * `canonicalModelName`, con la divergencia ya declarada en `models.ts` —no
 * se repite aquí—; `$h` reusa `modelHasCapability`, ya portado en
 * `modelCapabilities.ts`; y `Jt`/`h` reusan `stripOneMillionSuffix`, del
 * mismo módulo.
 *
 * Dos variables de entorno, con criterios distintos declarados:
 * - `ANTHROPIC_DEFAULT_FABLE_MODEL` (`$5`) se lee con su nombre de origen,
 *   sin el prefijo `THYROX_`: es la misma convención `ANTHROPIC_DEFAULT_*_MODEL`
 *   que este árbol ya reusa tal cual para Opus/Sonnet/Haiku
 *   (`provider/src/model/modelSupportOverrides.ts`, `provider/src/model.ts`)
 *   — no es propia de thyrox, es la del proveedor.
 * - `THYROX_CODE_MODEL_SCOPE_LISTED_MODELS` (sustituto de `X()`, que en la
 *   fuente lee la bandera de GrowthBook `tengu_loggia_roster`) sí lleva el
 *   prefijo: no hay cliente de GrowthBook en este árbol (mismo motivo que
 *   `featureFlags.ts`), y la lista de modelos que antes empujaba un panel
 *   remoto ahora es un parámetro propio de la instalación, no un valor
 *   compartido con el proveedor.
 */
import { modelHasCapability, stripOneMillionSuffix } from './modelCapabilities.ts'
import { canonicalModelName } from './models.ts'

export type ModelScope = 'eap' | 'catalog_flag' | 'gb_listed' | 'other'

const LISTED_MODELS_ENV = 'THYROX_CODE_MODEL_SCOPE_LISTED_MODELS'

/** `ahe`: el sufijo de acceso temprano, con o sin corchete de contexto. */
export function hasEapSuffix(model: string): boolean {
  return /-eap($|\[)/i.test(model)
}

/** `MNe`: sólo el prefijo canónico de la familia fable. */
export function isFableFamily(canonicalModel: string): boolean {
  return canonicalModel.startsWith('claude-fable-')
}

/**
 * `Tle`: si la mitigación de Fable 5 está activa para `canonicalModel`. La
 * consulta servida (vía `$h`) manda; sin ella, sólo `claude-mythos-5` la
 * activa por defecto.
 */
export function fable5MitigationsActive(canonicalModel: string, requestedModel: string): boolean {
  const served = modelHasCapability(canonicalModel, 'fable_5_mitigations', requestedModel)
  if (served !== undefined) return served
  return canonicalModel === 'claude-mythos-5'
}

/**
 * `$5`: si `requestedModel` es el modelo fijado por `ANTHROPIC_DEFAULT_FABLE_MODEL`,
 * ignorando el sufijo `[1m]` en cualquiera de los dos lados.
 */
export function defaultFableModelMatches(requestedModel: string): boolean {
  const pinned = process.env.ANTHROPIC_DEFAULT_FABLE_MODEL
  if (!pinned) return false
  return stripOneMillionSuffix(requestedModel) === stripOneMillionSuffix(pinned)
}

/** `$x`: dos identificadores son el mismo modelo, sin distinguir mayúsculas ni `[1m]`. */
export function modelIdsEquivalent(a: string, b: string): boolean {
  return stripOneMillionSuffix(a).toLowerCase() === stripOneMillionSuffix(b).toLowerCase()
}

/**
 * `X()`: la lista de modelos habilitados por `THYROX_CODE_MODEL_SCOPE_LISTED_MODELS`,
 * separados por coma. Sustituye la bandera de GrowthBook de la fuente —ver
 * el docstring del módulo—; sin la variable, la lista está vacía.
 */
export function listedModelIdsFromEnv(): string[] {
  return (process.env[LISTED_MODELS_ENV] ?? '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean)
}

/** `izn`: si `requestedModel` coincide con alguno de `listedModelIdsFromEnv()`. */
export function isListedModel(requestedModel: string): boolean {
  return listedModelIdsFromEnv().some(listed => modelIdsEquivalent(requestedModel, listed))
}

/**
 * `vV`: clasifica `requestedModel`. El acceso temprano manda sobre todo;
 * después, la bandera de respaldo del catálogo sólo cuenta si el modelo no
 * es de la familia fable, no tiene su mitigación activa y no es el modelo
 * fable fijado por el entorno; por último, la lista propia de modelos
 * habilitados.
 */
export function classifyModelScope(requestedModel: string): ModelScope {
  if (hasEapSuffix(requestedModel)) return 'eap'
  const canonicalModel = canonicalModelName(requestedModel)
  if (
    modelHasCapability(canonicalModel, 'refusal_fallback', requestedModel) &&
    !isFableFamily(canonicalModel) &&
    !fable5MitigationsActive(canonicalModel, requestedModel) &&
    !defaultFableModelMatches(requestedModel)
  ) {
    return 'catalog_flag'
  }
  if (isListedModel(requestedModel)) return 'gb_listed'
  return 'other'
}
