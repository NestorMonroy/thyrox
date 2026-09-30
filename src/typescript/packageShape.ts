/**
 * La forma de proyecto de un paquete del workspace, derivada de su
 * manifiesto: qué destinos declara y con qué `rootDir` e `include` se
 * compila.
 *
 * Es el mismo programa que emite las declaraciones
 * (`emit_declarations._project_shape`, en Python): el build JS tiene que
 * emitir bajo el mismo `rootDir` para que `dist/x.js` quede junto a
 * `dist/x.d.ts`. `tests/typescript/packageShape.test.ts` compara las dos
 * implementaciones sobre cada manifiesto real.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

export const OUTPUT_DIR = 'dist'
export const SOURCE_CONDITION = '@thyrox/source'

export type Manifest = Record<string, unknown>

export function readManifest(packageDir: string): Manifest {
  return JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8')) as Manifest
}

/** Quita los caracteres `.` y `/` iniciales, como `str.lstrip("./")` en Python. */
export function stripDotSlash(path: string): string {
  return path.replace(/^[./]+/, '')
}

/**
 * Cada ruta relativa que el manifiesto declara como destino: `main`, `types`
 * y todos los valores de `exports`. De un diccionario de condiciones manda
 * la condición de fuente y, sin ella, `default`: `types` apunta a `dist/` y
 * meterlo haría que el paquete compilara sus propias declaraciones. `dist/`
 * es salida, nunca fuente, y se descarta.
 */
export function exportTargets(manifest: Manifest): string[] {
  const targets: string[] = []
  const collect = (value: unknown): void => {
    if (typeof value === 'string') {
      targets.push(value)
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      const record = value as Record<string, unknown>
      if (SOURCE_CONDITION in record) return collect(record[SOURCE_CONDITION])
      if ('default' in record) return collect(record.default)
      for (const [key, nested] of Object.entries(record)) {
        if (key !== 'types') collect(nested)
      }
    }
  }
  collect(manifest.main)
  collect(manifest.types)
  collect(manifest.exports)
  return targets.filter(t => !stripDotSlash(t).startsWith(`${OUTPUT_DIR}/`))
}

/** El directorio desde el que entra un destino; `""` si vive en la raíz. */
export function entryDirectory(entry: string): string {
  const dir = dirname(stripDotSlash(entry || './index.ts'))
  return dir === '.' ? '' : dir
}

/** El prefijo de componentes común, como `os.path.commonpath`. */
function commonPath(paths: string[]): string {
  const parts = paths.map(p => p.split('/').filter(s => s && s !== '.'))
  const common: string[] = []
  for (let i = 0; i < parts[0]!.length; i++) {
    const segment = parts[0]![i]!
    if (parts.every(p => p[i] === segment)) common.push(segment)
    else break
  }
  return common.join('/')
}

/**
 * El `rootDir` y el `include` de un paquete.
 *
 * - Un comodín anclado en la raíz (`"./*": "./*.ts"`) declara el paquete
 *   entero: `rootDir` `.` e `include` `**\/*`.
 * - Sin directorios declarados, la raíz con sus `*.ts`.
 * - El `rootDir` es el ancestro común de los directorios declarados; si es
 *   la raíz, o hay archivos exportados desde la raíz, se incluye cada
 *   directorio no anidado en otro más esos archivos por nombre.
 */
export function projectShape(packageDir: string): [string, string[]] {
  const targets = exportTargets(readManifest(packageDir))
  const directories: string[] = []
  for (const target of targets) {
    const dir = entryDirectory(target)
    if (dir && !directories.includes(dir)) directories.push(dir)
  }
  if (targets.some(t => t.includes('*') && !entryDirectory(t))) return ['.', ['**/*']]
  if (directories.length === 0) return ['.', ['*.ts']]
  const rootFiles = [...new Set(targets
    .filter(t => !t.includes('*') && !entryDirectory(t) && /\.tsx?$/.test(t))
    .map(stripDotSlash))].sort()
  const root = directories.length > 1 ? commonPath(directories) : directories[0]!
  if (root === '' || root === '.' || rootFiles.length > 0) {
    const covered = directories.filter(d =>
      !directories.some(o => o !== d && `${d}/`.startsWith(`${o}/`)))
    return ['.', [...covered.map(d => `${d}/**/*`), ...rootFiles]]
  }
  return [root, [`${root}/**/*`]]
}
