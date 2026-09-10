// Adaptación de @claude-code-how-works/app-host: src/runtime/appStateCompatShim.ts.
// Capa 0 (sin cita a paquete hermano) — porte verbatim, sin divergencias.
//
// El `require('../state/AppStateCompat.js')` referencia un archivo que
// NO se portó en este pase (no es capa 0: cita 29 veces a paquetes
// hermanos — @claude-code-how-works/config, /permission, /tool-registry,
// /bridge, /command-runtime, /mcp-runtime, /repl). Queda colgante hasta
// que ese archivo se adapte en un pase posterior.

// V7 §7.2 — lazy require() shim so app-host does not statically import
// src/state/AppStateCompat at module level. getDefaultAppState is called
// once during runtime-handle construction, so a require() hop is fine.

export type AppState = unknown

export function getDefaultAppState(): unknown {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('../state/AppStateCompat.js') as {
    getDefaultAppState: () => unknown
  }
  return mod.getDefaultAppState()
}
