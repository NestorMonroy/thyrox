/**
 * Porte fiel de `ccnmt: packages/command-runtime/src/api.ts` (paquete
 * `command-runtime`, licencia UNLICENSED — reimplementación, no copia).
 * Porte COMPLETO: las 12 funciones exportadas de la fuente — `getCommands`,
 * `clearCommandMemoizationCaches`, `clearCommandsCache`, `getCommandName`,
 * `isCommandEnabled`, `builtInCommandNames`, `findCommand`, `hasCommand`,
 * `getCommand`, `getSkillToolCommands`, `getSlashCommandToolSkills` y
 * `getMcpSkillCommands` — están todas presentes, con la misma firma
 * (incluido el genérico `TCommand extends CommandLike` y el parámetro
 * `signal` que tres de ellas aceptan y NUNCA reenvían al host binding —
 * es exactamente lo que hace la fuente: el parámetro está en la firma
 * pública por compatibilidad de interfaz, sin efecto en el cuerpo).
 *
 * Sin divergencias: los tres imports (`./contracts.js`, `./host.js`) son
 * del mismo paquete y ya existen en este árbol (hermanos portados en este
 * mismo pase), así que van estáticos al top, sin `require()` diferido.
 * `clearCommandsCache` es la función que consume
 * `installPluginBindings.ts` (hermano en `@thyrox/app-host`) vía
 * `require('@thyrox/command-runtime/api.js')`.
 */
import type { CommandLike } from './contracts.js'
import { getCommandRegistryHostBindings } from './host.js'

export async function getCommands<TCommand extends CommandLike>(
  cwd: string,
  signal?: AbortSignal,
): Promise<TCommand[]> {
  // `signal` no se reenvía al host binding — mismo comportamiento que la
  // fuente: está en la firma pública por compatibilidad, sin efecto aquí.
  void signal
  return getCommandRegistryHostBindings<TCommand>().getCommands(cwd)
}

export function clearCommandMemoizationCaches(): void {
  getCommandRegistryHostBindings<CommandLike>().clearCommandMemoizationCaches()
}

export function clearCommandsCache(): void {
  getCommandRegistryHostBindings<CommandLike>().clearCommandsCache()
}

export function getCommandName<TCommand extends CommandLike>(command: TCommand): string {
  return getCommandRegistryHostBindings<TCommand>().getCommandName(command)
}

export function isCommandEnabled<TCommand extends CommandLike>(command: TCommand): boolean {
  return getCommandRegistryHostBindings<TCommand>().isCommandEnabled(command)
}

export function builtInCommandNames(): Set<string> {
  return getCommandRegistryHostBindings<CommandLike>().builtInCommandNames()
}

export function findCommand<TCommand extends CommandLike>(
  commandName: string,
  commands: TCommand[],
): TCommand | undefined {
  return getCommandRegistryHostBindings<TCommand>().findCommand(commandName, commands)
}

export function hasCommand<TCommand extends CommandLike>(
  commandName: string,
  commands: TCommand[],
): boolean {
  return getCommandRegistryHostBindings<TCommand>().hasCommand(commandName, commands)
}

export function getCommand<TCommand extends CommandLike>(
  commandName: string,
  commands: TCommand[],
): TCommand {
  return getCommandRegistryHostBindings<TCommand>().getCommand(commandName, commands)
}

export async function getSkillToolCommands<TCommand extends CommandLike>(
  cwd: string,
  signal?: AbortSignal,
): Promise<TCommand[]> {
  void signal
  return getCommandRegistryHostBindings<TCommand>().getSkillToolCommands(cwd)
}

export async function getSlashCommandToolSkills<TCommand extends CommandLike>(
  cwd: string,
  signal?: AbortSignal,
): Promise<TCommand[]> {
  void signal
  return getCommandRegistryHostBindings<TCommand>().getSlashCommandToolSkills(cwd)
}

export function getMcpSkillCommands<TCommand extends CommandLike>(
  mcpCommands: readonly TCommand[],
): readonly TCommand[] {
  return getCommandRegistryHostBindings<TCommand>().getMcpSkillCommands(mcpCommands)
}
