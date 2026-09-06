// Adaptación de @claude-code-how-works/app-host: src/state/teamSelectors.ts.
// Capa 0 (sin cita a paquete hermano) — porte verbatim, sin divergencias.

import type { AppState } from './AppStateStore.js';

export const selectTeamContext = (state: AppState) => state.teamContext;
