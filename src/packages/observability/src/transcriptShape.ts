/**
 * La forma de un transcript: cuántas líneas de cada tipo, y qué compactó.
 *
 * Análisis: `analisis-forma-del-transcript-y-su-registro.rst`. La pregunta que
 * lo origina es del ejecutor —el histograma por tipo de línea— y su respuesta
 * corta es que el store **no tenía la entidad**, no que le faltara una columna:
 * su unidad es el subagente, y esto es una propiedad de la sesión.
 *
 * **Los tipos no son ocho de lo mismo, y ésa es toda la decisión de diseño.**
 * La referencia parte el universo en dos y lo declara verbatim
 * (`ccnmt: packages/local-observability/src/aggregates/stats.ts:971-977`):
 *
 * ```ts
 * // Transcript message types — must match isTranscriptMessage() in sessionStorage.ts.
 * const TRANSCRIPT_MESSAGE_TYPES = new Set([
 *   'user', 'assistant', 'attachment', 'system', 'progress',
 * ])
 * ```
 *
 * Lo que queda fuera es **registro lateral del cliente**: estado de interfaz
 * que nunca fue contexto. Medido en el corpus de esta sesión, `atis-latch`,
 * `last-prompt`, `mode` y `queue-operation` suman 1568 de 8847 líneas —
 * contarlos como mensajes publicaría 8847 donde hay 7279, un 21 % de
 * inflación. Es el sub-patrón A de `metrica-decide-la-conclusion.md`: un
 * encabezado único sobre dos métricas distintas.
 */
import { existsSync, readFileSync } from 'node:fs'

/** Los cinco tipos de mensaje, verbatim de la referencia. */
export const TRANSCRIPT_MESSAGE_TYPES: ReadonlySet<string> = new Set([
  'user', 'assistant', 'attachment', 'system', 'progress',
])

export type TranscriptShape = {
  /** El histograma completo, medido o no: un tipo nuevo no desaparece. */
  byType: Record<string, number>
  /** Líneas que fueron contexto. */
  messages: number
  /** Líneas de estado del cliente, que nunca lo fueron. */
  sidecar: number
  total: number
  /** Fronteras `compact_boundary` del archivo. */
  compactions: number
  /**
   * Contexto que las compactaciones descartaron, sumado.
   *
   * `null` cuando ninguna frontera trae `compactMetadata`: es «nadie midió»,
   * distinto de «no cayó nada». Escribir 0 repartiría el gasto entre
   * episodios que no aportaron dato — el defecto que
   * `calibration-verified-numbers.md` registra para los agregados del store.
   *
   * **Se deriva de `preTokens - postTokens`, nunca del acumulado.** Medido
   * 14 de 14 en el corpus: el delta de `cumulativeDroppedTokens` entre dos
   * fronteras consecutivas es exactamente esa resta. Guardar el acumulado en
   * crudo sería guardar un número sin referente propio — arranca en
   * 357 982 102, muy por encima de todo lo que la sesión gastó.
   *
   * Y **no es** `cache_read_tokens`: aquél es facturación —lo que se releyó y
   * se pagó— y éste es capacidad —lo que dejó de estar. Sumarlos o dividirlos
   * entre sí da un número sin referente.
   */
  droppedTokens: number | null
}

type Linea = { type?: string; subtype?: string; compactMetadata?: Record<string, unknown> }

/** Recorre las líneas ya parseadas y devuelve su forma. */
export function transcriptShape(lines: Linea[]): TranscriptShape {
  const byType: Record<string, number> = {}
  let messages = 0, sidecar = 0, compactions = 0
  let caida: number | null = null

  for (const l of lines) {
    const t = l.type ?? 'sin-tipo'
    byType[t] = (byType[t] ?? 0) + 1
    if (TRANSCRIPT_MESSAGE_TYPES.has(t)) messages++
    else sidecar++
    if (l.subtype !== 'compact_boundary') continue
    compactions++
    const cm = l.compactMetadata
    const pre = cm?.preTokens, post = cm?.postTokens
    if (typeof pre === 'number' && typeof post === 'number') {
      caida = (caida ?? 0) + (pre - post)
    }
  }
  return { byType, messages, sidecar, total: lines.length, compactions, droppedTokens: caida }
}

/**
 * La forma de un transcript en disco, del harness o del cliente.
 *
 * Es la respuesta ejecutable a *«¿cómo obtiene el harness esos valores?»*: los
 * lee de su propio JSONL, que es el mismo formato que el cliente escribe — esa
 * era la condición declarada del transcript desde el principio.
 *
 * Una línea que no parsea **se cuenta como `no-parseable`** en vez de saltarse:
 * un archivo vivo tiene su última línea a medio escribir, y descartarla en
 * silencio haría que el total no cuadre con `wc -l` sin que nadie sepa por qué.
 */
export function transcriptShapeOf(path: string): TranscriptShape | null {
  if (!existsSync(path)) return null
  const lineas: Linea[] = []
  for (const l of readFileSync(path, 'utf8').split('\n')) {
    if (!l.trim()) continue
    try { lineas.push(JSON.parse(l)) } catch { lineas.push({ type: 'no-parseable' }) }
  }
  return transcriptShape(lineas)
}
