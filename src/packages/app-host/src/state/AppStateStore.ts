// Adaptación de @claude-code-how-works/app-host: src/state/AppStateStore.ts.
// Capa 0 (sin cita a paquete hermano) — porte verbatim, sin divergencias.
//
// Reexporta desde './AppStateCompat.js', que NO se portó en este pase
// (no es capa 0: cita 29 veces a paquetes hermanos). Queda colgante
// hasta que ese archivo se adapte en un pase posterior.

// Deprecated compat facade. `AppState` remains available for existing UI
// consumers, but host/runtime ownership is moving behind session stores and
// runtime handles.
export type {
  AppState,
  AppStateStore,
  CompletionBoundary,
  FooterItem,
  SpeculationResult,
  SpeculationState,
} from './AppStateCompat.js'
export {
  getDefaultAppState,
  IDLE_SPECULATION_STATE,
} from './AppStateCompat.js'
