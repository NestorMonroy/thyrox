/**
 * Las operaciones de archivo que el resto del árbol comparte: leer sin
 * lanzar, escribir sin perder lo que ya estaba, y hablar de rutas de forma
 * que dos plataformas coincidan.
 *
 * Procedencia: `ccnmt: packages/storage/src/file.ts` (610 líneas, 26
 * exports). Ese árbol declara `"license": "UNLICENSED"`, así que el cuerpo se
 * **reimplementa** —mismo nombre de módulo, mismo sitio, mismos nombres y
 * firmas— y no se copia.
 *
 * Sustituye al porte parcial anterior, que declaraba UNO de los veintiséis
 * (`atomicWriteFile`). Sus razones estaban todas caducadas, medido:
 * `local-observability`, `config/feature-flags`, `config/platform` y
 * `app-host/bootstrap/cwd` existen, y los cinco vecinos de este mismo paquete
 * que citaba como ausentes —`fileRead`, `fileReadCache`, `fsOperations`,
 * `path`, `fileEncoding`— están todos portados.
 *
 * DIVERGENCIA DECLARADA (única): los símbolos de paquete hermano vienen bajo
 * el alcance `@thyrox` en vez del de la fuente. Ni firma ni comportamiento
 * cambian.
 *
 * Lo que este archivo protege, y que se pierde SIN ERROR si se rompe: el
 * símbolo enlazado sobrevive a una escritura, y los permisos del destino
 * también. Las dos garantías viven en `writeFileSyncAndFlush` y ninguna avisa
 * al perderse — el contenido queda correcto y el resto no.
 */
import { randomUUID } from 'crypto'
import { chmodSync, writeFileSync as fsWriteFileSync } from 'fs'
import { realpath, stat } from 'fs/promises'
import { homedir } from 'os'
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  join,
  normalize,
  relative,
  resolve,
  sep,
} from 'path'
import { getCwd } from '@thyrox/app-host/bootstrap/cwd.js'
import { getFeatureValue_CACHED_MAY_BE_STALE } from '@thyrox/config/feature-flags'
import { getPlatform } from '@thyrox/config/platform'
import { logEvent } from '@thyrox/local-observability'
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import { isENOENT } from '@thyrox/local-observability/errorHelpers.js'
import { logError } from '@thyrox/local-observability/logging'
import {
  detectLineEndingsForString,
  type LineEndingType,
} from './fileRead.js'
import { fileReadCache } from './fileReadCache.js'
import { getFsImplementation, safeResolvePath } from './fsOperations.js'
import { expandPath } from './path.js'

export type File = {
  filename: string
  content: string
}

/** ¿Existe la ruta? De forma asíncrona y sin lanzar. */
export async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

export const MAX_OUTPUT_SIZE = 0.25 * 1024 * 1024 // 0.25 MB en bytes

export function readFileSafe(filepath: string): string | null {
  try {
    const fs = getFsImplementation()
    return fs.readFileSync(filepath, { encoding: 'utf8' })
  } catch (error) {
    logError(error)
    return null
  }
}

/**
 * La marca de modificación, en milisegundos ENTEROS.
 *
 * El truncado no es cosmético: un vigilante de archivos del editor toca el
 * archivo sin cambiar su contenido, y la precisión de submilisegundo
 * convertiría eso en un «cambió» falso en cada comparación.
 */
export function getFileModificationTime(filePath: string): number {
  const fs = getFsImplementation()
  return Math.floor(fs.statSync(filePath).mtimeMs)
}

/**
 * La variante asíncrona, con la misma semántica de truncado. Es la que va en
 * los caminos asíncronos: el `statSync` ahí dispara el indicador de operación
 * lenta en discos de red.
 */
export async function getFileModificationTimeAsync(
  filePath: string,
): Promise<number> {
  const s = await getFsImplementation().stat(filePath)
  return Math.floor(s.mtimeMs)
}

