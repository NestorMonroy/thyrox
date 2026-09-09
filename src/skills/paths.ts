/**
 * El hogar de los artefactos de skill — mismo criterio que `agentsDir()`
 * (`paths/reach.ts`), sin tocar ese archivo: aquí sólo se IMPORTA
 * `thyroxRoot`, que ya es pública. Duplicar su cuerpo habría sido la segunda
 * fuente de verdad que `calibration-verified-numbers.md` prohíbe; envolverlo
 * habría exigido editar un archivo fuera de esta ruta.
 *
 * Dos entradas de entorno, en el orden que fija `envValue`: la variable del
 * proceso y la del `.env`. Sin ninguna de las dos, el hogar propio de
 * thyrox (`.claude/skills` bajo su raíz) — para que el mecanismo sea usable
 * sin configurar nada, igual que `agentsDir()`.
 */
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { envValue, repoOfRoot, resolveHome, thyroxRoot } from '../paths/reach.ts'
import { stateDir } from '../workbench/paths.ts'

/**
 * La variable de FAMILIA — declara el hogar de todos los clones a la vez. Es
 * el ultimo recurso antes del default, no la entrada principal: ver
 * `skillsHomeName` para por que una sola clave no basta.
 */
export const SKILLS_DIR_VAR = 'THYROX_SKILLS_DIR'

/** El prefijo de la constante POR CLON. Misma forma que la familia de reglas. */
export const SKILLS_CLONE_PREFIX = 'THYROX_SKILLS_'

/**
 * La constante por clon: `db` -> `THYROX_SKILLS_DB`.
 *
 * Existe por lo mismo que su gemela de reglas: un solo proceso resuelve varios
 * arboles, y una variable global no puede decir dos verdades a la vez.
 */
export function skillsHomeName(repo: string): string {
  return `${SKILLS_CLONE_PREFIX}${repo.toUpperCase().replace(/-/g, '_')}`
}

/**
 * El segmento propio de esta familia. El tramo de ESTADO no se escribe aqui:
 * lo declara `stateDir()` (`THYROX_STATE_DIR`, default `.claude`), y componerlo
 * a mano seria la segunda fuente de verdad de la particion que DEC-01 fija.
 */
export const SKILLS_SEGMENT = 'skills'

/** El hogar por defecto de un arbol dado, derivado del segmento declarado. */
export function defaultSkillsDir(root: string, start?: string): string {
  return join(root, stateDir(start ?? root), SKILLS_SEGMENT)
}

/**
 * Grafia HEREDADA del hogar por defecto, con `.claude` fijo.
 *
 * Se conserva porque tiene consumidores vivos que la importan por nombre; lo
 * que ya no hace es DECIDIR el hogar — eso lo hace `defaultSkillsDir`, que
 * deriva el tramo de estado en vez de codificarlo.
 */
export const SKILLS_DIR_DEFAULT = join('.claude', SKILLS_SEGMENT)

/**
 * NO se verifica que el directorio exista. Un hogar declarado y ausente es
 * un hecho del consumidor que su llamador tiene que poder ver — igual que
 * en `agentsDir()`.
 */
export function skillsDir(start?: string): string {
  const declared = envValue(SKILLS_DIR_VAR, start)
  if (declared) return declared
  return defaultSkillsDir(thyroxRoot(start), start)
}

/**
 * El hogar de los skills de UN CONSUMIDOR declarado.
 *
 * Existe aparte de `skillsDir()` por el defecto ya registrado en este arbol
 * (#286): un resolutor que cae al hogar del PROVEEDOR cuando se le pasa la
 * raiz de un consumidor compone una ruta dentro de thyrox y la publica como si
 * fuera del clon. Su gemela de reglas lo midio —`--consumer
 * /home/user/kaupamex-api` resolvia a `/home/user/thyrox/.claude/rules`— y esta
 * familia tenia la misma forma sin el mismo remedio.
 *
 * La variable sigue mandando, pero se lee CON la raiz del consumidor como
 * punto de partida: asi su `.env` es el que declara su hogar. Y su valor pasa
 * por `resolveHome`, de modo que un SEGMENTO relativo dice lo correcto para
 * los cinco clones a la vez.
 */
export function consumerSkillsDir(root: string): string {
  // De lo especifico a lo derivado: una ruta escrita para ESTE clon no puede
  // quedar anulada por una escrita para todos.
  const repo = repoOfRoot(root)
  if (repo) {
    const specific = envValue(skillsHomeName(repo), root)
    if (specific) return resolveHome(specific, root)
  }
  const family = envValue(SKILLS_DIR_VAR, root)
  if (family) return resolveHome(family, root)
  return defaultSkillsDir(root)
}

/** Los nombres de subdirectorio de skill presentes en un hogar dado. */
export function skillArtifacts(dir: string = skillsDir()): string[] {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return []
  return readdirSync(dir)
    .filter((name) => statSync(join(dir, name)).isDirectory())
    .sort()
}
