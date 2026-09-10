/**
 * Porte fiel de `ccnmt: packages/shell/src/bash/specs/timeout.ts` — spec Fig
 * del comando `timeout`.
 */
import type { CommandSpec } from '../registry.js'

const timeout: CommandSpec = {
  name: 'timeout',
  description: 'Ejecutar un comando con un límite de tiempo',
  args: [
    {
      name: 'duration',
      description: 'Duración antes de expirar (p. ej. 10, 5s, 2m)',
      isOptional: false,
    },
    {
      name: 'command',
      description: 'Comando a ejecutar',
      isCommand: true,
    },
  ],
}

export default timeout
