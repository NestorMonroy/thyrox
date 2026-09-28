/**
 * Lo que la CLI muestra de una conexión: sus datos de identidad y estado,
 * nunca una clave ni un token. La tabla tiene las columnas de la referencia
 * —id corto, proveedor, nombre y estado— sin color, que es decoración de
 * terminal y no dato.
 *
 * Porte de `publicConnection` y `printProviderTable` en
 * `omniroute: bin/cli/commands/providers.mjs` (MIT).
 */
type Row = Record<string, unknown>

const PUBLIC_FIELDS = ['id', 'provider', 'name', 'authType', 'isActive', 'testStatus', 'lastTested', 'lastError', 'defaultModel'] as const
const SHORT_ID_LENGTH = 8

export function publicConnection(row: Row): Row {
  return Object.fromEntries(PUBLIC_FIELDS.map(field => [field, row[field]]))
}

export function formatConnectionTable(rows: readonly Row[]): string {
  if (rows.length === 0) return 'No providers configured.\n'
  return rows
    .map(row => {
      const status = typeof row.testStatus === 'string' && row.testStatus ? row.testStatus : 'unknown'
      return `${String(row.id).slice(0, SHORT_ID_LENGTH).padEnd(10)} ${String(row.provider).padEnd(14)} ${String(row.name).padEnd(24)} ${status}\n`
    })
    .join('')
}
