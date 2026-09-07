/**
 * Porte fiel de `ccnmt: packages/permission/src/host.ts` (paquete
 * `permission`, licencia UNLICENSED — reimplementación, no copia). Porte
 * COMPLETO: las dos funciones exportadas de la fuente —
 * `installPermissionHostBindings` y `getPermissionHostBindings` — están
 * ambas presentes.
 *
 * Sin divergencias.
 */
import type { PermissionHostBindings } from './contracts.js'
import { HostBindingsError } from './errors.js'

let permissionHostBindings: PermissionHostBindings | null = null

export function installPermissionHostBindings(bindings: PermissionHostBindings): void {
  permissionHostBindings = bindings
}

export function getPermissionHostBindings(): PermissionHostBindings {
  if (!permissionHostBindings) {
    throw new HostBindingsError(
      'Permission host bindings have not been installed. Install host bindings before using @thyrox/permission runtime APIs.',
    )
  }
  return permissionHostBindings
}
