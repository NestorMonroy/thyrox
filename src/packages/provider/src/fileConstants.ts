/**
 * Porte fiel de `ccnmt: packages/provider/src/fileConstants.ts` (paquete
 * `provider`, licencia UNLICENSED — reimplementación, no copia). Porte
 * COMPLETO — cero dependencias cruzadas de paquete.
 */
/**
 * Extensiones de archivo binario a saltar en operaciones de texto — no se
 * pueden comparar de forma significativa como texto y suelen ser grandes.
 */
export const BINARY_EXTENSIONS = new Set([
  // Imágenes
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.bmp',
  '.ico',
  '.webp',
  '.tiff',
  '.tif',
  // Videos
  '.mp4',
  '.mov',
  '.avi',
  '.mkv',
  '.webm',
  '.wmv',
  '.flv',
  '.m4v',
  '.mpeg',
  '.mpg',
  // Audio
  '.mp3',
  '.wav',
  '.ogg',
  '.flac',
  '.aac',
  '.m4a',
  '.wma',
  '.aiff',
  '.opus',
  // Archivos comprimidos
  '.zip',
  '.tar',
  '.gz',
  '.bz2',
  '.7z',
  '.rar',
  '.xz',
  '.z',
  '.tgz',
  '.iso',
  // Ejecutables/binarios
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.bin',
  '.o',
  '.a',
  '.obj',
  '.lib',
  '.app',
  '.msi',
  '.deb',
  '.rpm',
  // Documentos (el PDF está aquí; FileReadTool lo excluye en el call site)
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.odt',
  '.ods',
  '.odp',
  // Fuentes tipográficas
  '.ttf',
  '.otf',
  '.woff',
  '.woff2',
  '.eot',
  // Bytecode / artefactos de VM
  '.pyc',
  '.pyo',
  '.class',
  '.jar',
  '.war',
  '.ear',
  '.node',
  '.wasm',
  '.rlib',
  // Archivos de base de datos
  '.sqlite',
  '.sqlite3',
  '.db',
  '.mdb',
  '.idx',
  // Diseño / 3D
  '.psd',
  '.ai',
  '.eps',
  '.sketch',
  '.fig',
  '.xd',
  '.blend',
  '.3ds',
  '.max',
  // Flash
  '.swf',
  '.fla',
  // Datos de lock/profiling
  '.lockb',
  '.dat',
  '.data',
])

/**
 * Comprueba si una ruta tiene una extensión binaria.
 */
export function hasBinaryExtension(filePath: string): boolean {
  const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase()
  return BINARY_EXTENSIONS.has(ext)
}

/**
 * Cantidad de bytes a leer para detectar contenido binario.
 */
const BINARY_CHECK_SIZE = 8192

/**
 * Comprueba si un buffer tiene contenido binario, buscando bytes nulos o
 * una proporción alta de caracteres no imprimibles.
 */
export function isBinaryContent(buffer: Buffer): boolean {
  // Revisa los primeros BINARY_CHECK_SIZE bytes (o el buffer entero si es menor)
  const checkSize = Math.min(buffer.length, BINARY_CHECK_SIZE)

  let nonPrintable = 0
  for (let i = 0; i < checkSize; i++) {
    const byte = buffer[i]!
    // Un byte nulo es un indicador fuerte de binario
    if (byte === 0) {
      return true
    }
    // Cuenta bytes no imprimibles y que no sean espacio en blanco
    // (ASCII imprimible es 32-126, más los espacios comunes 9, 10, 13)
    if (
      byte < 32 &&
      byte !== 9 && // tab
      byte !== 10 && // newline
      byte !== 13 // carriage return
    ) {
      nonPrintable++
    }
  }

  // Si más del 10% es no imprimible, probablemente es binario
  return nonPrintable / checkSize > 0.1
}
