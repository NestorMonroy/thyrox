/**
 * Puerto de `ccnmt: packages/tool-registry/src/generatedFiles.ts`
 * (136 líneas, 2 símbolos). Qué archivo NO cuenta como autoría.
 *
 * Los patrones siguen los de GitHub Linguist para contenido vendorizado más
 * las formas de generador de uso corriente. Se atribuye a quien escribe, no
 * a quien corre el generador.
 *
 * TRES MECANISMOS DISTINTOS, y ninguno cubre al otro:
 *
 *   nombre exacto ...... el lockfile, que no tiene extensión distintiva
 *   extensión .......... simple y COMPUESTA — `extname('app.min.js')` da
 *                        `.js`, que no está vetado; sin la compuesta un
 *                        bundle minificado contaría como código a mano
 *   segmento de ruta ... con barra a los dos lados, para que
 *                        `redistribute.ts` no case con `/dist/`
 */
import { basename, extname, posix, sep } from 'path'

/** Nombres exactos, comparados en minúscula. */
const EXCLUDED_FILENAMES = new Set([
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'bun.lockb',
  'bun.lock',
  'composer.lock',
  'gemfile.lock',
  'cargo.lock',
  'poetry.lock',
  'pipfile.lock',
  'shrinkwrap.json',
  'npm-shrinkwrap.json',
])

/** Extensiones, simples y compuestas, comparadas en minúscula. */
const EXCLUDED_EXTENSIONS = new Set([
  '.lock',
  '.min.js',
  '.min.css',
  '.min.html',
  '.bundle.js',
  '.bundle.css',
  '.generated.ts',
  '.generated.js',
  '.d.ts',
])

/** Segmentos de ruta que declaran contenido generado o vendorizado. */
const EXCLUDED_DIRECTORIES = [
  '/dist/',
  '/build/',
  '/out/',
  '/output/',
  '/node_modules/',
  '/vendor/',
  '/vendored/',
  '/third_party/',
  '/third-party/',
  '/external/',
  '/.next/',
  '/.nuxt/',
  '/.svelte-kit/',
  '/coverage/',
  '/__pycache__/',
  '/.tox/',
  '/venv/',
  '/.venv/',
  '/target/release/',
  '/target/debug/',
]

/** Formas de generador que el nombre exacto y la extensión no alcanzan. */
const EXCLUDED_FILENAME_PATTERNS = [
  /^.*\.min\.[a-z]+$/i,
  /^.*-min\.[a-z]+$/i,
  /^.*\.bundle\.[a-z]+$/i,
  /^.*\.generated\.[a-z]+$/i,
  /^.*\.gen\.[a-z]+$/i,
  /^.*\.auto\.[a-z]+$/i,
  /^.*_generated\.[a-z]+$/i,
  /^.*_gen\.[a-z]+$/i,
  /^.*\.pb\.(go|js|ts|py|rb)$/i,
  /^.*_pb2?\.py$/i,
  /^.*\.pb\.h$/i,
  /^.*\.grpc\.[a-z]+$/i,
  /^.*\.swagger\.[a-z]+$/i,
  /^.*\.openapi\.[a-z]+$/i,
]

/**
 * ¿Debe excluirse de la atribución?
 *
 * @param filePath ruta relativa a la raíz del repositorio
 */
export function isGeneratedFile(filePath: string): boolean {
  // La ruta se lleva a POSIX antes de mirar el directorio: los patrones
  // llevan `/`, así que en Windows `pkg\dist\x.js` nunca contendría
  // `/dist/` y el veto quedaría inerte EN SILENCIO, que es peor que roto.
  // El `replace` final impide que una ruta ya absoluta gane una segunda barra.
  const normalizedPath =
    posix.sep + filePath.split(sep).join(posix.sep).replace(/^\/+/, '')
  const fileName = basename(filePath).toLowerCase()
  const ext = extname(filePath).toLowerCase()

  if (EXCLUDED_FILENAMES.has(fileName)) return true
  if (EXCLUDED_EXTENSIONS.has(ext)) return true

  // Extensión compuesta: `app.min.js` → `.min.js`.
  const parts = fileName.split('.')
  if (parts.length > 2) {
    const compoundExt = '.' + parts.slice(-2).join('.')
    if (EXCLUDED_EXTENSIONS.has(compoundExt)) return true
  }

  for (const dir of EXCLUDED_DIRECTORIES) {
    if (normalizedPath.includes(dir)) return true
  }

  for (const pattern of EXCLUDED_FILENAME_PATTERNS) {
    if (pattern.test(fileName)) return true
  }

  return false
}

/** Quita los generados conservando el orden de los que quedan. */
export function filterGeneratedFiles(files: string[]): string[] {
  return files.filter(file => !isGeneratedFile(file))
}
