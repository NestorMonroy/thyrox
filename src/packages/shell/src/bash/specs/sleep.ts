/**
 * Porte fiel de `ccnmt: packages/shell/src/bash/specs/sleep.ts` — spec Fig
 * del comando `sleep`.
 */
import type { CommandSpec } from '../registry.js'

const sleep: CommandSpec = {
  name: 'sleep',
  description: 'Esperar la cantidad de tiempo especificada',
  args: {
    name: 'duration',
    description:
      'Duración de la espera (segundos, o con sufijo como 5s, 2m, 1h)',
    isOptional: false,
  },
}

export default sleep
