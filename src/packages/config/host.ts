/**
 * Puerto de `ccnmt: packages/config/host.ts` (27 líneas fuente). No es uno de
 * los 15 del alcance — es la dependencia de hoja que `remote/index.ts`
 * necesita (`getConfigHostBindings`) como pieza central de su patrón
 * ports-and-adapters: sin dependencias propias fuera de `./contracts.ts` y
 * `./errors.ts` (ambas también hojas, portadas en este mismo pase), se porta
 * en el sitio en vez de bloquearse.
 *
 * Registro singleton de los host bindings de config. El host (app-host/cli)
 * los instala una vez al arrancar vía `installConfigHostBindings()`; el
 * resto de `@thyrox/config` los lee vía `getConfigHostBindings()` (lanza si
 * no están instalados) o `tryGetConfigHostBindings()` (devuelve `{}` — todas
 * las llamadas a un binding no instalado son opcionales por el tipo
 * `ConfigHostBindings`, así que un objeto vacío es un no-op seguro).
 */
import type { ConfigHostBindings } from './contracts.js'
import { HostBindingsError } from './errors.js'

let configHostBindings: ConfigHostBindings | null = null

export function installConfigHostBindings(bindings: ConfigHostBindings): void {
  configHostBindings = bindings
}

export function getConfigHostBindings(): ConfigHostBindings {
  if (!configHostBindings) {
    throw new HostBindingsError(
      'Config host bindings have not been installed. Install host bindings before using @claude-code-how-works/config runtime APIs.',
    )
  }
  return configHostBindings
}

/**
 * Accesor seguro que devuelve bindings vacíos si aún no se instalaron.
 * Se usa para efectos secundarios a nivel de módulo y rutas de código que
 * pueden correr antes de que termine el bootstrap del host. Toda llamada a
 * un binding debe usar `?.` — un binding ausente queda como no-op silencioso.
 */
export function tryGetConfigHostBindings(): ConfigHostBindings {
  return configHostBindings ?? {}
}
