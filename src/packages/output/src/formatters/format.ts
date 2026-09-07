// Formateadores de pantalla puros — seguros como hoja (sin Ink). El
// truncado consciente de ancho sigue en src/utils/truncate.ts pendiente de
// su propia migracion.
//
// Puerto de `ccnmt: packages/output/src/formatters/format.ts`. Fiel a la
// fuente salvo el ultimo parrafo (comentario), reescrito para reflejar que
// aqui `./truncate.js` NO existe todavia — depende de `stringWidth` de
// `@anthropic/ink` (fork de Ink vendorizado en ccnmt, no publicado en npm;
// ver el analisis de la iniciativa) y de `@thyrox/output` aun no lo tiene
// como hermano enlazado.

import { getRelativeTimeFormat, getTimeZone } from '../utils/intl.js'

/**
 * Formatea una cantidad de bytes en una cadena legible (KB, MB, GB).
 * @example formatFileSize(1536) → "1.5KB"
 */
export function formatFileSize(sizeInBytes: number): string {
  const kb = sizeInBytes / 1024
  if (kb < 1) {
    return `${sizeInBytes} bytes`
  }
  if (kb < 1024) {
    return `${kb.toFixed(1).replace(/\.0$/, '')}KB`
  }
  const mb = kb / 1024
  if (mb < 1024) {
    return `${mb.toFixed(1).replace(/\.0$/, '')}MB`
  }
  const gb = mb / 1024
  return `${gb.toFixed(1).replace(/\.0$/, '')}GB`
}

/**
 * Formatea milisegundos como segundos con 1 decimal (p. ej. `1234` →
 * `"1.2s"`). A diferencia de formatDuration, siempre conserva el decimal —
 * usar para tiempos sub-minuto donde la fraccion de segundo importa (TTFT,
 * duracion de hooks, etc.).
 */
export function formatSecondsShort(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`
}

export function formatDuration(
  ms: number,
  options?: { hideTrailingZeros?: boolean; mostSignificantOnly?: boolean },
): string {
  if (ms < 60000) {
    // Caso especial para 0
    if (ms === 0) {
      return '0s'
    }
    // Para duraciones < 1s, muestra 1 decimal (p. ej. 0.5s)
    if (ms < 1) {
      const s = (ms / 1000).toFixed(1)
      return `${s}s`
    }
    const s = Math.floor(ms / 1000).toString()
    return `${s}s`
  }

  let days = Math.floor(ms / 86400000)
  let hours = Math.floor((ms % 86400000) / 3600000)
  let minutes = Math.floor((ms % 3600000) / 60000)
  let seconds = Math.round((ms % 60000) / 1000)

  // Maneja el acarreo de redondeo (p. ej. 59.5s redondea a 60s)
  if (seconds === 60) {
    seconds = 0
    minutes++
  }
  if (minutes === 60) {
    minutes = 0
    hours++
  }
  if (hours === 24) {
    hours = 0
    days++
  }

  const hide = options?.hideTrailingZeros

  if (options?.mostSignificantOnly) {
    if (days > 0) return `${days}d`
    if (hours > 0) return `${hours}h`
    if (minutes > 0) return `${minutes}m`
    return `${seconds}s`
  }

  if (days > 0) {
    if (hide && hours === 0 && minutes === 0) return `${days}d`
    if (hide && minutes === 0) return `${days}d ${hours}h`
    return `${days}d ${hours}h ${minutes}m`
  }
  if (hours > 0) {
    if (hide && minutes === 0 && seconds === 0) return `${hours}h`
    if (hide && seconds === 0) return `${hours}h ${minutes}m`
    return `${hours}h ${minutes}m ${seconds}s`
  }
  if (minutes > 0) {
    if (hide && seconds === 0) return `${minutes}m`
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
}

// `new Intl.NumberFormat` es caro, asi que cachea los formateadores para
// reusarlos
let numberFormatterForConsistentDecimals: Intl.NumberFormat | null = null
let numberFormatterForInconsistentDecimals: Intl.NumberFormat | null = null
const getNumberFormatter = (
  useConsistentDecimals: boolean,
): Intl.NumberFormat => {
  if (useConsistentDecimals) {
    if (!numberFormatterForConsistentDecimals) {
      numberFormatterForConsistentDecimals = new Intl.NumberFormat('en-US', {
        notation: 'compact',
        maximumFractionDigits: 1,
        minimumFractionDigits: 1,
      })
    }
    return numberFormatterForConsistentDecimals
  } else {
    if (!numberFormatterForInconsistentDecimals) {
      numberFormatterForInconsistentDecimals = new Intl.NumberFormat('en-US', {
        notation: 'compact',
        maximumFractionDigits: 1,
        minimumFractionDigits: 0,
      })
    }
    return numberFormatterForInconsistentDecimals
  }
}

export function formatNumber(number: number): string {
  // Solo usa minimumFractionDigits para numeros que se mostraran en
  // notacion compacta
  const shouldUseConsistentDecimals = number >= 1000

  return getNumberFormatter(shouldUseConsistentDecimals)
    .format(number) // p. ej. "1321" => "1.3K", "900" => "900"
    .toLowerCase() // p. ej. "1.3K" => "1.3k", "1.0K" => "1.0k"
}

export function formatTokens(count: number): string {
  return formatNumber(count).replace('.0', '')
}

type RelativeTimeStyle = 'long' | 'short' | 'narrow'

type RelativeTimeOptions = {
  style?: RelativeTimeStyle
  numeric?: 'always' | 'auto'
}

export function formatRelativeTime(
  date: Date,
  options: RelativeTimeOptions & { now?: Date } = {},
): string {
  const { style = 'narrow', numeric = 'always', now = new Date() } = options
  const diffInMs = date.getTime() - now.getTime()
  // Usa Math.trunc para truncar hacia cero tanto en valores positivos como negativos
  const diffInSeconds = Math.trunc(diffInMs / 1000)

  // Define los intervalos de tiempo con unidades cortas propias
  const intervals = [
    { unit: 'year', seconds: 31536000, shortUnit: 'y' },
    { unit: 'month', seconds: 2592000, shortUnit: 'mo' },
    { unit: 'week', seconds: 604800, shortUnit: 'w' },
    { unit: 'day', seconds: 86400, shortUnit: 'd' },
    { unit: 'hour', seconds: 3600, shortUnit: 'h' },
    { unit: 'minute', seconds: 60, shortUnit: 'm' },
    { unit: 'second', seconds: 1, shortUnit: 's' },
  ] as const

  // Encuentra la unidad apropiada
  for (const { unit, seconds: intervalSeconds, shortUnit } of intervals) {
    if (Math.abs(diffInSeconds) >= intervalSeconds) {
      const value = Math.trunc(diffInSeconds / intervalSeconds)
      // Para el estilo short, usa el formato propio
      if (style === 'narrow') {
        return diffInSeconds < 0
          ? `${Math.abs(value)}${shortUnit} ago`
          : `in ${value}${shortUnit}`
      }
      // Para dias y unidades mayores, usa siempre el estilo long
      return getRelativeTimeFormat('long', numeric).format(value, unit)
    }
  }

  // Para valores menores a 1 segundo
  if (style === 'narrow') {
    return diffInSeconds <= 0 ? '0s ago' : 'in 0s'
  }
  return getRelativeTimeFormat(style, numeric).format(0, 'second')
}

export function formatRelativeTimeAgo(
  date: Date,
  options: RelativeTimeOptions & { now?: Date } = {},
): string {
  const { now = new Date(), ...restOptions } = options
  if (date > now) {
    // Para fechas futuras, solo devuelve el tiempo relativo sin "ago"
    return formatRelativeTime(date, { ...restOptions, now })
  }

  // Para fechas pasadas, fuerza numeric: 'always' para asegurar "X units ago"
  return formatRelativeTime(date, { ...restOptions, numeric: 'always', now })
}

/**
 * Formatea metadata de log para mostrar (hora, tamano o conteo de
 * mensajes, branch, tag, PR)
 */
export function formatLogMetadata(log: {
  modified: Date
  messageCount: number
  fileSize?: number
  gitBranch?: string
  tag?: string
  agentSetting?: string
  prNumber?: number
  prRepository?: string
}): string {
  const sizeOrCount =
    log.fileSize !== undefined
      ? formatFileSize(log.fileSize)
      : `${log.messageCount} messages`
  const parts = [
    formatRelativeTimeAgo(log.modified, { style: 'short' }),
    ...(log.gitBranch ? [log.gitBranch] : []),
    sizeOrCount,
  ]
  if (log.tag) {
    parts.push(`#${log.tag}`)
  }
  if (log.agentSetting) {
    parts.push(`@${log.agentSetting}`)
  }
  if (log.prNumber) {
    parts.push(
      log.prRepository
        ? `${log.prRepository}#${log.prNumber}`
        : `#${log.prNumber}`,
    )
  }
  return parts.join(' · ')
}

