/**
 * Sustituto local de
 * `@claude-code-how-works/repl/diagnostics/debugFilter.js` — verbatim a
 * `repl/src/diagnostics/debugFilter.ts` (157 líneas, sólo depende de
 * `lodash-es/memoize` en la propia fuente). El paquete `repl` no existe
 * en este árbol (ninguna ola lo ha portado todavía); esta lógica es pura
 * (parseo de cadena + filtrado), no pertenece de verdad a otro dominio
 * con estado — se reimplementa fiel en vez de declararse como punto de
 * inyección.
 *
 * Sólo lo usa `debug.ts` de este paquete (`DebugFilter`, `parseDebugFilter`,
 * `shouldShowDebugMessage`). `extractDebugCategories`/
 * `shouldShowDebugCategories` se conservan porque `shouldShowDebugMessage`
 * las usa internamente.
 */

import memoize from 'lodash-es/memoize.js'

export type DebugFilter = {
  include: string[]
  exclude: string[]
  isExclusive: boolean
}

/**
 * Parsea la cadena de filtro de debug en una configuración de filtro.
 * Ejemplos:
 * - "api,hooks" -> incluye sólo las categorías api y hooks
 * - "!1p,!file" -> excluye las categorías logging y file
 * - undefined/vacío -> sin filtrado (muestra todo)
 */
export const parseDebugFilter = memoize(
  (filterString?: string): DebugFilter | null => {
    if (!filterString || filterString.trim() === '') {
      return null
    }

    const filters = filterString
      .split(',')
      .map(f => f.trim())
      .filter(Boolean)

    if (filters.length === 0) {
      return null
    }

    const hasExclusive = filters.some(f => f.startsWith('!'))
    const hasInclusive = filters.some(f => !f.startsWith('!'))

    if (hasExclusive && hasInclusive) {
      // Filtros mixtos inclusivo/exclusivo: se trata como caso de error y
      // se muestran todos los mensajes (silencioso, igual que la fuente).
      return null
    }

    const cleanFilters = filters.map(f => f.replace(/^!/, '').toLowerCase())

    return {
      include: hasExclusive ? [] : cleanFilters,
      exclude: hasExclusive ? cleanFilters : [],
      isExclusive: hasExclusive,
    }
  },
)

/**
 * Extrae categorías de debug de un mensaje. Soporta varios patrones:
 * - "category: message" -> ["category"]
 * - "[CATEGORY] message" -> ["category"]
 * - `MCP server "name": message` -> ["mcp", "name"]
 * - "[ANT-ONLY] 1P event: tengu_timer" -> ["ant-only", "1p"]
 *
 * Devuelve categorías en minúscula para comparación sin distinguir caja.
 */
export function extractDebugCategories(message: string): string[] {
  const categories: string[] = []

  const mcpMatch = message.match(/^MCP server ["']([^"']+)["']/)
  if (mcpMatch && mcpMatch[1]) {
    categories.push('mcp')
    categories.push(mcpMatch[1].toLowerCase())
  } else {
    const prefixMatch = message.match(/^([^:[]+):/)
    if (prefixMatch && prefixMatch[1]) {
      categories.push(prefixMatch[1].trim().toLowerCase())
    }
  }

  const bracketMatch = message.match(/^\[([^\]]+)]/)
  if (bracketMatch && bracketMatch[1]) {
    categories.push(bracketMatch[1].trim().toLowerCase())
  }

  if (message.toLowerCase().includes('1p event:')) {
    categories.push('1p')
  }

  const secondaryMatch = message.match(
    /:\s*([^:]+?)(?:\s+(?:type|mode|status|event))?:/,
  )
  if (secondaryMatch && secondaryMatch[1]) {
    const secondary = secondaryMatch[1].trim().toLowerCase()
    if (secondary.length < 30 && !secondary.includes(' ')) {
      categories.push(secondary)
    }
  }

  return Array.from(new Set(categories))
}

/**
 * Determina si un mensaje de debug debe mostrarse dadas sus categorías
 * ya extraídas y el filtro parseado.
 */
export function shouldShowDebugCategories(
  categories: string[],
  filter: DebugFilter | null,
): boolean {
  if (!filter) {
    return true
  }

  if (categories.length === 0) {
    // En modo exclusivo, los mensajes sin categoría se excluyen por
    // defecto (seguridad). En modo inclusivo también se excluyen (deben
    // coincidir con alguna categoría).
    return false
  }

  if (filter.isExclusive) {
    return !categories.some(cat => filter.exclude.includes(cat))
  } else {
    return categories.some(cat => filter.include.includes(cat))
  }
}

/**
 * Función principal: combina extracción + filtrado para decidir si un
 * mensaje de debug debe mostrarse.
 */
export function shouldShowDebugMessage(
  message: string,
  filter: DebugFilter | null,
): boolean {
  if (!filter) {
    return true
  }
  const categories = extractDebugCategories(message)
  return shouldShowDebugCategories(categories, filter)
}
