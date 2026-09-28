/**
 * Lo que distingue a SQLite de PostgreSQL para la base de errores, en un solo
 * sitio. `Bun.SQL` da la misma API a los dos; difieren en cómo viajan y vuelven
 * tres tipos, medidos contra los dos motores:
 *
 * - el id: número en SQLite, `BIGINT` devuelto como texto en PostgreSQL;
 * - el momento: texto en SQLite, `TIMESTAMPTZ` devuelto como `Date`;
 * - el JSON: SQLite lo guarda como texto; a una columna `JSONB` hay que pasarle
 *   el objeto, porque una cadena se guarda como cadena JSON, doblemente
 *   codificada.
 */
export const DIALECTS = ['sqlite', 'postgres'] as const
export type Dialect = (typeof DIALECTS)[number]

/** El motor que nombra una URL de base de datos, o `null` si no es uno admitido. */
export function dialectOf(url: string): Dialect | null {
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(url)?.[1]?.toLowerCase()
  if (scheme === 'sqlite' || scheme === 'file') return 'sqlite'
  if (scheme === 'postgres' || scheme === 'postgresql') return 'postgres'
  return null
}

export function jsonParam(dialect: Dialect, value: unknown): unknown {
  return dialect === 'postgres' ? value : JSON.stringify(value)
}

export function readJson(value: unknown): Record<string, unknown> {
  return (typeof value === 'string' ? JSON.parse(value) : value) as Record<string, unknown>
}

export function readTimestamp(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value)
}

export function readId(value: unknown): number {
  return Number(value)
}
