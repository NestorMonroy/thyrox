/**
 * Porte fiel de `ccnmt: packages/command-runtime/src/contracts.ts` (paquete
 * `command-runtime`, licencia UNLICENSED — reimplementación, no copia).
 * Porte COMPLETO: los dos tipos exportados de la fuente — `CommandLike` y
 * `CommandRegistryHostBindings` — están ambos presentes, con los mismos
 * campos y las mismas firmas de método.
 *
 * `CommandLike` es deliberadamente MÁS ANGOSTO que `Command`/`CommandBase`
 * de `./types.ts` (hermano de este archivo, ya portado): es el contrato
 * mínimo que `api.ts`/`host.ts` necesitan para el binding genérico de
 * registro de comandos, no la forma completa de un comando. No se
 * reutiliza `Command` de `types.ts` aquí — son dos tipos con propósitos
 * distintos, igual que en la fuente.
 *
 * `CommandRegistryHostBindings` declara seis métodos
 * (`internalOnlyCommands`, `remoteSafeCommands`, `bridgeSafeCommands`,
 * `isBridgeSafeCommand`, `filterCommandsForRemoteMode`,
 * `formatDescriptionWithSource`) que NINGUNA función de `api.ts` invoca
 * hoy — son parte del contrato de bindings que instala el host, no de la
 * API pública que este paquete expone. Se portan igual: el tipo es el
 * contrato completo que un host real tendría que satisfacer al llamar
 * `installCommandRegistryHostBindings`, y recortarlo aquí produciría un
 * tipo que no coincide con lo que la fuente exige a sus implementadores.
 */
export type CommandLike = {
  name: string
  aliases?: string[]
  type?: string
  source?: string
  loadedFrom?: string
  disableModelInvocation?: boolean
}

export type CommandRegistryHostBindings<TCommand extends CommandLike> = {
  getCommands: (cwd: string) => Promise<TCommand[]>
  clearCommandMemoizationCaches: () => void
  clearCommandsCache: () => void
  getCommandName: (command: TCommand) => string
  isCommandEnabled: (command: TCommand) => boolean
  builtInCommandNames: () => Set<string>
  findCommand: (
    commandName: string,
    commands: TCommand[],
  ) => TCommand | undefined
  hasCommand: (commandName: string, commands: TCommand[]) => boolean
  getCommand: (commandName: string, commands: TCommand[]) => TCommand
  getSkillToolCommands: (cwd: string) => Promise<TCommand[]>
  getSlashCommandToolSkills: (cwd: string) => Promise<TCommand[]>
  getMcpSkillCommands: (mcpCommands: readonly TCommand[]) => readonly TCommand[]
  internalOnlyCommands: () => readonly TCommand[]
  remoteSafeCommands: () => Set<TCommand>
  bridgeSafeCommands: () => Set<TCommand>
  isBridgeSafeCommand: (command: TCommand) => boolean
  filterCommandsForRemoteMode: (commands: TCommand[]) => TCommand[]
  formatDescriptionWithSource: (command: TCommand) => string
}
