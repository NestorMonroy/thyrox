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
import { envValue, thyroxRoot } from '../paths/reach.ts'

export const SKILLS_DIR_VAR = 'THYROX_SKILLS_DIR'
export const SKILLS_DIR_DEFAULT = join('.claude', 'skills')

/**
 * NO se verifica que el directorio exista. Un hogar declarado y ausente es
 * un hecho del consumidor que su llamador tiene que poder ver — igual que
 * en `agentsDir()`.
 */
export function skillsDir(start?: string): string {
  const declared = envValue(SKILLS_DIR_VAR, start)
  if (declared) return declared
  return join(thyroxRoot(start), SKILLS_DIR_DEFAULT)
}

/** Los nombres de subdirectorio de skill presentes en un hogar dado. */
export function skillArtifacts(dir: string = skillsDir()): string[] {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return []
  return readdirSync(dir)
    .filter((name) => statSync(join(dir, name)).isDirectory())
    .sort()
}
