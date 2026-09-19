/**
 * Mide POR CONDUCTA cuál de las tres formas candidatas satisface el contrato
 * que `applySettingsChange` declara para su `setAppState`.
 *
 * Por qué una sonda y no razonar sobre las reglas: la asignabilidad de una
 * POSICIÓN DE PARÁMETRO depende de `strictFunctionTypes`, y la de un tipo sin
 * firma de índice a uno que la exige depende de si el destino es alias o
 * interfaz. Las dos son reglas que el compilador aplica y que un lector
 * reconstruye mal con facilidad. Aquí las decide `tsc`.
 *
 * `SettingsChangeTarget` se copia en vez de importarse porque
 * `config/settings/applySettingsChange.ts` no lo exporta — igual que en la
 * fuente. La copia es byte a byte la suya; si divergiera, la sonda mediría
 * otro contrato.
 */

// -- el contrato, copiado de config/settings/applySettingsChange.ts ----------
type SettingsChangeTarget = {
  toolPermissionContext: unknown
  settings: { effortLevel?: unknown }
  effortValue?: unknown
  [key: string]: unknown
}

type SetAppState<T> = (f: (prev: T) => T) => void

// -- caso 1: el stand-in de hoy — firma de índice desnuda --------------------
type BareIndex = { [key: string]: unknown }
declare const bareSetter: SetAppState<BareIndex>
// @ts-expect-error CASO 1 — si esta línea deja de fallar, el defecto se cerró
//   por otra vía y esta sonda ya no mide lo que declara.
const caso1: SetAppState<SettingsChangeTarget> = bareSetter

// -- caso 2: el stand-in ensanchado con las claves que el contrato exige -----
type WidenedStandIn = {
  toolPermissionContext: unknown
  settings: { effortLevel?: unknown }
  effortValue?: unknown
  [key: string]: unknown
}
declare const widenedSetter: SetAppState<WidenedStandIn>
const caso2: SetAppState<SettingsChangeTarget> = widenedSetter

// -- caso 3: sólo las dos claves requeridas, sin las opcionales --------------
type MinimalStandIn = {
  toolPermissionContext: unknown
  settings: { effortLevel?: unknown }
  [key: string]: unknown
}
declare const minimalSetter: SetAppState<MinimalStandIn>
const caso3: SetAppState<SettingsChangeTarget> = minimalSetter

// -- caso 4 (control de anulación): un tipo SIN firma de índice --------------
//   Es la forma del `AppState` real de app-host. Si pasa, ensanchar el
//   stand-in no es la única salida; si falla, la firma de índice es
//   obligatoria y el caso 3 es el mínimo.
type NoIndexSignature = {
  toolPermissionContext: unknown
  settings: { effortLevel?: unknown }
}
declare const noIndexSetter: SetAppState<NoIndexSignature>
//   MEDIDO: PASA. La premisa de que la firma de índice es obligatoria era
//   FALSA — TypeScript concede firma de índice IMPLÍCITA a un alias de tipo
//   de objeto, así que la ausencia de `[key: string]: unknown` no bloquea.
//   La primera versión de esta sonda lo declaró como fallo esperado y el
//   compilador respondió `TS2578: Unused '@ts-expect-error' directive`
//   (`outputs/rojo-caso4-expectativa-falsa.txt`), que es el control que
//   corrige la premisa.
//
//   Consecuencia: lo único que bloquea al caso 1 son las dos propiedades
//   REQUERIDAS ausentes, y el caso 3 es por tanto el arreglo mínimo.
const caso4: SetAppState<SettingsChangeTarget> = noIndexSetter

export { caso1, caso2, caso3, caso4 }

// -- caso 5: un tipo MAPEADO, que es la forma del `AppState` real -----------
//   Refina el caso 4. La premisa con que se escribió: la firma de índice
//   implícita que TypeScript concede a un alias de objeto literal **no** se
//   concedería a un tipo MAPEADO, y `AppState` de app-host es mapeado
//   (`DeepImmutable<{...}>`), así que ahí la firma sí bloquearía.
type DeepImmutableProbe<T> = { readonly [K in keyof T]: T[K] }
type MappedState = DeepImmutableProbe<{
  toolPermissionContext: unknown
  settings: { effortLevel?: unknown }
}>
declare const mappedSetter: SetAppState<MappedState>
//   MEDIDO: PASA, igual que el caso 4. La premisa era FALSA por segunda vez —
//   un tipo mapeado simple también recibe la firma de índice implícita.
//   Declarado como fallo esperado, el compilador respondió otra vez
//   `TS2578: Unused '@ts-expect-error' directive`.
//
//   Así que la forma del tipo NO es lo que bloquea el import estático de
//   `applySettingsChange` en app-host. Lo que bloquea, medido en
//   `.claude/workbench/divergencia-effortlevel-20260919T095642/`, es la
//   **regla de tipo débil**: con el argumento de tipo explícito, TypeScript
//   emite `TS2344: Type 'AppState' does not satisfy the constraint
//   'SettingsChangeTarget'` — un objetivo cuyas propiedades son todas
//   opcionales rechaza una fuente sin ninguna propiedad en común. Y sin el
//   argumento explícito, la inferencia cae al límite y el error es el
//   `TS2345` de covarianza del retorno.
const caso5: SetAppState<SettingsChangeTarget> = mappedSetter

export { caso5 }
