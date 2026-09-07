/**
 * Puerto de `ccnmt: packages/local-observability/src/aggregates/heatmap.ts`
 * (198 líneas fuente, 100 % portado). Genera un heatmap de actividad
 * estilo GitHub para la terminal. Única dependencia externa: `chalk`
 * (instalada como dependencia real de este paquete).
 */

import chalk from 'chalk'
import type { DailyActivity } from './stats.js'
import { toDateString } from './statsCache.js'

export type HeatmapOptions = {
  terminalWidth?: number
  showMonthLabels?: boolean
}

type Percentiles = {
  p25: number
  p50: number
  p75: number
}

/** Precalcula percentiles de los datos de actividad para los cálculos de intensidad. */
function calculatePercentiles(
  dailyActivity: DailyActivity[],
): Percentiles | null {
  const counts = dailyActivity
    .map(a => a.messageCount)
    .filter(c => c > 0)
    .sort((a, b) => a - b)

  if (counts.length === 0) return null

  return {
    p25: counts[Math.floor(counts.length * 0.25)]!,
    p50: counts[Math.floor(counts.length * 0.5)]!,
    p75: counts[Math.floor(counts.length * 0.75)]!,
  }
}

/** Genera un heatmap de actividad estilo GitHub para la terminal. */
export function generateHeatmap(
  dailyActivity: DailyActivity[],
  options: HeatmapOptions = {},
): string {
  const { terminalWidth = 80, showMonthLabels = true } = options

  // Las etiquetas de día ocupan 4 caracteres ("Mon "); calcula cuántas
  // semanas caben. Tope de 52 semanas (1 año) para calzar con el estilo
  // de GitHub.
  const dayLabelWidth = 4
  const availableWidth = terminalWidth - dayLabelWidth
  const width = Math.min(52, Math.max(10, availableWidth))

  const activityMap = new Map<string, DailyActivity>()
  for (const activity of dailyActivity) {
    activityMap.set(activity.date, activity)
  }

  const percentiles = calculatePercentiles(dailyActivity)

  // Calcula el rango de fechas — termina hoy, retrocede N semanas.
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Encuentra el domingo de la semana actual.
  const currentWeekStart = new Date(today)
  currentWeekStart.setDate(today.getDate() - today.getDay())

  // Retrocede (width - 1) semanas desde el inicio de la semana actual.
  const startDate = new Date(currentWeekStart)
  startDate.setDate(startDate.getDate() - (width - 1) * 7)

  // Genera la grilla (7 filas para días de la semana, width columnas
  // para semanas). También rastrea en qué semana empieza cada mes.
  const grid: string[][] = Array.from({ length: 7 }, () =>
    Array(width).fill(''),
  )
  const monthStarts: { month: number; week: number }[] = []
  let lastMonth = -1

  const currentDate = new Date(startDate)
  for (let week = 0; week < width; week++) {
    for (let day = 0; day < 7; day++) {
      // No muestra fechas futuras.
      if (currentDate > today) {
        grid[day]![week] = ' '
        currentDate.setDate(currentDate.getDate() + 1)
        continue
      }

      const dateStr = toDateString(currentDate)
      const activity = activityMap.get(dateStr)

      // Rastrea cambios de mes (en el día 0 = domingo de cada semana).
      if (day === 0) {
        const month = currentDate.getMonth()
        if (month !== lastMonth) {
          monthStarts.push({ month, week })
          lastMonth = month
        }
      }

      // Determina el nivel de intensidad según el conteo de mensajes.
      const intensity = getIntensity(activity?.messageCount || 0, percentiles)
      grid[day]![week] = getHeatmapChar(intensity)

      currentDate.setDate(currentDate.getDate() + 1)
    }
  }

  const lines: string[] = []

  // Etiquetas de mes — espaciadas uniformemente a lo ancho de la grilla.
  if (showMonthLabels) {
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ]

    const uniqueMonths = monthStarts.map(m => m.month)
    const labelWidth = Math.floor(width / Math.max(uniqueMonths.length, 1))
    const monthLabels = uniqueMonths
      .map(month => monthNames[month]!.padEnd(labelWidth))
      .join('')

    // 4 espacios para el prefijo de la columna de etiquetas de día.
    lines.push('    ' + monthLabels)
  }

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  for (let day = 0; day < 7; day++) {
    // Sólo muestra etiquetas para Lun, Mié, Vie.
    const label = [1, 3, 5].includes(day) ? dayLabels[day]!.padEnd(3) : '   '
    const row = label + ' ' + grid[day]!.join('')
    lines.push(row)
  }

  // Leyenda.
  lines.push('')
  lines.push(
    '    Less ' +
      [
        brandBlue('░'),
        brandBlue('▒'),
        brandBlue('▓'),
        brandBlue('█'),
      ].join(' ') +
      ' More',
  )

  return lines.join('\n')
}

function getIntensity(
  messageCount: number,
  percentiles: Percentiles | null,
): number {
  if (messageCount === 0 || !percentiles) return 0

  if (messageCount >= percentiles.p75) return 4
  if (messageCount >= percentiles.p50) return 3
  if (messageCount >= percentiles.p25) return 2
  return 1
}

// Azul de marca de ccb (equivale a BRAND_COLOR rgb(128,189,255)).
const brandBlue = chalk.hex('#80bdff')

function getHeatmapChar(intensity: number): string {
  switch (intensity) {
    case 0:
      return chalk.gray('·')
    case 1:
      return brandBlue('░')
    case 2:
      return brandBlue('▒')
    case 3:
      return brandBlue('▓')
    case 4:
      return brandBlue('█')
    default:
      return chalk.gray('·')
  }
}
