// Adaptación de @claude-code-how-works/app-host: src/state/permissionSelectors.ts.
// Capa 0 (sin cita a paquete hermano) — porte verbatim, sin divergencias.

import type { AppState } from './AppStateStore.js';

export const selectToolPermissionContext = (state: AppState) => state.toolPermissionContext;
export const selectPendingWorkerRequest = (state: AppState) => state.pendingWorkerRequest;
export const selectPendingSandboxRequest = (state: AppState) => state.pendingSandboxRequest;
export const selectWorkerSandboxPermissions = (state: AppState) => state.workerSandboxPermissions;
