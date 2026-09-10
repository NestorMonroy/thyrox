/**
 * Porte PARCIAL DECLARADO de `ccnmt: packages/storage/src/pdfUtils.ts`.
 *
 * La fuente exporta cuatro símbolos: `DOCUMENT_EXTENSIONS`,
 * `parsePDFPageRange`, `isPDFSupported`, `isPDFExtension`. Este archivo
 * porta los TRES que `pdfUtils.test.ts` ejercita:
 *
 *   - `DOCUMENT_EXTENSIONS` — portada VERBATIM (el `Set` de una sola
 *     entrada, `'pdf'`).
 *   - `parsePDFPageRange` — portada VERBATIM (las tres formas de rango:
 *     página suelta, cerrado "N-M", abierto "N-").
 *   - `isPDFExtension` — portada VERBATIM.
 *
 * Queda SIN portar, por divergencia de alcance declarada:
 *
 *   - `isPDFSupported` — depende de `getMainLoopModel`
 *     (`@claude-code-how-works/provider/model.js`); el paquete `provider`
 *     no existe en este árbol y ningún test de esta suite lo ejercita.
 */

// Extensiones de documento que se manejan de forma especial.
export const DOCUMENT_EXTENSIONS = new Set(['pdf'])

/**
 * Parsea un string de rango de páginas a números firstPage/lastPage.
 */
export function parsePDFPageRange(
  pages: string,
): { firstPage: number; lastPage: number } | null {
  const trimmed = pages.trim()
  if (!trimmed) {
    return null
  }

  // Rango abierto "N-"
  if (trimmed.endsWith('-')) {
    const first = parseInt(trimmed.slice(0, -1), 10)
    if (isNaN(first) || first < 1) {
      return null
    }
    return { firstPage: first, lastPage: Infinity }
  }

  const dashIndex = trimmed.indexOf('-')
  if (dashIndex === -1) {
    const page = parseInt(trimmed, 10)
    if (isNaN(page) || page < 1) {
      return null
    }
    return { firstPage: page, lastPage: page }
  }

  // Rango: "1-10"
  const first = parseInt(trimmed.slice(0, dashIndex), 10)
  const last = parseInt(trimmed.slice(dashIndex + 1), 10)
  if (isNaN(first) || isNaN(last) || first < 1 || last < 1 || last < first) {
    return null
  }
  return { firstPage: first, lastPage: last }
}

/**
 * Verifica si una extensión de archivo es un documento PDF.
 */
export function isPDFExtension(ext: string): boolean {
  const normalized = ext.startsWith('.') ? ext.slice(1) : ext
  return DOCUMENT_EXTENSIONS.has(normalized.toLowerCase())
}
