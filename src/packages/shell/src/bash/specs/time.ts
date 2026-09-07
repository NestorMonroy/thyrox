/**
 * Porte fiel de `ccnmt: packages/shell/src/bash/specs/time.ts` — spec Fig
 * del comando `time`.
 */
import type { CommandSpec } from '../registry.js'

const time: CommandSpec = {
  name: 'time',
  description: 'Cronometrar un comando',
  args: {
    name: 'command',
    description: 'Comando a cronometrar',
    isCommand: true,
  },
}

export default time
