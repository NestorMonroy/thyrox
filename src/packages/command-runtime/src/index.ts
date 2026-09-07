/**
 * Porte fiel de `ccnmt: packages/command-runtime/src/index.ts` (paquete
 * `command-runtime`, licencia UNLICENSED — reimplementación, no copia).
 * Porte COMPLETO de la fuente: los mismos re-exports, en el mismo orden.
 * Los seis hermanos que cita (`contracts.js`, `host.js`, `api.js`,
 * `errors.js`) ya estaban portados antes de este pase.
 */
export type { CommandLike, CommandRegistryHostBindings } from './contracts.js'
export {
  getCommandRegistryHostBindings,
  installCommandRegistryHostBindings,
} from './host.js'
export {
  builtInCommandNames,
  clearCommandsCache,
  findCommand,
  getCommand,
  getCommandName,
  getCommands,
  getMcpSkillCommands,
  getSkillToolCommands,
  getSlashCommandToolSkills,
  hasCommand,
  isCommandEnabled,
} from './api.js'
export * from './errors.js'
