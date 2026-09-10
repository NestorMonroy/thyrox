/**
 * El hogar de los comandos, en sus dos lados.
 *
 * `COMMANDS_SOURCE_DIR` es la FUENTE (`src/commands/`), y el destino es el
 * `.claude/commands/` que el cliente lee. Medido 2026-09-07: ese destino esta
 * VACIO en thyrox y en kaupamex-docs, y tiene 26 archivos en kaupamex-api y
 * kaupamex-ui — copias byte a byte de la fuente, mas el `loop-analyze.md` que
 * solo esta aqui. O sea: la fuente ya es la fuente; lo que faltaba era el
 * emisor y su destino declarado.
 *
 * Dos entradas de entorno para el destino, en el orden que fija `envValue`
 * (proceso, luego `.env`), igual que `skills/paths.ts`. Sin ninguna, el hogar
 * propio de thyrox — para que el mecanismo sea usable sin configurar nada.
 */
import { join } from 'node:path'
import { envValue, thyroxRoot } from '../paths/reach.ts'

export const COMMANDS_DIR_VAR = 'THYROX_COMMANDS_DIR'
export const COMMANDS_DIR_DEFAULT = join('.claude', 'commands')

/** La fuente: las definiciones, bajo la raiz de thyrox. */
export const COMMANDS_SOURCE_DIR = join(thyroxRoot(), 'src', 'commands')

/** El destino emitido: declarable, con el hogar propio como respaldo. */
export function commandsDir(): string {
  const declarado = envValue(COMMANDS_DIR_VAR)
  return declarado ? declarado : join(thyroxRoot(), COMMANDS_DIR_DEFAULT)
}
