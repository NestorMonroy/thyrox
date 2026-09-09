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
import { resolve } from 'node:path'
import { envValue, reach, resolveHome, thyroxRoot } from '../paths/reach.ts'
import { stateDir } from '../workbench/paths.ts'

/**
 * La variable de FAMILIA — declara el hogar de todos los clones a la vez. Es
 * el ultimo recurso antes del default, no la entrada principal: ver
 * `rulesHomeName` para por que una sola clave no basta.
 */
export const RULES_DIR_VAR = 'THYROX_RULES_DIR'

/** El prefijo de la constante POR CLON. Misma forma que la familia workbench. */
export const RULES_CLONE_PREFIX = 'THYROX_RULES_'

/**
 * La constante por clon: `db` -> `THYROX_RULES_DB`.
 *
 * Existe porque un solo proceso resuelve varios arboles, y una variable global
 * no puede decir dos verdades a la vez. Medido antes de introducirla: con solo
 * `RULES_DIR_VAR`, declarar el hogar de `db` le daba a los otros cuatro clones
 * **el hogar de db**, y ninguna fila del registro avisaba.
 */
export function rulesHomeName(repo: string): string {
  return `${RULES_CLONE_PREFIX}${repo.toUpperCase().replace(/-/g, '_')}`
}

/**
 * El nombre corto del clon al que corresponde una raiz, o `null`.
 *
 * Se resuelve contra el mapa que `reach()` ya declara, no recomponiendo el
 * prefijo del clon: ese prefijo es una decision del consumidor y su derivacion
 * vive en `reach`, asi que rehacerla aqui seria su segunda fuente de verdad.
 *
 * Ciega a: una raiz que NO sea uno de los clones declarados — devuelve `null`,
 * y el llamador cae a la clave de familia. Es la conducta correcta: un arbol
 * que el alcance no declara no tiene clave por clon que leer. Y ciega a un
 * subdirectorio de un clon, que la mitad Python SI resuelve (`repo_of`
 * asciende). Esa asimetria es real y esta declarada, no supuesta.
 */
function repoOfRoot(root: string): string | null {
  const target = resolve(root)
  for (const [repo, path] of Object.entries(reach())) {
    if (resolve(path) === target) return repo
  }
  return null
}

/**
 * El segmento propio de esta familia. El tramo de ESTADO no se escribe aqui:
 * lo declara `stateDir()` (`THYROX_STATE_DIR`, default `.claude`), y componerlo
 * a mano seria la segunda fuente de verdad de la particion que DEC-01 fija —
 * producto en `src/`, estado en `.claude/`.
 */
export const RULES_SEGMENT = 'rules'

/** El hogar por defecto de un arbol dado, derivado del segmento declarado. */
export function defaultRulesDir(root: string, start?: string): string {
  return join(root, stateDir(start ?? root), RULES_SEGMENT)
}

/**
 * NO se verifica que el directorio exista: un hogar declarado y ausente es un
 * hecho del consumidor que su llamador tiene que poder ver.
 */
export function rulesDir(start?: string): string {
  const declared = envValue(RULES_DIR_VAR, start)
  if (declared) return declared
  return defaultRulesDir(thyroxRoot(start), start)
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
 * punto de partida: asi su `.env` es el que declara su hogar. Y su valor pasa
 * por `resolveHome`: como SEGMENTO relativo, la clave de familia dice lo
 * correcto para los cinco clones a la vez, porque se compone sobre la raiz de
 * cada uno. Una absoluta sigue colisionando, y es correcto — quien escribe una
 * absoluta nombra un sitio concreto, no un patron.
 */
export function consumerRulesDir(root: string): string {
  // De lo especifico a lo derivado: una ruta escrita para ESTE clon no puede
  // quedar anulada por una escrita para todos.
  const repo = repoOfRoot(root)
  if (repo) {
    const specific = envValue(rulesHomeName(repo), root)
    if (specific) return resolveHome(specific, root)
  }
  const family = envValue(RULES_DIR_VAR, root)
  if (family) return resolveHome(family, root)
  return defaultRulesDir(root)
}
