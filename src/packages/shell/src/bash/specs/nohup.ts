/**
 * Porte fiel de `ccnmt: packages/shell/src/bash/specs/nohup.ts` — spec Fig
 * del comando `nohup` (ejecuta un comando inmune a hangups).
 */
import type { CommandSpec } from '../registry.js'

const nohup: CommandSpec = {
  name: 'nohup',
  description: 'Ejecutar un comando inmune a hangups',
  args: {
    name: 'command',
    description: 'Comando a ejecutar con nohup',
    isCommand: true,
  },
}

export default nohup
