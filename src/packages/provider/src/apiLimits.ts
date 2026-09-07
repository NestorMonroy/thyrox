/**
 * Porte fiel de `ccnmt: packages/provider/src/apiLimits.ts` (paquete
 * `provider`, licencia UNLICENSED — reimplementación, no copia). Porte
 * COMPLETO — la fuente misma se declara sin dependencias a propósito,
 * para evitar imports circulares; cero imports, cero divergencias.
 *
 * Límites de la API de Anthropic — constantes que el servidor impone del
 * lado de la API, no calculadas dinámicamente en este pase.
 */

// =============================================================================
// LÍMITES DE IMAGEN
// =============================================================================

/**
 * Tamaño máximo de imagen codificada en base64 (impuesto por la API).
 * La API rechaza imágenes cuya cadena base64 exceda este valor — es el
 * largo en base64, NO los bytes crudos (base64 crece ~33%).
 */
export const API_IMAGE_MAX_BASE64_SIZE = 5 * 1024 * 1024 // 5 MB

/**
 * Tamaño crudo objetivo para quedar bajo el límite de base64 tras
 * codificar (base64 crece por un factor de 4/3, así que el tamaño crudo
 * máximo se despeja como base64_size * 3/4).
 */
export const IMAGE_TARGET_RAW_SIZE = (API_IMAGE_MAX_BASE64_SIZE * 3) / 4 // 3.75 MB

/**
 * Dimensiones máximas del lado cliente para redimensionar imágenes.
 *
 * La API redimensiona internamente imágenes de más de 1568px, pero eso
 * ocurre del lado del servidor y no produce error. Estos límites del
 * cliente (2000px) son algo mayores para preservar calidad cuando
 * conviene — el límite duro real es `API_IMAGE_MAX_BASE64_SIZE`.
 */
export const IMAGE_MAX_WIDTH = 2000
export const IMAGE_MAX_HEIGHT = 2000

// =============================================================================
// LÍMITES DE PDF
// =============================================================================

/**
 * Tamaño crudo máximo de PDF que cabe en el límite de la petición tras
 * codificar. La API tiene un límite de 32 MB por petición; 20 MB crudos
 * dan ~27 MB en base64, dejando espacio para el contexto de la conversación.
 */
export const PDF_TARGET_RAW_SIZE = 20 * 1024 * 1024 // 20 MB

/**
 * Número máximo de páginas de un PDF que la API acepta.
 */
export const API_PDF_MAX_PAGES = 100

/**
 * Umbral de tamaño por encima del cual un PDF se extrae a imágenes por
 * página en vez de enviarse como bloque de documento base64. Sólo aplica
 * a la API de primera parte; fuera de ella siempre se extrae.
 */
export const PDF_EXTRACT_SIZE_THRESHOLD = 3 * 1024 * 1024 // 3 MB

/**
 * Tamaño máximo de PDF para el path de extracción por página. Uno más
 * grande se rechaza, para no procesar archivos extremadamente grandes.
 */
export const PDF_MAX_EXTRACT_SIZE = 100 * 1024 * 1024 // 100 MB

/**
 * Páginas máximas que el tool Read extrae en una sola llamada con el
 * parámetro `pages`.
 */
export const PDF_MAX_PAGES_PER_READ = 20

/**
 * Un PDF con más páginas que esto recibe tratamiento de referencia al
 * mencionarse con @, en vez de inyectarse entero en el contexto.
 */
export const PDF_AT_MENTION_INLINE_THRESHOLD = 10

// =============================================================================
// LÍMITES DE MEDIOS
// =============================================================================

/**
 * Número máximo de medios (imágenes + PDFs) por petición a la API. La API
 * rechaza el exceso con un error confuso; se valida del lado del cliente
 * para dar un mensaje claro.
 */
export const API_MAX_MEDIA_PER_REQUEST = 100
