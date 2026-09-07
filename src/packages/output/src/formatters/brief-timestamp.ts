/**
 * Puerto de `ccnmt: packages/output/src/formatters/brief-timestamp.ts`
 * (verbatim — sin imports en la fuente).
 */

/**
 * Formatea un timestamp ISO para la linea de etiqueta del mensaje
 * breve/chat.
 *
 * La visualizacion escala con la antiguedad (como una app de mensajeria):
 *   - mismo dia:      "1:30 PM" o "13:30" (depende del locale)
 *   - hasta 6 dias:   "Sunday, 4:15 PM" (depende del locale)
 *   - mas antiguo:    "Sunday, Feb 20, 4:30 PM" (depende del locale)
 *
 * Respeta las variables de entorno POSIX (LC_ALL > LC_TIME > LANG) para
 * el formato de hora (12h/24h), nombres de dia, nombres de mes y
 * estructura general. `toLocaleString(undefined)` de Bun/V8 las ignora en
 * macOS, asi que aqui se convierten a etiquetas BCP 47 a mano.
 *
 * `now` es inyectable para los tests.
 */
export function formatBriefTimestamp(
  isoString: string,
  now: Date = new Date(),
): string {
  const d = new Date(isoString)
  if (Number.isNaN(d.getTime())) {
    return ''
  }

  const locale = getLocale()
  const dayDiff = startOfDay(now) - startOfDay(d)
  const daysAgo = Math.round(dayDiff / 86_400_000)

  if (daysAgo === 0) {
    return d.toLocaleTimeString(locale, {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  if (daysAgo > 0 && daysAgo < 7) {
    return d.toLocaleString(locale, {
      weekday: 'long',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return d.toLocaleString(locale, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * Deriva una etiqueta de locale BCP 47 desde variables de entorno POSIX.
 * LC_ALL > LC_TIME > LANG, cae a undefined (default del sistema).
 * Convierte formato POSIX (en_GB.UTF-8) a BCP 47 (en-GB).
 */
function getLocale(): string | undefined {
  const raw =
    process.env.LC_ALL || process.env.LC_TIME || process.env.LANG || ''
  if (!raw || raw === 'C' || raw === 'POSIX') {
    return undefined
  }
  // Retira codeset (.UTF-8) y modificador (@euro), reemplaza _ por -
  const base = raw.split('.')[0]!.split('@')[0]!
  if (!base) {
    return undefined
  }
  const tag = base.replaceAll('_', '-')
  // Valida construyendo un Intl locale — etiquetas invalidas lanzan
  try {
    new Intl.DateTimeFormat(tag)
    return tag
  } catch {
    return undefined
  }
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}
