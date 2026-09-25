// El contrato de los comandos vive en `@thyrox/agent/command.js`, que es la
// forma que la fuente declara. Este archivo lo había copiado reducido —campos
// `unknown`, un índice abierto, `Promise<unknown>`— y los comandos, escritos
// contra el contrato completo, no le asignaban (H-THYROX-176). Se re-exporta
// sólo como tipos: la dependencia mutua entre los dos paquetes no crea ciclo
// en tiempo de ejecución.
import type { CommandBase } from '@thyrox/agent/command.js'

export type {
  Command,
  CommandAvailability,
  CommandBase,
  CommandResultDisplay,
  LocalCommandCall,
  LocalCommandModule,
  LocalCommandResult,
  LocalJSXCommandCall,
  LocalJSXCommandContext,
  LocalJSXCommandModule,
  LocalJSXCommandOnDone,
  PromptCommand,
  ResumeEntrypoint,
} from '@thyrox/agent/command.js'

// Las dos funciones se quedan aquí: son código de ejecución, e importarlas de
// `agent` sí crearía el ciclo que el import de tipos evita. Son las mismas de
// `agent/command.ts`.
export function getCommandName(cmd: CommandBase): string {
  return cmd.userFacingName?.() ?? cmd.name
}

export function isCommandEnabled(cmd: CommandBase): boolean {
  return cmd.isEnabled?.() ?? true
}
