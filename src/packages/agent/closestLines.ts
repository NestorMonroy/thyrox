/**
 * Las líneas de un archivo más parecidas a un texto que no aparece en él.
 *
 * Lo usan los dos `Edit` —el del bucle propio (`@thyrox/tools`) y el del
 * cliente portado (`@thyrox/tool-registry`)— para que un rechazo de
 * `old_string` diga qué texto existe, no sólo que falló (medido 2026-10-04:
 * un modelo local reenvió con otras comillas y escapes de regex una línea que
 * estaba ahí, y acabó reescribiendo el archivo entero). Sólo informa: nunca
 * decide qué se reemplaza.
 */

/** Parecido mínimo (Dice sobre bigramas) para ofrecer una línea como candidata. */
const CLOSEST_LINE_MIN_SCORE = 0.6
const CLOSEST_LINE_LIMIT = 3

/**
 * La forma con que se comparan una línea del archivo y lo pedido: sin la
 * sangría. Las comillas cambiadas y los escapes de regex no se normalizan: el
 * parecido por bigramas ya los tolera (anulación medida: retirar esa
 * normalización no cambió ningún veredicto). Sólo compara; nunca decide qué
 * se reemplaza.
 */
function comparableLine(text: string): string {
  return text.trim()
}

function bigrams(text: string): Map<string, number> {
  const counts = new Map<string, number>()
  for (let i = 0; i < text.length - 1; i++) {
    const pair = text.slice(i, i + 2)
    counts.set(pair, (counts.get(pair) ?? 0) + 1)
  }
  return counts
}

function similarity(search: string, line: string): number {
  if (search === '' || line === '') return 0
  if (line.includes(search)) return 1
  const left = bigrams(search)
  const right = bigrams(line)
  let shared = 0
  for (const [pair, count] of left) shared += Math.min(count, right.get(pair) ?? 0)
  const total = Math.max(search.length - 1, 0) + Math.max(line.length - 1, 0)
  return total === 0 ? 0 : (2 * shared) / total
}

/**
 * Las líneas del archivo más parecidas a la primera línea no vacía de lo
 * pedido, con su número (desde 1) y su texto EXACTO. Las usa el rechazo de un
 * `old_string` que no aparece: sin ellas el modelo sólo sabe que falló, no qué
 * texto existe (medido: tres intentos con otras comillas y un escape de regex
 * contra una línea que estaba ahí, y abandono).
 */
export function closestLines(
  fileContent: string,
  searchString: string,
): { line: number; text: string }[] {
  const first = searchString.split(/\r?\n/).find(part => part.trim() !== '')
  if (first === undefined) return []
  const wanted = comparableLine(first)
  return fileContent
    .split(/\r?\n/)
    .map((text, index) => ({ line: index + 1, text, score: similarity(wanted, comparableLine(text)) }))
    .filter(candidate => candidate.score >= CLOSEST_LINE_MIN_SCORE)
    .sort((a, b) => b.score - a.score || a.line - b.line)
    .slice(0, CLOSEST_LINE_LIMIT)
    .map(({ line, text }) => ({ line, text }))
}
