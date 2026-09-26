/**
 * command-runtime host. Los bindings instalados se guardan como `unknown`
 * porque el genérico `TCommand` se fija en dos sitios distintos —al
 * instalar y al leer—; la lectura reafirma el tipo con el genérico que
 * invoca quien llama. Seguro en la práctica: sólo hay una instalación
 * activa a la vez y todo el árbol comparte el mismo `TCommand` real.
 */
import type { CommandLike, CommandRegistryHostBindings } from './contracts.js'
import { HostBindingsError } from './errors.js'

let commandRegistryHostBindings: unknown = null

export function installCommandRegistryHostBindings<
  TCommand extends CommandLike,
>(bindings: CommandRegistryHostBindings<TCommand>): void {
  commandRegistryHostBindings = bindings
}

export function hasCommandRegistryHostBindings(): boolean {
  return commandRegistryHostBindings !== null
}

export function getCommandRegistryHostBindings<
  TCommand extends CommandLike,
>(): CommandRegistryHostBindings<TCommand> {
  if (!commandRegistryHostBindings) {
    throw new HostBindingsError(
      'Command registry host bindings have not been installed. Install host bindings before using @thyrox/command-runtime runtime APIs.',
    )
  }
  return commandRegistryHostBindings as CommandRegistryHostBindings<TCommand>
}
