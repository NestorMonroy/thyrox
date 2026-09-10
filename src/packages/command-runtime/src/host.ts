/**
 * Porte fiel de `ccnmt: packages/command-runtime/src/host.ts` (paquete
 * `command-runtime`, licencia UNLICENSED — reimplementación, no copia).
 * Porte COMPLETO: las tres funciones exportadas de la fuente —
 * `installCommandRegistryHostBindings`, `hasCommandRegistryHostBindings`
 * y `getCommandRegistryHostBindings` — están todas presentes.
 *
 * El `as unknown as` en `installCommandRegistryHostBindings` ensancha
 * `TCommand` a `CommandLike` para el almacenamiento del singleton: el
 * patrón de host-binding guarda la base con el genérico borrado, y la
 * lectura ocurre a través del getter genérico, que vuelve a hacer el
 * cast hacia el tipo concreto que el llamador pide. Type-safe en la
 * práctica (mismo comentario que trae la fuente, traducido).
 *
 * `HostBindingsError` se importa de `./errors.ts` (hermano de este
 * archivo, ya presente en este paquete con la misma clase y el mismo
 * código `COMMAND_RUNTIME_HOST_BINDINGS_ERROR`).
 */
import type { CommandLike, CommandRegistryHostBindings } from './contracts.js'
import { HostBindingsError } from './errors.js'

let commandRegistryHostBindings: CommandRegistryHostBindings<CommandLike> | null = null

export function installCommandRegistryHostBindings<TCommand extends CommandLike>(
  bindings: CommandRegistryHostBindings<TCommand>,
): void {
  commandRegistryHostBindings = bindings as unknown as CommandRegistryHostBindings<CommandLike>
}

export function hasCommandRegistryHostBindings(): boolean {
  return commandRegistryHostBindings !== null
}

export function getCommandRegistryHostBindings<TCommand extends CommandLike>(): CommandRegistryHostBindings<TCommand> {
  if (!commandRegistryHostBindings) {
    throw new HostBindingsError(
      'Command registry host bindings have not been installed. Install host bindings before using @thyrox/command-runtime runtime APIs.',
    )
  }
  return commandRegistryHostBindings as CommandRegistryHostBindings<TCommand>
}
