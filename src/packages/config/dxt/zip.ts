/**
 * Puerto de `ccnmt: packages/config/dxt/zip.ts` (226 líneas fuente).
 * Validación y extracción segura de zips DXT/MCPB (límites anti zip-bomb,
 * anti path-traversal) más el parseo manual de modos Unix del directorio
 * central del zip. Reimplementación fiel.
 *
 * `isAbsolute`/`normalize` de `path` son built-ins. `fflate` es una
 * dependencia externa real no instalada en este árbol (verificado con
 * `Bun.resolveSync`); la fuente YA la importa perezosamente dentro de
 * `unzipFile` — por la misma razón de arranque que `dxt/helpers.ts`: evita
 * ~196KB de tablas de lookup top-level (`revfd`, `rev`) cuando el módulo se
 * alcanza sin necesitar unzip. Se conserva ese `await import()` verbatim.
 *
 * Repuntados vía `require()` diferido
 * (`../internal/pendingCrossPackageDeps.ts`): `logForDebugging`, `isENOENT`
 * (`@thyrox/local-observability`), `getFsImplementation`,
 * `containsPathTraversal` (`@thyrox/storage`) — los cuatro existen en su
 * paquete, sólo falta el symlink de workspace.
 */

import { isAbsolute, normalize } from 'path'
import {
  requireLocalObservabilityDebug,
  requireLocalObservabilityErrorHelpers,
  requireStorageFsOperations,
  requireStoragePath,
} from '../internal/pendingCrossPackageDeps.js'

const LIMITS = {
  MAX_FILE_SIZE: 512 * 1024 * 1024, // 512MB por archivo
  MAX_TOTAL_SIZE: 1024 * 1024 * 1024, // 1024MB total sin comprimir
  MAX_FILE_COUNT: 100000, // Máximo de archivos
  MAX_COMPRESSION_RATIO: 50, // Por encima de 50:1 es sospechoso
  MIN_COMPRESSION_RATIO: 0.5, // Por debajo de 0.5:1 podría ser contenido ya comprimido malicioso
}

/** Rastreador de estado para la validación de un zip durante la extracción. */
type ZipValidationState = {
  fileCount: number
  totalUncompressedSize: number
  compressedSize: number
  errors: string[]
}

/** Metadata de archivo del filtro de fflate. */
type ZipFileMetadata = {
  name: string
  originalSize?: number
}

/** Resultado de validar un único archivo dentro de un zip. */
type FileValidationResult = {
  isValid: boolean
  error?: string
}

/** Valida una ruta de archivo para prevenir ataques de path traversal. */
export function isPathSafe(filePath: string): boolean {
  if (requireStoragePath().containsPathTraversal(filePath)) {
    return false
  }

  // Normaliza la ruta para resolver segmentos '.'.
  const normalized = normalize(filePath)

  // Rechaza rutas absolutas (sólo se quieren rutas relativas en archivos).
  if (isAbsolute(normalized)) {
    return false
  }

  return true
}

/** Valida un único archivo durante la extracción del zip. */
export function validateZipFile(
  file: ZipFileMetadata,
  state: ZipValidationState,
): FileValidationResult {
  state.fileCount++

  let error: string | undefined

  // Comprueba el conteo de archivos.
  if (state.fileCount > LIMITS.MAX_FILE_COUNT) {
    error = `Archive contains too many files: ${state.fileCount} (max: ${LIMITS.MAX_FILE_COUNT})`
  }

  // Valida la seguridad de la ruta.
  if (!isPathSafe(file.name)) {
    error = `Unsafe file path detected: "${file.name}". Path traversal or absolute paths are not allowed.`
  }

  // Comprueba el tamaño individual del archivo.
  const fileSize = file.originalSize || 0
  if (fileSize > LIMITS.MAX_FILE_SIZE) {
    error = `File "${file.name}" is too large: ${Math.round(fileSize / 1024 / 1024)}MB (max: ${Math.round(LIMITS.MAX_FILE_SIZE / 1024 / 1024)}MB)`
  }

  // Rastrea el tamaño total sin comprimir.
  state.totalUncompressedSize += fileSize

  // Comprueba el tamaño total.
  if (state.totalUncompressedSize > LIMITS.MAX_TOTAL_SIZE) {
    error = `Archive total size is too large: ${Math.round(state.totalUncompressedSize / 1024 / 1024)}MB (max: ${Math.round(LIMITS.MAX_TOTAL_SIZE / 1024 / 1024)}MB)`
  }

  // Comprueba el ratio de compresión para detectar zip bombs.
  const currentRatio = state.totalUncompressedSize / state.compressedSize
  if (currentRatio > LIMITS.MAX_COMPRESSION_RATIO) {
    error = `Suspicious compression ratio detected: ${currentRatio.toFixed(1)}:1 (max: ${LIMITS.MAX_COMPRESSION_RATIO}:1). This may be a zip bomb.`
  }

  return error ? { isValid: false, error } : { isValid: true }
}

/**
 * Descomprime datos de un Buffer y devuelve su contenido como un registro de
 * rutas de archivo a datos `Uint8Array`. Usa `unzipSync` para evitar los
 * crashes por terminación de worker de fflate en bun. Acepta bytes crudos de
 * zip para que quien llama pueda leer el archivo de forma asíncrona.
 *
 * `fflate` se importa perezosamente para evitar sus ~196KB de tablas de
 * lookup top-level (`revfd` Int32Array(32769), `rev` Uint16Array(32768),
 * etc.) asignándose al arranque cuando este módulo se alcanza vía la cadena
 * del cargador de plugins.
 */
