/**
 * El hogar de los comandos, en sus dos lados.
 *
 * `COMMANDS_SOURCE_DIR` es la FUENTE (`src/commands/`), y el destino es el
 * `.claude/commands/` que el cliente lee. Donde ese destino está lleno, son
 * copias byte a byte de la fuente: por eso se emite desde aquí, con su destino
 * declarado, en vez de mantenerse a mano en cada clon.
 *
 * Dos entradas de entorno para el destino, en el orden que fija `envValue`
 * (proceso, luego `.env`), igual que `skills/paths.ts`. Sin ninguna, el hogar
 * propio de thyrox — para que el mecanismo sea usable sin configurar nada.
 */
import { join } from 'node:path'
import { envValue, thyroxRoot } from '@thyrox/paths/reach.ts'

export const COMMANDS_DIR_VAR = 'THYROX_COMMANDS_DIR'
export const COMMANDS_DIR_DEFAULT = join('.claude', 'commands')

/** La fuente: las definiciones, bajo la raiz de thyrox. */
export const COMMANDS_SOURCE_DIR = join(thyroxRoot(), 'src', 'commands')

/** El destino emitido: declarable, con el hogar propio como respaldo. */
export function commandsDir(): string {
  const declarado = envValue(COMMANDS_DIR_VAR)
  return declarado ? declarado : join(thyroxRoot(), COMMANDS_DIR_DEFAULT)
}
