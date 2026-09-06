// Adaptación de @claude-code-how-works/app-host: src/state/mcpSelectors.ts.
// Capa 0 (sin cita a paquete hermano) — porte verbatim, sin divergencias.

import type { AppState } from './AppStateStore.js';

export const selectMcp = (state: AppState) => state.mcp;
export const selectElicitation = (state: AppState) => state.elicitation;