export async function unzipFile(
  zipData: Buffer,
): Promise<Record<string, Uint8Array>> {
  // @ts-expect-error — fflate no está instalado en este árbol; la fuente ya
  // lo importa perezosamente por la misma razón de arranque (ver docstring
  // del módulo). Se conserva el import diferido tal cual.
  const { unzipSync } = await import('fflate')
  const compressedSize = zipData.length

  const state: ZipValidationState = {
    fileCount: 0,
    totalUncompressedSize: 0,
    compressedSize: compressedSize,
    errors: [],
  }

  const result = unzipSync(new Uint8Array(zipData), {
    filter: (file: ZipFileMetadata) => {
      const validationResult = validateZipFile(file, state)
      if (!validationResult.isValid) {
        throw new Error(validationResult.error!)
      }
      return true
    },
  })

  requireLocalObservabilityDebug().logForDebugging(
    `Zip extraction completed: ${state.fileCount} files, ${Math.round(state.totalUncompressedSize / 1024)}KB uncompressed`,
  )

  return result
}

/**
 * Parsea los modos de archivo Unix del directorio central de un zip.
 *
 * `unzipSync` de fflate sólo devuelve `Record<string, Uint8Array>` — no
 * expone los atributos externos de archivo guardados en el directorio
 * central. Eso significa que los bits de ejecutable se pierden en la
 * extracción (todo se vuelve 0644). El camino de git-clone preserva +x de
 * forma nativa; el camino GCS/zip necesita este helper para mantener
 * paridad.
 *
 * Devuelve `nombre → modo` para entradas creadas en un host Unix (byte alto
 * de `versionMadeBy` === 3). Las entradas de otros hosts, o sin bits de modo
 * seteados, se omiten. Quien llama debe tratar una clave ausente como "usar
 * el modo por defecto".
 *
 * Formato según PKZIP APPNOTE.TXT §4.3.12 (directorio central) y §4.3.16
 * (EOCD). ZIP64 no se maneja — devuelve `{}` en archivos >4GB o >65535
 * entradas, que basta para zips de marketplace (~3.5MB) y bundles MCPB.
 */
export function parseZipModes(data: Uint8Array): Record<string, number> {
  // Vista Buffer para los métodos readUInt* — comparte memoria, sin copia.
  const buf = Buffer.from(data.buffer, data.byteOffset, data.byteLength)
  const modes: Record<string, number> = {}

  // 1. Encuentra el registro End of Central Directory (firma 0x06054b50).
  //    Vive en los últimos 22 + 65535 bytes (tamaño fijo de EOCD + máximo
  //    largo de comentario). Recorre hacia atrás — el EOCD suele ser los
  //    últimos 22 bytes.
  const minEocd = Math.max(0, buf.length - 22 - 0xffff)
  let eocd = -1
  for (let i = buf.length - 22; i >= minEocd; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) return modes // malformado — deja que el error de fflate salga por otro lado

  const entryCount = buf.readUInt16LE(eocd + 10)
  let off = buf.readUInt32LE(eocd + 16) // offset de inicio del directorio central

  // 2. Recorre las entradas del directorio central (firma 0x02014b50). Cada
  //    entrada tiene una cabecera fija de 46 bytes seguida de
  //    nombre/extra/comentario de largo variable.
  for (let i = 0; i < entryCount; i++) {
    if (off + 46 > buf.length || buf.readUInt32LE(off) !== 0x02014b50) break
    const versionMadeBy = buf.readUInt16LE(off + 4)
    const nameLen = buf.readUInt16LE(off + 28)
    const extraLen = buf.readUInt16LE(off + 30)
    const commentLen = buf.readUInt16LE(off + 32)
    const externalAttr = buf.readUInt32LE(off + 38)
    const name = buf.toString('utf8', off + 46, off + 46 + nameLen)

    // versionMadeBy byte alto = SO del host. 3 = Unix. Para zips Unix, los
    // 16 bits altos de externalAttr guardan st_mode (tipo de archivo +
    // bits de permiso).
    if (versionMadeBy >> 8 === 3) {
      const mode = (externalAttr >>> 16) & 0xffff
      if (mode) modes[name] = mode
    }

    off += 46 + nameLen + extraLen + commentLen
  }

  return modes
}

/**
 * Lee un archivo zip de disco de forma asíncrona y lo descomprime.
 * Devuelve su contenido como un registro de rutas de archivo a datos
 * `Uint8Array`.
 */
export async function readAndUnzipFile(
  filePath: string,
): Promise<Record<string, Uint8Array>> {
  const fs = requireStorageFsOperations().getFsImplementation()

  try {
    const zipData = await fs.readFileBytes(filePath)
    // El await es obligatorio aquí: sin él, los rechazos del ahora-async
    // unzipFile() escapan del try/catch y evitan el envoltorio de error de
    // abajo.
    return await unzipFile(zipData)
  } catch (error) {
    if (requireLocalObservabilityErrorHelpers().isENOENT(error)) {
      throw error
    }
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to read or unzip file: ${errorMessage}`)
  }
}
