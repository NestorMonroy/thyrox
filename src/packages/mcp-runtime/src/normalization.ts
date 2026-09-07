/**
 * Porte COMPLETO de `ccnmt: packages/mcp-runtime/src/normalization.ts` — su
 * única exportación, ninguna omitida. Sin imports en la fuente (a propósito
 * — evita ciclos de import, según su propio comentario).
 */

// Los nombres de servidor de claude.ai llevan este prefijo.
const CLAUDEAI_SERVER_PREFIX = 'claude.ai '

/**
 * Normaliza nombres de servidor para que cumplan el patrón de la API
 * `^[a-zA-Z0-9_-]{1,64}$`. Reemplaza cualquier carácter inválido (incluidos
 * puntos y espacios) por guiones bajos.
 *
 * Para servidores de claude.ai (nombres que empiezan con "claude.ai "),
 * además colapsa guiones bajos consecutivos y quita los guiones bajos al
 * inicio/final, para no interferir con el delimitador `__` que usan los
 * nombres de herramienta de MCP.
 */
export function normalizeNameForMCP(name: string): string {
  let normalized = name.replace(/[^a-zA-Z0-9_-]/g, '_')
  if (name.startsWith(CLAUDEAI_SERVER_PREFIX)) {
    normalized = normalized.replace(/_+/g, '_').replace(/^_|_$/g, '')
  }
  return normalized
}
