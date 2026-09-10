/**
 * Parseo del presupuesto de tokens desde texto libre — porte de
 * `ccnmt: packages/agent/tokenBudget.ts`.
 *
 * Es un módulo distinto de `internal/tokenBudget.ts` (que decide continuar o
 * parar dado un presupuesto ya numérico): éste extrae el NÚMERO de una
 * instrucción en lenguaje natural, en dos formas — taquigráfica (`+500k`,
 * anclada al inicio o al final para no confundirse con prosa) y verbosa
 * (`use/spend 2M tokens`, que sí puede aparecer en medio de la oración).
 */

// La forma taquigráfica se ancla a inicio/fin para evitar falsos positivos
// en lenguaje natural. La forma verbosa (use/spend N tokens) sí matchea en
// cualquier posición.
const SHORTHAND_START_RE = /^\s*\+(\d+(?:\.\d+)?)\s*(k|m|b)\b/i
// El lookbehind (?<=\s) se evita — derrota al JIT YARR de JSC, y el
// intérprete recorre O(n) igual aunque haya anclaje $. Se captura el
// espacio en blanco en su lugar; quien llama desplaza match.index en 1
// donde la posición importa.
const SHORTHAND_END_RE = /\s\+(\d+(?:\.\d+)?)\s*(k|m|b)\s*[.!?]?\s*$/i
const VERBOSE_RE = /\b(?:use|spend)\s+(\d+(?:\.\d+)?)\s*(k|m|b)\s*tokens?\b/i
const VERBOSE_RE_G = new RegExp(VERBOSE_RE.source, 'gi')

const MULTIPLIERS: Record<string, number> = {
  k: 1_000,
  m: 1_000_000,
  b: 1_000_000_000,
}

function parseBudgetMatch(value: string, suffix: string): number {
  return parseFloat(value) * MULTIPLIERS[suffix.toLowerCase()]!
}

/** Extrae el presupuesto de tokens de un texto libre, o `null` si no hay ninguno. */
export function parseTokenBudget(text: string): number | null {
  const startMatch = text.match(SHORTHAND_START_RE)
  if (startMatch) return parseBudgetMatch(startMatch[1]!, startMatch[2]!)
  const endMatch = text.match(SHORTHAND_END_RE)
  if (endMatch) return parseBudgetMatch(endMatch[1]!, endMatch[2]!)
  const verboseMatch = text.match(VERBOSE_RE)
  if (verboseMatch) return parseBudgetMatch(verboseMatch[1]!, verboseMatch[2]!)
  return null
}

/** Todas las posiciones donde el texto declara un presupuesto de tokens. */
export function findTokenBudgetPositions(
  text: string,
): Array<{ start: number; end: number }> {
  const positions: Array<{ start: number; end: number }> = []
  const startMatch = text.match(SHORTHAND_START_RE)
  if (startMatch) {
    const offset =
      startMatch.index! +
      startMatch[0].length -
      startMatch[0].trimStart().length
    positions.push({
      start: offset,
      end: startMatch.index! + startMatch[0].length,
    })
  }
  const endMatch = text.match(SHORTHAND_END_RE)
  if (endMatch) {
    // Evita el doble conteo cuando el texto es solo "+500k".
    const endStart = endMatch.index! + 1 // +1: el regex incluye el \s inicial.
    const alreadyCovered = positions.some(
      p => endStart >= p.start && endStart < p.end,
    )
    if (!alreadyCovered) {
      positions.push({
        start: endStart,
        end: endMatch.index! + endMatch[0].length,
      })
    }
  }
  for (const match of text.matchAll(VERBOSE_RE_G)) {
    positions.push({ start: match.index, end: match.index + match[0].length })
  }
  return positions
}

/** El mensaje que se muestra al parar por rendimiento decreciente o por umbral. */
export function getBudgetContinuationMessage(
  pct: number,
  turnTokens: number,
  budget: number,
): string {
  const fmt = (n: number): string => new Intl.NumberFormat('en-US').format(n)
  return `Stopped at ${pct}% of token target (${fmt(turnTokens)} / ${fmt(budget)}). Keep working — do not summarize.`
}