export function writeTextContent(
  filePath: string,
  content: string,
  encoding: BufferEncoding,
  endings: LineEndingType,
): void {
  let toWrite = content
  if (endings === 'CRLF') {
    // Se normaliza a LF PRIMERO: el texto del modelo puede traer ya CRLF, y
    // unirlo sin normalizar produciría `\r\r\n`, que ningún editor muestra
    // como salto simple.
    toWrite = content.replaceAll('\r\n', '\n').split('\n').join('\r\n')
  }

  writeFileSyncAndFlush(filePath, toWrite, { encoding })
}

// Se re-exporta desde `fileEncoding.ts` para conservar la superficie de
// import. La implementación se mudó allí para romper el ciclo
// file ↔ fileReadCache: la caché necesita `detectFileEncoding` y este archivo
// necesita la caché; con la hoja neutral en medio, ninguno cierra el ciclo.
export { detectFileEncoding } from './fileEncoding.js'

export function detectLineEndings(
  filePath: string,
  encoding: BufferEncoding = 'utf8',
): LineEndingType {
  try {
    const fs = getFsImplementation()
    const { resolvedPath } = safeResolvePath(fs, filePath)
    const { buffer, bytesRead } = fs.readSync(resolvedPath, { length: 4096 })

    const content = buffer.toString(encoding, 0, bytesRead)
    return detectLineEndingsForString(content)
  } catch (error) {
    logError(error)
    return 'LF'
  }
}

export function convertLeadingTabsToSpaces(content: string): string {
  // El regex `/gm` recorre todas las líneas aunque no haya nada que cambiar;
  // el caso común no tiene tabuladores, así que se sale antes.
  if (!content.includes('\t')) return content
  return content.replace(/^\t+/gm, _ => '  '.repeat(_.length))
}

export function getAbsoluteAndRelativePaths(path: string | undefined): {
  absolutePath: string | undefined
  relativePath: string | undefined
} {
  const absolutePath = path ? expandPath(path) : undefined
  const relativePath = absolutePath
    ? relative(getCwd(), absolutePath)
    : undefined
  return { absolutePath, relativePath }
}

export function getDisplayPath(filePath: string): string {
  // Lo relativo, si el archivo cuelga del directorio de trabajo.
  const { relativePath } = getAbsoluteAndRelativePaths(filePath)
  if (relativePath && !relativePath.startsWith('..')) {
    return relativePath
  }

  // La tilde, si cuelga del directorio del usuario.
  const homeDir = homedir()
  if (filePath.startsWith(homeDir + sep)) {
    return '~' + filePath.slice(homeDir.length)
  }

  return filePath
}

/**
 * Un archivo con el mismo nombre y otra extensión, en el mismo directorio.
 * Es lo que se ofrece cuando la ruta pedida no existe.
 */
export function findSimilarFile(filePath: string): string | undefined {
  const fs = getFsImplementation()
  try {
    const dir = dirname(filePath)
    const fileBaseName = basename(filePath, extname(filePath))

    const files = fs.readdirSync(dir)

    const similarFiles = files.filter(
      file =>
        basename(file.name, extname(file.name)) === fileBaseName &&
        join(dir, file.name) !== filePath,
    )

    const firstMatch = similarFiles[0]
    if (firstMatch) {
      return firstMatch.name
    }
    return undefined
  } catch (error) {
    // Que falte el directorio es lo esperado; cualquier otro error se
    // registra antes de devolver undefined.
    if (!isENOENT(error)) {
      logError(error)
    }
    return undefined
  }
}

/**
 * La marca que llevan los mensajes de «archivo no encontrado» que incluyen la
 * nota del directorio de trabajo. La interfaz la reconoce para mostrar el
 * mensaje corto.
 */
export const FILE_NOT_FOUND_CWD_NOTE = 'Note: your current working directory is'

/**
 * Sugiere una ruta corregida bajo el directorio de trabajo cuando la pedida
 * no existe. Detecta el patrón de la carpeta de repositorio que falta: el
 * modelo arma una ruta absoluta sin el directorio del repo.
 *
 *   cwd    = /home/x/src/miRepo
 *   pedida = /home/x/src/a.ts            (no existe)
 *   da     = /home/x/src/miRepo/a.ts     (si existe)
 *
 * Sólo sugiere si la ruta corregida EXISTE: una sugerencia inventada cuesta
 * un intento más al modelo y no le enseña nada.
 */
