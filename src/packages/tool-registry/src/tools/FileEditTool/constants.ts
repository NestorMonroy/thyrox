/**
 * El nombre del útil de edición y los patrones de permiso que lo acompañan.
 *
 * Procedencia: `ccnmt: packages/tool-registry/src/tools/FileEditTool/
 * constants.ts` (4 símbolos exportados). Ese árbol declara
 * `"license": "UNLICENSED"`, así que el cuerpo se **reimplementa** y no se
 * copia.
 *
 * ESTE ARCHIVO NO IMPORTA NADA, Y ESA ES SU RAZÓN DE EXISTIR. La fuente lo
 * declara en su primera línea —«In its own file to avoid circular
 * dependencies»—: el útil de edición y el de TodoWrite se citan por nombre
 * en direcciones opuestas, y con las constantes dentro del útil el ciclo se
 * cierra. Un `import` aquí lo reintroduce.
 *
 * DIVERGENCIA DECLARADA: ninguna.
 */

/** El nombre con que el útil de edición viaja en el protocolo. */
export const FILE_EDIT_TOOL_NAME = 'Edit'

/** Patrón que concede acceso de sesión a la carpeta de configuración del proyecto. */
export const CLAUDE_FOLDER_PERMISSION_PATTERN = '/.claude/**'

/** Patrón que concede acceso de sesión a la carpeta de configuración global. */
export const GLOBAL_CLAUDE_FOLDER_PERMISSION_PATTERN = '~/.claude/**'

/**
 * El error de un archivo que cambió entre la lectura y la escritura.
 *
 * El texto ordena releer, no reintentar: reintentar a ciegas sobrescribiría
 * el cambio de quien lo tocó en medio.
 */
export const FILE_UNEXPECTEDLY_MODIFIED_ERROR =
  'File has been unexpectedly modified. Read it again before attempting to write it.'
