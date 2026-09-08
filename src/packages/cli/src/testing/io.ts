/**
 * El `Io` real del selector de impacto y la lectura de cambios (T-050).
 *
 * Vive aparte de `impact.ts` porque el selector **no toca disco** a
 * propósito: esa separación es lo que lo hace probable sin fabricar un árbol,
 * y lo que permite que otro repo le dé sus rutas por otra vía.
 */
import { readFileSync } from 'node:fs'
import type { Io } from './impact.ts'

/**
 * Las rutas cambiadas del árbol, según git.
 *
 * `--untracked-files=all` **no es opcional**: sin él, `git status --porcelain`
 * reporta un directorio nuevo entero como `?? dir/` y no lista lo de adentro.
 * Un selector ciego a eso no correría ninguna prueba de un módulo recién
 * creado, y su silencio se leería como «no hay impacto» — el mismo defecto de
 * instrumento que `stop-gate-hallazgo-pendiente.md` ya registró.
 */
export function changedPaths(cwd: string): string[] {
  const p = Bun.spawnSync(['git', 'status', '--porcelain', '--untracked-files=all'], { cwd })
  if (p.exitCode !== 0) {
    throw new Error(`No se pudo leer el estado de git en ${cwd}: ${p.stderr.toString().trim()}`)
  }
  return p.stdout.toString().split('\n')
    .map((l) => l.slice(3).trim())          // los tres primeros son el código de estado
    .filter(Boolean)
    .map((r) => (r.includes(' -> ') ? (r.split(' -> ')[1] as string) : r))   // renombres
    .sort()
}

/** El `Io` de filesystem: lista por el glob del proyecto y lee del disco. */
export function fsIo(cwd: string, testGlob: string): Io {
  let cache: string[] | undefined
  return {
    listTests: () => {
      if (!cache) cache = [...new Bun.Glob(testGlob).scanSync({ cwd })].sort()
      return cache
    },
    read: (path) => {
      try {
        return readFileSync(`${cwd}/${path}`, 'utf8')
      } catch {
        // Una prueba ilegible no es una prueba sin relación: se trata como
        // vacía y el denominador la sigue contando, para no inflar la
        // sensación de cobertura.
        return ''
      }
    },
  }
}
