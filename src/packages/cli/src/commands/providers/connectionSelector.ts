/**
 * Resuelve el selector con que el usuario nombra una conexión: id exacto,
 * prefijo de id, nombre exacto y proveedor, en ese orden, sin distinguir
 * mayúsculas; el proveedor se compara por su id canónico, así que `anthropic`
 * encuentra una fila `claude` (`providerId.ts`). Un nivel con más de una
 * coincidencia es ambiguo y lo dice, nombrando los candidatos, en vez de
 * elegir uno.
 *
 * Porte de `findConnectionFromResponse` en
 * `omniroute: bin/cli/commands/provider-crud.mjs` (MIT).
 */
import { canonicalProviderId } from './providerId.ts'

type Row = Record<string, unknown>

const text = (value: unknown): string => String(value ?? '').toLowerCase()
const sameProvider = (stored: unknown, needle: string): boolean => canonicalProviderId(text(stored)) === canonicalProviderId(needle)

export function resolveConnection<T extends Row>(rows: readonly T[], selector: string): T | null {
  const needle = selector.trim().toLowerCase()
  if (!needle) return null
  const selectUnique = (matches: T[]): T | null => {
    if (matches.length <= 1) return matches[0] ?? null
    const candidates = matches.map(row => String(row.id ?? '<missing-id>')).join(', ')
    throw new Error(`Provider connection selector '${selector}' is ambiguous: ${candidates}`)
  }
  return (
    selectUnique(rows.filter(row => text(row.id) === needle)) ??
    selectUnique(rows.filter(row => text(row.id).startsWith(needle))) ??
    selectUnique(rows.filter(row => text(row.name) === needle)) ??
    selectUnique(rows.filter(row => sameProvider(row.provider, needle)))
  )
}
