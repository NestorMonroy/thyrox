import { homedir } from 'os'
import { isAbsolute, join, normalize, relative, resolve } from 'path'
import { getCwd, getPlatform } from './internal/pendingCrossPackageDeps.js'
import { posixPathToWindowsPath } from './windowsPaths.js'

/**
 * Porte PARCIAL de `ccnmt: packages/storage/src/path.ts` — sólo los cuatro
 * símbolos que ejercita `path.test.ts`: `expandPath`, `toRelativePath`,
 * `containsPathTraversal`, `normalizePathForConfigKey`.
 *
 * Dos símbolos de la fuente NO se portan:
 *
 * - `getDirectoryForPath` — depende de `getFsImplementation()` de
 *   `./fsOperations.js`. Ese archivo no tiene test propio en este pase y
 *   no está entre los seis que este porte cubre; se declara pendiente en
 *   vez de inventar un stub sin test que lo respalde.
 * - `export { sanitizePath } from './sessionStoragePortable.js'` — ese
 *   módulo es la pieza "god-class" que el README del paquete describe
 *   (4500+ LOC), fuera del alcance de este agente (otro agente porta
 *   `sessionStorage`/`sessionStoragePortable` en esta misma tanda).
 *
 * `getCwd`/`getPlatform` sustituyen a `@claude-code-how-works/app-host` y
 * `@claude-code-how-works/config` (ver `./internal/pendingCrossPackageDeps.ts`).
 */

/**
 * Expande una ruta que puede contener notación de tilde (~) a una ruta
 * absoluta.
 *
 * En Windows, las rutas estilo POSIX (p. ej. `/c/Users/...`) se convierten
 * automáticamente a formato Windows (p. ej. `C:\Users\...`). La función
 * siempre retorna rutas en el formato nativo de la plataforma actual.
 *
 * @param path - La ruta a expandir, puede contener:
 *   - `~` - expande al directorio home del usuario
 *   - `~/path` - expande a una ruta dentro del directorio home
 *   - rutas absolutas - se retornan normalizadas
 *   - rutas relativas - se resuelven respecto a baseDir
 *   - rutas POSIX en Windows - se convierten a formato Windows
 * @param baseDir - El directorio base para resolver rutas relativas (por
 *   defecto el directorio de trabajo actual)
 * @returns La ruta absoluta expandida en el formato nativo de la plataforma
 *   actual
 *
 * @throws {Error} Si la ruta es inválida
 */
export function expandPath(path: string, baseDir?: string): string {
  // Fija el baseDir por defecto a getCwd() si no se provee.
  const actualBaseDir = baseDir ?? getCwd()

  // Validación de entrada.
  if (typeof path !== 'string') {
    throw new TypeError(`Path must be a string, received ${typeof path}`)
  }

  if (typeof actualBaseDir !== 'string') {
    throw new TypeError(
      `Base directory must be a string, received ${typeof actualBaseDir}`,
    )
  }

  // Seguridad: revisa bytes nulos.
  if (path.includes('\0') || actualBaseDir.includes('\0')) {
    throw new Error('Path contains null bytes')
  }

  // Maneja rutas vacías o sólo con espacios.
  const trimmedPath = path.trim()
  if (!trimmedPath) {
    return normalize(actualBaseDir).normalize('NFC')
  }

  // Maneja la notación de directorio home.
  if (trimmedPath === '~') {
    return homedir().normalize('NFC')
  }

  if (trimmedPath.startsWith('~/')) {
    return join(homedir(), trimmedPath.slice(2)).normalize('NFC')
  }

  // En Windows, convierte rutas estilo POSIX (p. ej. /c/Users/...) a
  // formato Windows.
  let processedPath = trimmedPath
  if (getPlatform() === 'windows' && trimmedPath.match(/^\/[a-z]\//i)) {
    try {
      processedPath = posixPathToWindowsPath(trimmedPath)
    } catch {
      // Si la conversión falla, usa la ruta original.
      processedPath = trimmedPath
    }
  }

  // Maneja rutas absolutas.
  if (isAbsolute(processedPath)) {
    return normalize(processedPath).normalize('NFC')
  }

  // Maneja rutas relativas.
  return resolve(actualBaseDir, processedPath).normalize('NFC')
}

/**
 * Convierte una ruta absoluta a una ruta relativa desde cwd, para ahorrar
 * tokens en la salida de herramientas. Si la ruta está fuera de cwd (la
 * ruta relativa empezaría con ..), retorna la ruta absoluta sin cambios
 * para que quede sin ambigüedad.
 *
 * @param absolutePath - La ruta absoluta a relativizar
 * @returns Ruta relativa si está bajo cwd, si no la ruta absoluta original
 */
export function toRelativePath(absolutePath: string): string {
  const relativePath = relative(getCwd(), absolutePath)
  // Si la ruta relativa saliera fuera de cwd (empieza con ..), conserva la
  // absoluta.
  return relativePath.startsWith('..') ? absolutePath : relativePath
}

/**
 * Revisa si una ruta contiene patrones de traversal de directorio que
 * navegan a directorios padre.
 *
 * @param path - La ruta a revisar por patrones de traversal
 * @returns true si la ruta contiene traversal (p. ej. '../', '..\', o
 *   termina en '..')
 */
export function containsPathTraversal(path: string): boolean {
  return /(?:^|[\\/])\.\.(?:[\\/]|$)/.test(path)
}

/**
 * Normaliza una ruta para usarla como llave de configuración JSON.
 * En Windows, las rutas pueden tener separadores inconsistentes (C:\path
 * vs C:/path) según vengan de git, las APIs de Node.js, o entrada del
 * usuario. Esto normaliza a barras hacia adelante para una serialización
 * JSON consistente.
 *
 * @param path - La ruta a normalizar
 * @returns La ruta normalizada con barras hacia adelante consistentes
 */
export function normalizePathForConfigKey(path: string): string {
  // Primero usa normalize de Node para resolver segmentos . y ..
  const normalized = normalize(path)
  // Luego convierte todas las barras invertidas a barras hacia adelante
  // para llaves JSON consistentes. Es seguro porque las barras hacia
  // adelante funcionan en rutas de Windows para la mayoría de
  // operaciones.
  return normalized.replace(/\\/g, '/')
}
