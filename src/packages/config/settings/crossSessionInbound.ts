/**
 * Saneo de `crossSessionInbound` antes de validar un archivo de settings:
 * porte de `Oy`, `wy`, `ud`, `cd`, `je` y `ye` (`chunk-379zyrv7.js`) de
 * 2.1.283.
 *
 * Un valor inválido no invalida el archivo entero. Fuera de managed settings
 * se retira y se avisa: mientras siga escrito, la política de entrada queda
 * en retener. En managed settings se sustituye por `refuse`, el nivel más
 * restrictivo, y el aviso es sólo de estado.
 */
import type { SettingsError } from './validation.ts'

export const CROSS_SESSION_INBOUND_LEVELS = ['accept', 'hold', 'refuse'] as const

const SETTING_KEY = 'crossSessionInbound'
/** `je`: una cadena que se puede reproducir en el mensaje sin riesgo. */
const PRINTABLE_VALUE = /^[A-Za-z0-9_$.-]{1,40}$/
const EXPECTED = CROSS_SESSION_INBOUND_LEVELS.map(level => `"${level}"`).join(', ')

const HELD_SUFFIX =
  'This value was ignored; while it is present, cross-session messages are held for your approval instead of being delivered. Set it to one of the values above.'
const REFUSED_SUFFIX =
  'In managed settings an unrecognized value is treated as "refuse" (the most restrictive): cross-session messages to this session are turned away until an administrator fixes it.'

/** `ye`: cómo se nombra un valor recibido que no es una cadena. */
function receivedKind(value: unknown): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

/** `ud`: qué se esperaba y qué llegó. */
export function describeInvalidLevel(value: unknown): string {
  const received = typeof value === 'string' ? `"${PRINTABLE_VALUE.test(value) ? value : '<value>'}"` : receivedKind(value)
  return `must be one of ${EXPECTED}; received ${received}`
}

function isValidLevel(value: unknown): boolean {
  return (CROSS_SESSION_INBOUND_LEVELS as readonly unknown[]).includes(value)
}

/**
 * `Oy`/`wy`: retira o sustituye un `crossSessionInbound` inválido en `data`,
 * en su sitio, y devuelve el aviso. Un valor válido o ausente no produce nada.
 */
export function sanitizeCrossSessionInbound(
  data: unknown,
  file: string,
  { policySource = false }: { policySource?: boolean } = {},
): SettingsError[] {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return []
  const record = data as Record<string, unknown>
  if (!(SETTING_KEY in record) || isValidLevel(record[SETTING_KEY])) return []
  const description = `"${SETTING_KEY}" ${describeInvalidLevel(record[SETTING_KEY])}.`
  if (policySource) {
    record[SETTING_KEY] = 'refuse'
    return [{ file, path: SETTING_KEY, message: `${description} ${REFUSED_SUFFIX}`, severity: 'warning', expected: EXPECTED, statusOnly: true }]
  }
  delete record[SETTING_KEY]
  return [{ file, path: SETTING_KEY, message: `${description} ${HELD_SUFFIX}`, severity: 'warning', expected: EXPECTED }]
}
