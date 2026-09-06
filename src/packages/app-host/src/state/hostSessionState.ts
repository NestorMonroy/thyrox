// Adaptación de @claude-code-how-works/app-host: src/state/hostSessionState.ts.
// Capa 0 (sin cita a paquete hermano) — porte verbatim, sin divergencias.
//
// Importa el tipo `AppState` de './AppStateCompat.js', que NO se portó
// en este pase (no es capa 0). Queda colgante hasta que se adapte.

import type { AppState } from './AppStateCompat.js'

export type HostSessionState = Omit<
  AppState,
  'toolPermissionContext' | 'mcp' | 'plugins' | 'agentDefinitions'
>

export function projectHostSessionState(
  state: AppState,
): HostSessionState {
  const {
    toolPermissionContext: _toolPermissionContext,
    mcp: _mcp,
    plugins: _plugins,
    agentDefinitions: _agentDefinitions,
    ...hostState
  } = state

  return hostState
}
