/**
 * Puerto de `ccnmt: packages/config/utils/markdownDescription.ts` (26
 * líneas fuente). No es uno de los 15 del alcance — es la dependencia de
 * hoja que `plugin/_deps.ts` necesita como import estático de su propia
 * capa: sin dependencias propias, se porta en el sitio.
 *
 * Extrae una descripción de contenido markdown. Usa la primera línea no
 * vacía como descripción, o cae a un default.
 */
export function extractDescriptionFromMarkdown(
  content: string,
  defaultDescription: string = 'Custom item',
): string {
  const lines = content.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed) {
      // Si es un encabezado, quita el prefijo de encabezado.
      const headerMatch = trimmed.match(/^#+\s+(.+)$/)
      const text = headerMatch?.[1] ?? trimmed

      // Devuelve el texto, acotado a un largo razonable.
      return text.length > 100 ? text.substring(0, 97) + '...' : text
    }
  }
  return defaultDescription
}
