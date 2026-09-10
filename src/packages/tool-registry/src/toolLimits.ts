/**
 * Puerto de `ccnmt: packages/tool-registry/src/toolLimits.ts` (56 líneas,
 * 6 símbolos). Los topes de tamaño del resultado de una herramienta.
 *
 * SON EL TECHO DEL SISTEMA, no una sugerencia: una herramienta puede
 * declarar un `maxResultSizeChars` MENOR y se respeta, pero ninguna puede
 * subir por encima de esto. Al excederse, el resultado se persiste a disco
 * y el modelo recibe una vista previa con la ruta en vez del contenido.
 */

/** Tope por resultado antes de persistir a disco y devolver una vista previa. */
export const DEFAULT_MAX_RESULT_SIZE_CHARS = 50_000

/** Tope por resultado en tokens — cota superior para que uno solo no coma el contexto. */
export const MAX_TOOL_RESULT_TOKENS = 100_000

/** Estimación conservadora de bytes por token; el conteo real varía. */
export const BYTES_PER_TOKEN = 4

/**
 * El tope en bytes se DERIVA de los dos anteriores. Escribirlo a mano
 * dejaría dos fuentes de verdad: subir el tope en tokens dejaría atrás al
 * de bytes sin que nada lo delatara.
 */
export const MAX_TOOL_RESULT_BYTES = MAX_TOOL_RESULT_TOKENS * BYTES_PER_TOKEN

/**
 * Tope AGREGADO de los bloques de resultado dentro de UN mensaje de
 * usuario — la tanda de herramientas paralelas de un turno. Los mensajes se
 * evalúan por separado: 150K en un turno y 150K en el siguiente no se tocan.
 *
 * Existe porque el tope por herramienta no acota la suma: diez herramientas
 * en paralelo, cada una debajo de su límite, producen 400K en un solo turno.
 */
export const MAX_TOOL_RESULTS_PER_MESSAGE_CHARS = 200_000

/** Largo máximo del resumen de una herramienta en las vistas compactas. */
export const TOOL_SUMMARY_MAX_LENGTH = 50
