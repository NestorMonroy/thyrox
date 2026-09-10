// Adaptación de @claude-code-how-works/app-host: src/state/taskSelectors.ts.
// Capa 0 (sin cita a paquete hermano) — porte verbatim, sin divergencias.

import type { AppState } from './AppStateStore.js';

export const selectTasks = (state: AppState) => state.tasks;
export const selectViewingAgentTaskId = (state: AppState) => state.viewingAgentTaskId;
export const selectFileHistory = (state: AppState) => state.fileHistory;
