// Adaptación de @claude-code-how-works/app-host: src/state/pluginSelectors.ts.
// Capa 0 (sin cita a paquete hermano) — porte verbatim, sin divergencias.

import type { AppState } from './AppStateStore.js';

export const selectPlugins = (state: AppState) => state.plugins;
export const selectAgentDefinitions = (state: AppState) => state.agentDefinitions;
