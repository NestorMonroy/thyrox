// Canonical owner is @thyrox/tool-registry/diagnosticTracking.
export type * from '@thyrox/tool-registry/diagnosticTracking.js'
// Nombres de valor generados por src/verify/expandStarShims.ts — `bun build` no
// los ve a través de un `export *` externo cuando el shim también es entrada.
export { diagnosticTracker, DiagnosticTrackingService } from '@thyrox/tool-registry/diagnosticTracking.js'
