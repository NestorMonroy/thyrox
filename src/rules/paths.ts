/**
 * El hogar de las reglas emitidas — mismo criterio y misma forma que
 * `skills/paths.ts`, que a su vez calca `agentsDir()`. Se IMPORTA
 * `thyroxRoot`; duplicar su cuerpo sería la segunda fuente de verdad que
 * `calibration-verified-numbers.md` prohíbe.
 *
 * Dos entradas de entorno en el orden que fija `envValue`: la variable del
 * proceso y la del `.env`. Sin ninguna de las dos, el hogar propio de thyrox
 * — para que el mecanismo sea usable sin configurar nada.
 */
import { join } from 'node:path'
import { envValue, thyroxRoot } from '../paths/reach.ts'

export const RULES_DIR_VAR = 'THYROX_RULES_DIR'
export const RULES_DIR_DEFAULT = join('.claude', 'rules')

/**
 * NO se verifica que el directorio exista: un hogar declarado y ausente es un
 * hecho del consumidor que su llamador tiene que poder ver.
 */
export function rulesDir(start?: string): string {
  const declared = envValue(RULES_DIR_VAR, start)
  if (declared) return declared
  return join(thyroxRoot(start), RULES_DIR_DEFAULT)
}

/**
 * El hogar de las reglas de UN CONSUMIDOR declarado.
 *
 * Existe aparte de `rulesDir()` por un defecto ya registrado en este arbol
 * (#286): un resolutor que cae al hogar del PROVEEDOR cuando se le pasa la
 * raiz de un consumidor compone una ruta dentro de thyrox y la publica como
 * si fuera del clon. Se midio aqui mismo al estrenar el emisor —
 * `--consumer /home/user/kaupamex-api` resolvia a
 * `/home/user/thyrox/.claude/rules`.
 *
 * La variable sigue mandando, pero se lee CON la raiz del consumidor como
 * punto de partida: asi su `.env` es el que declara su hogar.
 */
export function consumerRulesDir(root: string): string {
  const declared = envValue(RULES_DIR_VAR, root)
  if (declared) return declared
  return join(root, RULES_DIR_DEFAULT)
}
