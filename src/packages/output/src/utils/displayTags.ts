/**
 * Puerto de `ccnmt: packages/output/src/utils/displayTags.ts` (verbatim —
 * sin imports en la fuente).
 */

/**
 * Coincide con cualquier bloque tipo XML `<tag>…</tag>` (nombres de tag en
 * minuscula, atributos opcionales, contenido multi-linea). Se usa para
 * quitar tags envolventes inyectados por el sistema de los titulos que se
 * muestran — contexto de IDE, marcadores de slash-command, salida de
 * hooks, notificaciones de tarea, mensajes de canal, etc. Un patron
 * generico evita mantener una lista blanca creciente que se queda atras
 * cuando aparecen nuevos tipos de notificacion.
 *
 * Solo coincide con nombres de tag en minuscula (`[a-z][\w-]*`) para que
 * la prosa del usuario que menciona componentes JSX/HTML ("fix the
 * <Button> layout", "<!DOCTYPE html>") pase de largo — esos empiezan con
 * mayuscula o `!`. El cuerpo no-codicioso con un tag de cierre por
 * backreference mantiene separados los bloques adyacentes; los angulos
 * sin pareja ("when x < y") no coinciden.
 */
const XML_TAG_BLOCK_PATTERN = /<([a-z][\w-]*)(?:\s[^>]*)?>[\s\S]*?<\/\1>\n?/g

/**
 * Quita bloques de tag tipo XML del texto para usarlo en titulos de UI
 * (/rewind, /resume, titulos de sesion de bridge). El contexto inyectado
 * por el sistema — metadata de IDE, salida de hooks, notificaciones de
 * tarea — llega envuelto en tags y nunca deberia aparecer como titulo.
 *
 * Si quitar los tags dejara el texto vacio, devuelve el original sin
 * cambios (mejor mostrar algo que nada).
 */
export function stripDisplayTags(text: string): string {
  const result = text.replace(XML_TAG_BLOCK_PATTERN, '').trim()
  return result || text
}

/**
 * Como stripDisplayTags pero devuelve cadena vacia cuando todo el
 * contenido es tags. Lo usa getLogDisplayTitle para detectar prompts que
 * son solo un comando (p. ej. /clear) para que caigan al siguiente
 * fallback de titulo, y extractTitleText para saltar mensajes puramente
 * XML durante la derivacion de titulo de bridge.
 */
export function stripDisplayTagsAllowEmpty(text: string): string {
  return text.replace(XML_TAG_BLOCK_PATTERN, '').trim()
}

const IDE_CONTEXT_TAGS_PATTERN =
  /<(ide_opened_file|ide_selection)(?:\s[^>]*)?>[\s\S]*?<\/\1>\n?/g

/**
 * Quita solo los tags de contexto inyectados por el IDE (ide_opened_file,
 * ide_selection). Lo usa textForResubmit para que la flecha-arriba de
 * reenvio preserve el contenido escrito por el usuario, incluido HTML en
 * minuscula como `<code>foo</code>`, mientras descarta el ruido del IDE.
 */
export function stripIdeContextTags(text: string): string {
  return text.replace(IDE_CONTEXT_TAGS_PATTERN, '').trim()
}
