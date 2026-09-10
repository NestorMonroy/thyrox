/**
 * Lo que el emisor decide ANTES de tocar el disco: qué pidió la invocación y,
 * cuando el disco difiere, en qué difiere.
 *
 * Vive fuera de `bin/emit.ts` porque un `bin/` no se puede ejercitar sin
 * lanzarlo, y lanzarlo es justo la rama que escribe.
 */

/** Lo único que la invocación puede pedir hoy. */
export interface EmitPlan {
  /** Compara y no escribe. Es la forma que un gate consume. */
  check: boolean
}

/** Una invocación que no se entiende. NO se degrada a la rama por defecto. */
export interface EmitRefusal {
  error: string
}

const BANDERAS = new Set(['--check'])

/**
 * Un argumento desconocido REHÚSA.
 *
 * La rama por defecto de este emisor escribe sobre 31 artefactos. Ignorar en
 * silencio lo que no se entiende convierte cualquier error de tecleo en una
 * escritura: medido — `--stdout` no existe, se ignoró, y el emisor borró 63
 * líneas de `thyrox-coordinator.md` que su definición no llevaba.
 */
export function parseArgs(argv: readonly string[]): EmitPlan | EmitRefusal {
  const plan: EmitPlan = { check: false }
  for (const arg of argv) {
    if (!BANDERAS.has(arg)) {
      return {
        error:
          `argumento no reconocido: ${arg}. ` +
          `Use ${[...BANDERAS].join(' | ')} o ninguno para escribir.`,
      }
    }
    if (arg === '--check') plan.check = true
  }
  return plan
}

/** Cuántas líneas de muestra publica el resumen, como mucho. */
const MUESTRA = 3

/**
 * Qué difiere, no sólo que difiere.
 *
 * `esperado` es lo que la definición produce; `actual`, lo que hay en disco.
 * El signo se lee desde la definición: `+N` son líneas que el disco tiene de
 * más —contenido huérfano, sin fuente que lo reproduzca—.
 *
 * Métrica: conteo de líneas y la primera posición en que los dos textos
 * divergen.
 * Ciega a: un movimiento de bloque, que aquí se lee como una divergencia
 * temprana y no como un desplazamiento.
 */
export function diffSummary(esperado: string, actual: string): string {
  if (esperado === actual) return ''
  const a = esperado.split('\n')
  const b = actual.split('\n')
  const sobran = Math.max(0, b.length - a.length)
  const faltan = Math.max(0, a.length - b.length)

  let primera = -1
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    if (a[i] !== b[i]) {
      primera = i + 1
      break
    }
  }

  const lineas = [`             +${sobran} -${faltan} línea(s); primera divergencia en la ${primera}`]
  for (let i = primera - 1; i < Math.min(primera - 1 + MUESTRA, Math.max(a.length, b.length)); i += 1) {
    if (a[i] === b[i]) continue
    lineas.push(`             ${String(i + 1).padStart(5)} definición: ${a[i] ?? '(ausente)'}`)
    lineas.push(`             ${' '.repeat(5)} disco:      ${b[i] ?? '(ausente)'}`)
  }
  return lineas.join('\n')
}
