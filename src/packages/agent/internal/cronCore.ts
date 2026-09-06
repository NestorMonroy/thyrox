/**
 * Porte de `ccnmt: packages/agent/internal/cronCore.ts`.
 *
 * Parseo mínimo de expresiones cron y cálculo de la próxima corrida.
 *
 * Soporta el subconjunto estándar de 5 campos:
 *   minuto hora día-del-mes mes día-de-la-semana
 *
 * Sintaxis de campo: comodín, N, paso (estrella-slash-N), rango (N-M),
 * lista (N,M,...). Sin `L`, `W`, `?` ni alias de nombre. Todas las horas se
 * interpretan en la zona horaria local del proceso — `"0 9 * * *"` significa
 * las 9am donde sea que corra el CLI.
 */

export type CronFields = {
  minute: number[]
  hour: number[]
  dayOfMonth: number[]
  month: number[]
  dayOfWeek: number[]
}

type FieldRange = { min: number; max: number }

const FIELD_RANGES: FieldRange[] = [
  { min: 0, max: 59 }, // minuto
  { min: 0, max: 23 }, // hora
  { min: 1, max: 31 }, // dayOfMonth
  { min: 1, max: 12 }, // mes
  { min: 0, max: 6 }, // dayOfWeek (0=domingo; 7 se acepta como alias de domingo)
]

/**
 * Expande un solo campo cron a un arreglo ordenado de valores que coinciden.
 * Soporta: comodín, N, estrella-slash-N (paso), N-M (rango) y listas por coma.
 * Devuelve null si es inválido.
 */
function expandField(field: string, range: FieldRange): number[] | null {
  const { min, max } = range
  const out = new Set<number>()

  for (const part of field.split(',')) {
    // Comodín o estrella-slash-N.
    const stepMatch = part.match(/^\*(?:\/(\d+))?$/)
    if (stepMatch) {
      const step = stepMatch[1] ? parseInt(stepMatch[1], 10) : 1
      if (step < 1) return null
      for (let i = min; i <= max; i += step) out.add(i)
      continue
    }

    // N-M o N-M/S.
    const rangeMatch = part.match(/^(\d+)-(\d+)(?:\/(\d+))?$/)
    if (rangeMatch) {
      const lo = parseInt(rangeMatch[1]!, 10)
      const hi = parseInt(rangeMatch[2]!, 10)
      const step = rangeMatch[3] ? parseInt(rangeMatch[3], 10) : 1
      // dayOfWeek: acepta 7 como alias de domingo dentro de un rango
      // (p. ej. 5-7 = vie,sáb,dom → [5,6,0]).
      const isDow = min === 0 && max === 6
      const effMax = isDow ? 7 : max
      if (lo > hi || step < 1 || lo < min || hi > effMax) return null
      for (let i = lo; i <= hi; i += step) {
        out.add(isDow && i === 7 ? 0 : i)
      }
      continue
    }

    // N simple.
    const singleMatch = part.match(/^\d+$/)
    if (singleMatch) {
      let n = parseInt(part, 10)
      // dayOfWeek: acepta 7 como alias de domingo → 0.
      if (min === 0 && max === 6 && n === 7) n = 0
      if (n < min || n > max) return null
      out.add(n)
      continue
    }

    return null
  }

  if (out.size === 0) return null
  return Array.from(out).sort((a, b) => a - b)
}

/**
 * Parsea una expresión cron de 5 campos a arreglos numéricos expandidos.
 * Devuelve null si es inválida o usa sintaxis no soportada.
 */
export function parseCronExpression(expr: string): CronFields | null {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) return null

  const expanded: number[][] = []
  for (let i = 0; i < 5; i++) {
    const result = expandField(parts[i]!, FIELD_RANGES[i]!)
    if (!result) return null
    expanded.push(result)
  }

  return {
    minute: expanded[0]!,
    hour: expanded[1]!,
    dayOfMonth: expanded[2]!,
    month: expanded[3]!,
    dayOfWeek: expanded[4]!,
  }
}

/**
 * Calcula el `Date` siguiente, estrictamente posterior a `from`, que coincide
 * con los campos cron, usando la zona horaria local del proceso. Avanza
 * minuto a minuto. Acotado a 366 días; devuelve null si no hay coincidencia
 * (imposible para un cron válido, pero satisface el tipo).
 *
 * Semántica estándar de cron: cuando dayOfMonth Y dayOfWeek están ambos
 * acotados (ninguno es el rango completo), una fecha coincide si cualquiera
 * de los dos coincide (semántica OR).
 */