export function formatResetTime(
  timestampInSeconds: number | undefined,
  showTimezone: boolean = false,
  showTime: boolean = true,
): string | undefined {
  if (!timestampInSeconds) return undefined

  const date = new Date(timestampInSeconds * 1000)
  const now = new Date()
  const minutes = date.getMinutes()

  // Calcula las horas hasta el reset
  const hoursUntilReset = (date.getTime() - now.getTime()) / (1000 * 60 * 60)

  // Si el reset esta a mas de 24 horas, muestra tambien la fecha
  if (hoursUntilReset > 24) {
    // Muestra fecha y hora para resets a mas de un dia de distancia
    const dateOptions: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      hour: showTime ? 'numeric' : undefined,
      minute: !showTime || minutes === 0 ? undefined : '2-digit',
      hour12: showTime ? true : undefined,
    }

    // Agrega el ano si no es el ano actual
    if (date.getFullYear() !== now.getFullYear()) {
      dateOptions.year = 'numeric'
    }

    const dateString = date.toLocaleString('en-US', dateOptions)

    // Quita el espacio antes de AM/PM y lo pone en minuscula
    return (
      dateString.replace(/ ([AP]M)/i, (_match, ampm) => ampm.toLowerCase()) +
      (showTimezone ? ` (${getTimeZone()})` : '')
    )
  }

  // Para resets dentro de 24 horas, muestra solo la hora (comportamiento existente)
  const timeString = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: minutes === 0 ? undefined : '2-digit',
    hour12: true,
  })

  // Quita el espacio antes de AM/PM, lo pone en minuscula, y agrega la zona horaria
  return (
    timeString.replace(/ ([AP]M)/i, (_match, ampm) => ampm.toLowerCase()) +
    (showTimezone ? ` (${getTimeZone()})` : '')
  )
}

export function formatResetText(
  resetsAt: string,
  showTimezone: boolean = false,
  showTime: boolean = true,
): string {
  const dt = new Date(resetsAt)
  return `${formatResetTime(Math.floor(dt.getTime() / 1000), showTimezone, showTime)}`
}

// Los helpers de truncado siguen en src/utils/truncate.ts (dependen de
// ink/stringWidth, que arrastra el fork de Ink entero al grafo de
// dependencias de este paquete — fuera de alcance de este pase de porte;
// ver TASK-DOCS-0229 y el analisis de la iniciativa). En la fuente, quien
// consumia la superficie de truncado via './index.js' la obtenia por la
// fachada src/utils/format.ts.
