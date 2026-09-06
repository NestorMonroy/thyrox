// Adaptación de @claude-code-how-works/app-host: src/state/uiSelectors.ts.
// Capa 0 (sin cita a paquete hermano) — porte verbatim, sin divergencias.

import type { AppState } from './AppStateStore.js';

export const selectShowExpandedTodos = (state: AppState) => state.expandedView === 'tasks';
export const selectUltraplanPendingChoice = (state: AppState) => state.ultraplanPendingChoice;
export const selectUltraplanLaunchPending = (state: AppState) => state.ultraplanLaunchPending;