export function computeNextCronRun(
  fields: CronFields,
  from: Date,
): Date | null {
  const minuteSet = new Set(fields.minute)
  const hourSet = new Set(fields.hour)
  const domSet = new Set(fields.dayOfMonth)
  const monthSet = new Set(fields.month)
  const dowSet = new Set(fields.dayOfWeek)

  // ¿El campo es un comodín (rango completo)?
  const domWild = fields.dayOfMonth.length === 31
  const dowWild = fields.dayOfWeek.length === 7

  // Redondea al siguiente minuto entero (estrictamente posterior a `from`).
  const t = new Date(from.getTime())
  t.setSeconds(0, 0)
  t.setMinutes(t.getMinutes() + 1)

  const maxIter = 366 * 24 * 60
  for (let i = 0; i < maxIter; i++) {
    const month = t.getMonth() + 1
    if (!monthSet.has(month)) {
      // Salta al inicio del mes siguiente.
      t.setMonth(t.getMonth() + 1, 1)
      t.setHours(0, 0, 0, 0)
      continue
    }

    const dom = t.getDate()
    const dow = t.getDay()
    // Cuando dom/dow están ambos acotados, basta con que coincida uno (OR).
    const dayMatches =
      domWild && dowWild
        ? true
        : domWild
          ? dowSet.has(dow)
          : dowWild
            ? domSet.has(dom)
            : domSet.has(dom) || dowSet.has(dow)

    if (!dayMatches) {
      // Salta al inicio del día siguiente.
      t.setDate(t.getDate() + 1)
      t.setHours(0, 0, 0, 0)
      continue
    }

    if (!hourSet.has(t.getHours())) {
      t.setHours(t.getHours() + 1, 0, 0, 0)
      continue
    }

    if (!minuteSet.has(t.getMinutes())) {
      t.setMinutes(t.getMinutes() + 1)
      continue
    }

    return t
  }

  return null
}

// ── cronToHuman ──────────────────────────────────────────────────────────
// Deliberadamente acotado: cubre los patrones comunes; para el resto cae al
// texto crudo del cron. La opción `utc` existe para los triggers remotos de
// CCR, que corren en servidores y siempre usan cadenas cron en UTC — esa vía
// traduce UTC→local para mostrar y necesita lógica de cruce de medianoche
// para el caso de día de la semana. Las tareas locales (el default) no
// necesitan ninguna de las dos ramas especiales.

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

function formatLocalTime(minute: number, hour: number): string {
  // 1 de enero — sin brecha de horario de verano en ninguna zona. Usar
  // `new Date()` (hoy) haría rodar 2am→3am el único día de salto adelante.
  const d = new Date(2000, 0, 1, hour, minute)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function formatUtcTimeAsLocal(minute: number, hour: number): string {
  // Crea una fecha en UTC y formatea en la zona horaria local del usuario.
  const d = new Date()
  d.setUTCHours(hour, minute, 0, 0)
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}

export function cronToHuman(cron: string, opts?: { utc?: boolean }): string {
  const utc = opts?.utc ?? false
  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) return cron

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts as [
    string,
    string,
    string,
    string,
    string,
  ]

  // Cada N minutos: paso/N * * * *.
  const everyMinMatch = minute.match(/^\*\/(\d+)$/)
  if (
    everyMinMatch &&
    hour === '*' &&
    dayOfMonth === '*' &&
    month === '*' &&
    dayOfWeek === '*'
  ) {
    const n = parseInt(everyMinMatch[1]!, 10)
    return n === 1 ? 'Every minute' : `Every ${n} minutes`
  }

  // Cada hora: 0 * * * *.
  if (
    minute.match(/^\d+$/) &&
    hour === '*' &&
    dayOfMonth === '*' &&
    month === '*' &&
    dayOfWeek === '*'
  ) {
    const m = parseInt(minute, 10)
    if (m === 0) return 'Every hour'
    return `Every hour at :${m.toString().padStart(2, '0')}`
  }

  // Cada N horas: 0 paso/N * * *.
  const everyHourMatch = hour.match(/^\*\/(\d+)$/)
  if (
    minute.match(/^\d+$/) &&
    everyHourMatch &&
    dayOfMonth === '*' &&
    month === '*' &&
    dayOfWeek === '*'
  ) {
    const n = parseInt(everyHourMatch[1]!, 10)
    const m = parseInt(minute, 10)
    const suffix = m === 0 ? '' : ` at :${m.toString().padStart(2, '0')}`
    return n === 1 ? `Every hour${suffix}` : `Every ${n} hours${suffix}`
  }

  // ── El resto de los casos referencian hora+minuto: rama según utc ──────

  if (!minute.match(/^\d+$/) || !hour.match(/^\d+$/)) return cron
  const m = parseInt(minute, 10)
  const h = parseInt(hour, 10)
  const fmtTime = utc ? formatUtcTimeAsLocal : formatLocalTime

  // Diario a una hora específica: M H * * *.
  if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return `Every day at ${fmtTime(m, h)}`
  }

  // Día de la semana específico: M H * * D.
  if (dayOfMonth === '*' && month === '*' && dayOfWeek.match(/^\d$/)) {
    const dayIndex = parseInt(dayOfWeek, 10) % 7 // normaliza 7 (alias de domingo) → 0
    let dayName: string | undefined
    if (utc) {
      // Hora+día en UTC puede caer en otro día local (cruce de medianoche).
      // Se calcula el día de la semana local real construyendo el instante UTC.
      const ref = new Date()
      const daysToAdd = (dayIndex - ref.getUTCDay() + 7) % 7
      ref.setUTCDate(ref.getUTCDate() + daysToAdd)
      ref.setUTCHours(h, m, 0, 0)
      dayName = DAY_NAMES[ref.getDay()]
    } else {
      dayName = DAY_NAMES[dayIndex]
    }
    if (dayName) return `Every ${dayName} at ${fmtTime(m, h)}`
  }

  // Días de semana: M H * * 1-5.
  if (dayOfMonth === '*' && month === '*' && dayOfWeek === '1-5') {
    return `Weekdays at ${fmtTime(m, h)}`
  }

  return cron
}
