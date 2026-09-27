// Canonical owner is @thyrox/permission/permissionTypes.
export * from '@thyrox/permission/permissionTypes'
// Nombres de valor generados por src/verify/expandStarShims.ts — `bun build` no
// los ve a través de un `export *` externo cuando el shim también es entrada.
export { EXTERNAL_PERMISSION_MODES, PERMISSION_MODES } from '@thyrox/permission/permissionTypes'