export async function suggestPathUnderCwd(
  requestedPath: string,
): Promise<string | undefined> {
  const cwd = getCwd()
  const cwdParent = dirname(cwd)

  // Se resuelven los símbolos del padre de la ruta pedida para que la
  // comparación de prefijo funcione contra el cwd, que ya viene resuelto.
  let resolvedPath = requestedPath
  try {
    const resolvedDir = await realpath(dirname(requestedPath))
    resolvedPath = join(resolvedDir, basename(requestedPath))
  } catch {
    // Si el padre no existe, se usa la ruta original.
  }

  // Sólo aplica si la ruta cuelga del padre del cwd pero NO del cwd. Cuando
  // el padre es la raíz, se usa tal cual para no formar un `//` que nunca
  // casaría.
  const cwdParentPrefix = cwdParent === sep ? sep : cwdParent + sep
  if (
    !resolvedPath.startsWith(cwdParentPrefix) ||
    resolvedPath.startsWith(cwd + sep) ||
    resolvedPath === cwd
  ) {
    return undefined
  }

  const relFromParent = relative(cwdParent, resolvedPath)

  const correctedPath = join(cwd, relFromParent)
  try {
    await stat(correctedPath)
    return correctedPath
  } catch {
    return undefined
  }
}

/**
 * ¿Se usa el prefijo compacto (`N\t`) en vez del acolchado (`     N→`)?
 *
 * El acolchado cuesta nueve bytes por línea, que sobre el volumen de lecturas
 * del producto es una fracción medible de la entrada no cacheada. El formato
 * compacto es el default; el interruptor de emergencia devuelve el otro.
 */
export function isCompactLinePrefixEnabled(): boolean {
  // La bandera explícita se lee PRIMERO: quien tuviera el interruptor de
  // emergencia encendido —o sea, el separador de flecha— puede volver al
  // tabulador sin apagarlo.
  if (getFeatureValue_CACHED_MAY_BE_STALE('tengu_tab_read_sep', false)) {
    return true
  }
  // Interruptor apagado = formato compacto. Es decisión de cliente: no
  // necesita soporte del servidor, así que vale para cualquier proveedor.
  return !getFeatureValue_CACHED_MAY_BE_STALE(
    'tengu_compact_line_prefix_killswitch',
    false,
  )
}

/** Numera las líneas al estilo `cat -n`. */
export function addLineNumbers({
  content,
  /** 1-indexado. */
  startLine,
}: {
  content: string
  startLine: number
}): string {
  if (!content) {
    return ''
  }

  const lines = content.split(/\r?\n/)

  if (isCompactLinePrefixEnabled()) {
    return lines.map((line, index) => `${index + startLine}\t${line}`).join('\n')
  }

  return lines
    .map((line, index) => {
      const numStr = String(index + startLine)
      if (numStr.length >= 6) {
        return `${numStr}→${line}`
      }
      return `${numStr.padStart(6, ' ')}→${line}`
    })
    .join('\n')
}

/**
 * La inversa de `addLineNumbers`: quita el prefijo `N→` o `N\t` de una línea.
 *
 * Entiende LOS DOS formatos, y vive junto a su directa a propósito: el de
 * flecha es el histórico, así que una inversa que sólo entendiera el vigente
 * leería un transcript viejo con el prefijo pegado al texto.
 */
export function stripLineNumberPrefix(line: string): string {
  const match = line.match(/^\s*\d+[→\t](.*)$/)
  return match?.[1] ?? line
}

/**
 * ¿Está vacío el directorio?
 *
 * Un directorio ausente cuenta como vacío; cualquier otro error —permisos,
 * carpetas protegidas— como NO vacío. Equivocarse hacia «vacío» ahí borraría
 * algo que no se pudo leer.
 */
export function isDirEmpty(dirPath: string): boolean {
  try {
    return getFsImplementation().isDirEmptySync(dirPath)
  } catch (e) {
    return isENOENT(e)
  }
}

