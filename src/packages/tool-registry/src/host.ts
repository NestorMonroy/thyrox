/**
 * Puerto de `ccnmt: packages/tool-registry/src/host.ts` (23 líneas,
 * 3 símbolos). El registro singleton de los host bindings del paquete.
 *
 * `getToolRegistryHostBindings()` LANZA si nadie los instaló, y es
 * deliberado: el binding que el registro más usa es el que decide qué
 * herramienta está denegada. Devolver un objeto vacío en silencio haría
 * que el filtro dejara pasar todo — lo contrario de fail-closed, y un
 * defecto que ningún conteo de elementos delataría.
 */
import type { ToolRegistryHostBindings } from './contracts.ts'
import { HostBindingsError } from './errors.ts'

let toolRegistryHostBindings: ToolRegistryHostBindings | null = null

export function installToolRegistryHostBindings(
  bindings: ToolRegistryHostBindings,
): void {
  toolRegistryHostBindings = bindings
}

export function hasToolRegistryHostBindings(): boolean {
  return toolRegistryHostBindings != null
}

export function getToolRegistryHostBindings(): ToolRegistryHostBindings {
  if (!toolRegistryHostBindings) {
    throw new HostBindingsError(
      'Tool registry host bindings have not been installed. Install host bindings before using @thyrox/tool-registry runtime APIs.',
    )
  }
  return toolRegistryHostBindings
}

/**
 * DIVERGENCIA DECLARADA (`porte-completo-no-parcial.md`): la fuente no trae
 * desinstalador. Aquí hace falta porque los bindings son un singleton de
 * módulo, y sin poder retirarlos el PRIMER juego que instale una suite
 * decide el resultado de todos los casos siguientes — el mismo motivo por
 * el que `api.ts` ya trae `__resetToolRegistryForTests`.
 *
 * No es una puerta de producción: se nombra con el prefijo que la declara
 * de prueba, y ningún módulo del paquete la llama fuera de un reset.
 */
export function __resetToolRegistryHostBindingsForTests(): void {
  toolRegistryHostBindings = null
}
