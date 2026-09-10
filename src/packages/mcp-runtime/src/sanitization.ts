/**
 * Porte COMPLETO de `ccnmt: packages/mcp-runtime/src/sanitization.ts` — sus
 * 2 exportaciones (`partiallySanitizeUnicode` y las 4 sobrecargas + el
 * cuerpo de `recursivelySanitizeUnicode`), ninguna omitida. Sin imports en
 * la fuente.
 *
 * Saneamiento Unicode para mitigar ataques de caracteres ocultos.
 *
 * Este módulo implementa medidas de seguridad contra ataques Unicode de
 * caracteres ocultos, específicamente dirigidos a vulnerabilidades de ASCII
 * Smuggling e inyección de prompt oculta. Estos ataques usan caracteres
 * Unicode invisibles (como caracteres Tag, controles de formato, áreas de
 * uso privado y no-caracteres) para ocultar instrucciones maliciosas que
 * son invisibles para el usuario pero que sí procesan los modelos de IA.
 *
 * La vulnerabilidad se demostró en el reporte HackerOne #3086545 contra la
 * implementación de MCP (Model Context Protocol) de Claude Desktop, donde un
 * atacante podía inyectar instrucciones ocultas usando caracteres Unicode
 * Tag que Claude ejecutaba sin que el usuario las viera.
 *
 * Referencia: https://embracethered.com/blog/posts/2024/hiding-and-finding-text-with-unicode-tags/
 *
 * Esta implementación protege en cuatro frentes:
 * 1. Aplica normalización Unicode NFKC para manejar secuencias de
 *    caracteres compuestos.
 * 2. Elimina categorías Unicode peligrosas preservando el texto y el
 *    formato legítimos.
 * 3. Soporta saneamiento recursivo de estructuras de datos anidadas.
 * 4. Mantiene el rendimiento con procesamiento de regex eficiente.
 *
 * El saneamiento está siempre activo para proteger contra estos ataques.
 */

export function partiallySanitizeUnicode(prompt: string): string {
  let current = prompt
  let previous = ''
  let iterations = 0
  const MAX_ITERATIONS = 10 // Límite de seguridad para evitar bucles infinitos

  // Sanea iterativamente hasta que no haya más cambios o se llegue al
  // máximo de iteraciones.
  while (current !== previous && iterations < MAX_ITERATIONS) {
    previous = current

    // Aplica normalización NFKC para manejar secuencias de caracteres
    // compuestos.
    current = current.normalize('NFKC')

    // Elimina categorías Unicode peligrosas usando rangos de caracteres
    // explícitos.

    // Método 1: quita las clases de propiedad Unicode peligrosas. Es la
    // defensa primaria y la solución que usan ampliamente las librerías
    // de código abierto.
    current = current.replace(/[\p{Cf}\p{Co}\p{Cn}]/gu, '')

    // Método 2: rangos de caracteres explícitos. El método anterior tiene
    // fallas sutiles en algunos entornos que no soportan clases de
    // propiedad Unicode en regex, así que también se implementa un
    // respaldo que quita algunos rangos peligrosos conocidos.
    current = current
      .replace(/[\u200B-\u200F]/g, '') // Espacios de ancho cero, marcas LTR/RTL
      .replace(/[\u202A-\u202E]/g, '') // Caracteres de formato direccional
      .replace(/[\u2066-\u2069]/g, '') // Aislantes direccionales
      .replace(/[\uFEFF]/g, '') // Marca de orden de bytes
      .replace(/[\uE000-\uF8FF]/g, '') // Plano multilingüe básico, uso privado

    iterations++
  }

  // Si se llega al máximo de iteraciones, falla ruidosamente. Esto sólo
  // debería pasar si hay un bug o si alguien construyó a propósito una
  // cadena Unicode profundamente anidada.
  if (iterations >= MAX_ITERATIONS) {
    throw new Error(
      `Unicode sanitization reached maximum iterations (${MAX_ITERATIONS}) for input: ${prompt.slice(0, 100)}`,
    )
  }

  return current
}

export function recursivelySanitizeUnicode(value: string): string
export function recursivelySanitizeUnicode<T>(value: T[]): T[]
export function recursivelySanitizeUnicode<T extends object>(value: T): T
export function recursivelySanitizeUnicode<T>(value: T): T
export function recursivelySanitizeUnicode(value: unknown): unknown {
  if (typeof value === 'string') {
    return partiallySanitizeUnicode(value)
  }

  if (Array.isArray(value)) {
    return value.map(recursivelySanitizeUnicode)
  }

  if (value !== null && typeof value === 'object') {
    const sanitized: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value)) {
      sanitized[recursivelySanitizeUnicode(key)] =
        recursivelySanitizeUnicode(val)
    }
    return sanitized
  }

  // Devuelve sin cambios el resto de valores primitivos (números,
  // booleanos, null, undefined).
  return value
}