/** Lee con caché, para no repetir la misma E/S en una edición. */
export function readFileSyncCached(filePath: string): string {
  const { content } = fileReadCache.readFile(filePath)
  return content
}

/**
 * Escribe y vuelca a disco.
 *
 * @deprecated Preferir `fs.promises.writeFile` con `flush` en los caminos
 * asíncronos: una escritura síncrona bloquea el bucle de eventos.
 */
export function writeFileSyncAndFlush(
  filePath: string,
  content: string,
  options: { encoding: BufferEncoding; mode?: number } = { encoding: 'utf-8' },
): void {
  const fs = getFsImplementation()

  // Si el destino es un SÍMBOLO se escribe a través de él, conservándolo.
  // No se usa `safeResolvePath` aquí a propósito: hace falta resolver el
  // enlace a mano para escribir al destino y dejar el enlace en pie. Sin
  // esto, el rename atómico lo reemplazaría por un archivo regular — el
  // contenido quedaría bien y el enlace habría desaparecido, sin error.
  let targetPath = filePath
  try {
    const linkTarget = fs.readlinkSync(filePath)
    targetPath = isAbsolute(linkTarget)
      ? linkTarget
      : resolve(dirname(filePath), linkTarget)
    logForDebugging(`Writing through symlink: ${filePath} -> ${targetPath}`)
  } catch {
    // ENOENT (no existe) o EINVAL (no es un símbolo): se escribe a la ruta.
  }

  const tempPath = `${targetPath}.tmp.${process.pid}.${Date.now()}`

  // Un solo `stat`, reusado por los dos caminos. Los permisos del destino se
  // conservan: el rename trae los del temporal, así que un archivo a 0600
  // pasaría a 0644 sin que nadie se entere.
  let targetMode: number | undefined
  let targetExists = false
  try {
    targetMode = fs.statSync(targetPath).mode
    targetExists = true
    logForDebugging(`Preserving file permissions: ${targetMode.toString(8)}`)
  } catch (e) {
    if (!isENOENT(e)) throw e
    if (options.mode !== undefined) {
      targetMode = options.mode
      logForDebugging(
        `Setting permissions for new file: ${targetMode.toString(8)}`,
      )
    }
  }

  try {
    logForDebugging(`Writing to temp file: ${tempPath}`)

    const writeOptions: {
      encoding: BufferEncoding
      flush: boolean
      mode?: number
    } = {
      encoding: options.encoding,
      flush: true,
    }
    // El modo se fija en la escritura sólo para archivos NUEVOS, para que el
    // permiso quede puesto de forma atómica con el contenido.
    if (!targetExists && options.mode !== undefined) {
      writeOptions.mode = options.mode
    }

    fsWriteFileSync(tempPath, content, writeOptions)
    logForDebugging(
      `Temp file written successfully, size: ${content.length} bytes`,
    )

    if (targetExists && targetMode !== undefined) {
      chmodSync(tempPath, targetMode)
      logForDebugging(`Applied original permissions to temp file`)
    }

    logForDebugging(`Renaming ${tempPath} to ${targetPath}`)
    fs.renameSync(tempPath, targetPath)
    logForDebugging(`File ${targetPath} written atomically`)
  } catch (atomicError) {
    logForDebugging(`Failed to write file atomically: ${atomicError}`, {
      level: 'error',
    })
    logEvent('tengu_atomic_write_error', {})

    try {
      logForDebugging(`Cleaning up temp file: ${tempPath}`)
      fs.unlinkSync(tempPath)
    } catch (cleanupError) {
      logForDebugging(`Failed to clean up temp file: ${cleanupError}`)
    }

    // Respaldo no atómico: mejor una escritura sin garantía que ninguna.
    logForDebugging(`Falling back to non-atomic write for ${targetPath}`)
    try {
      const fallbackOptions: {
        encoding: BufferEncoding
        flush: boolean
        mode?: number
      } = {
        encoding: options.encoding,
        flush: true,
      }
      if (!targetExists && options.mode !== undefined) {
        fallbackOptions.mode = options.mode
      }

      fsWriteFileSync(targetPath, content, fallbackOptions)
      logForDebugging(
        `File ${targetPath} written successfully with non-atomic fallback`,
      )
    } catch (fallbackError) {
      logForDebugging(`Non-atomic write also failed: ${fallbackError}`)
      throw fallbackError
    }
  }
}

