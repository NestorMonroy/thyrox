// Canonical owner is @thyrox/config/commonConstants.
export * from '@thyrox/config/commonConstants.js'
// Nombres de valor generados por src/verify/expandStarShims.ts — `bun build` no
// los ve a través de un `export *` externo cuando el shim también es entrada.
export { getLocalISODate, getLocalMonthYear, getSessionStartDate } from '@thyrox/config/commonConstants.js'
