/**
 * Porte fiel de `ccnmt: packages/shell/src/bash/specs/alias.ts` — spec Fig
 * del comando `alias` (crear o listar alias de shell).
 */
import type { CommandSpec } from '../registry.js'

const alias: CommandSpec = {
  name: 'alias',
  description: 'Crear o listar alias de comandos',
  args: {
    name: 'definition',
    description: 'Definición de alias en la forma nombre=valor',
    isOptional: true,
    isVariadic: true,
  },
}

export default alias