/**
 * Escritura asíncrona a prueba de caídas: temporal más rename. Si el proceso
 * muere a media escritura, el destino conserva lo que tenía — el único
 * archivo corrupto es el temporal, y se limpia.
 *
 * Es la hermana asíncrona de `writeFileSyncAndFlush`, con la misma garantía
 * de atomicidad y sin bloquear.
 */
export async function atomicWriteFile(
  filePath: string,
  content: string,
): Promise<void> {
  const fsp = await import('fs/promises')
  const tempPath = `${filePath}.tmp.${process.pid}.${Date.now()}.${randomUUID()}`
  try {
    await fsp.writeFile(tempPath, content, 'utf-8')
    await fsp.rename(tempPath, filePath)
  } catch (e) {
    // El temporal huérfano se limpia sin tapar el error original: lo que
    // quien llama necesita saber es por qué falló la escritura.
    await fsp.unlink(tempPath).catch(() => {
      /* la limpieza es mejor-esfuerzo */
    })
    throw e
  }
}

export function getDesktopPath(): string {
  const platform = getPlatform()
  const homeDir = homedir()

  if (platform === 'macos') {
    return join(homeDir, 'Desktop')
  }

  if (platform === 'windows') {
    // Bajo WSL se intenta el escritorio de Windows.
    const windowsHome = process.env.USERPROFILE
      ? process.env.USERPROFILE.replace(/\\/g, '/')
      : null

    if (windowsHome) {
      const wslPath = windowsHome.replace(/^[A-Z]:/, '')
      const desktopPath = `/mnt/c${wslPath}/Desktop`

      if (getFsImplementation().existsSync(desktopPath)) {
        return desktopPath
      }
    }

    try {
      const usersDir = '/mnt/c/Users'
      const userDirs = getFsImplementation().readdirSync(usersDir)

      for (const user of userDirs) {
        if (
          user.name === 'Public' ||
          user.name === 'Default' ||
          user.name === 'Default User' ||
          user.name === 'All Users'
        ) {
          continue
        }

        const potentialDesktopPath = join(usersDir, user.name, 'Desktop')

        if (getFsImplementation().existsSync(potentialDesktopPath)) {
          return potentialDesktopPath
        }
      }
    } catch (error) {
      logError(error)
    }
  }

  const desktopPath = join(homeDir, 'Desktop')
  if (getFsImplementation().existsSync(desktopPath)) {
    return desktopPath
  }

  // Sin escritorio, el directorio del usuario.
  return homeDir
}

/**
 * ¿El archivo cabe en el límite de lectura?
 *
 * Lo que no se puede consultar responde `false`, no `true`: la duda no
 * autoriza a leerlo entero.
 */
export function isFileWithinReadSizeLimit(
  filePath: string,
  maxSizeBytes: number = MAX_OUTPUT_SIZE,
): boolean {
  try {
    const stats = getFsImplementation().statSync(filePath)
    return stats.size <= maxSizeBytes
  } catch {
    return false
  }
}

/**
 * Normaliza una ruta para compararla, cubriendo la diferencia de plataforma.
 * En Windows además unifica el separador y baja a minúsculas, porque ahí las
 * rutas no distinguen mayúsculas.
 */
export function normalizePathForComparison(filePath: string): string {
  // `normalize` limpia separadores redundantes y resuelve `.` y `..`.
  let normalized = normalize(filePath)

  if (getPlatform() === 'windows') {
    normalized = normalized.replace(/\//g, '\\').toLowerCase()
  }

  return normalized
}

/** ¿Son la misma ruta? Con la insensibilidad de Windows cubierta. */
export function pathsEqual(path1: string, path2: string): boolean {
  return normalizePathForComparison(path1) === normalizePathForComparison(path2)
}
