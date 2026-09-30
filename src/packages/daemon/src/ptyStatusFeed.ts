/**
 * Feed de estado por PTY con cadencia fija — porte de `ke`
 * (`chunk-ygx717jg.js`, referencia 2.1.283).
 *
 * Cada `tickMs` decide, sin mirar el contenido de la ultima linea salvo
 * para el detalle: `working/active` si hubo una escritura dentro de la
 * ultima ventana, `blocked` si no la hubo y queda una linea sin terminar en
 * salto (`ne`/`Tm` — ver `classifier/state.ts::MAX_DETAIL_CHARS`), o
 * `working/idle` en cualquier otro caso. El patch se deduplica por la clave
 * `state|tempo|detail`, igual que la variable `o` de `ke`.
 *
 * `st` (`/\x1b\[\d*D/g`) limpia los movimientos de cursor hacia atras antes
 * de trocear en lineas: una racha de redibujados (spinner, barra de
 * progreso) se lee como una sucesion de lineas, no como ruido de escape.
 *
 * `Pr` (leer el estado guardado) y `ja` (fusionar el patch y escribirlo) no
 * se portan aqui: ese almacen ya existe en este arbol
 * (`classifier/stateFile.ts::readState/writeState`,
 * `@thyrox/agent/background/fleet/fleetStore.js`), y no es responsabilidad
 * de esta feed decidir cual lo consume — `onPatch` queda inyectado, y es el
 * unico punto donde el llamador hace ese Pr+ja.
 *
 * // pendiente: `Vo` (chunk-zkn0228z.js, `Z.redact` → clase `nt`, un
 * // escaner de secretos de proposito general) no se porta: el detalle se
 * // publica sin redactar. Es una pieza propia, fuera del alcance de D17
 * // — no especifica de la feed de la PTY.
 *
 * El pipeline actual de `classifier/` (`heuristic.ts` + `llmClient.ts` +
 * `orchestrator.ts`, tras `THYROX_CODE_BG_CLASSIFIER=1`) no existe en la
 * referencia: decide `working/blocked/done/failed/idle` leyendo el TEXTO
 * (regex + LLM). `ke` sólo decide tempo (y, como único estado además de
 * `working`, `blocked`) a partir de CUANDO llego la ultima escritura, sin
 * leer que dice. Los dos quedan coexistiendo sin tocarse — cual alimenta el
 * `state.json` de un worker es una decision del ejecutor, no de este porte.
 */
import { logError } from '@thyrox/local-observability/logging'
import { MAX_DETAIL_CHARS, truncate, type WorkerState, type WorkerTempo } from './classifier/state.js'

/** `Pe` — cadencia del temporizador, en ms. */
export const STATUS_FEED_TICK_MS = 2000

/** `st` — movimientos de cursor ANSI hacia atras. */
const CURSOR_BACK_RE = /\x1b\[\d*D/g

export interface StatusFeedPatch {
  state: WorkerState
  tempo: WorkerTempo
  detail: string
  updatedAt: string
}

export interface StatusFeedHandle {
  /** Alimenta la feed con un fragmento crudo de salida de la PTY. */
  feed(chunk: string): void
  /** Detiene el temporizador; ningun patch mas se publica. */
  dispose(): void
  /** Ultima linea vista, truncada — `get lastLine` de `ke`. */
  readonly lastLine: string
}

export interface StatusFeedOptions {
  /** Cadencia del temporizador; por defecto `STATUS_FEED_TICK_MS` (`Pe`). */
  tickMs?: number
  /** Publica un patch ya deduplicado — la mitad inyectada de `Pr`+`ja`. */
  onPatch: (patch: StatusFeedPatch) => void | Promise<void>
  /** `d` (`chunk-fmsbxtrp.js`) — logea un fallo del propio `onPatch`. */
  logErrorFn?: (error: unknown) => void
}

export function createPtyStatusFeed(options: StatusFeedOptions): StatusFeedHandle {
  const tickMs = options.tickMs ?? STATUS_FEED_TICK_MS
  const { onPatch } = options
  const logErrorFn = options.logErrorFn ?? logError

  let pendingLine = ''
  let lastLine = ''
  let pendingLineEmpty = true
  let lastWriteAt = 0
  let lastKey = ''
  let disposed = false

  function emit(state: WorkerState, tempo: WorkerTempo): void {
    // La clave de deduplicacion se actualiza SIEMPRE, incluso tras
    // dispose() — igual que `o=w` en `ke`, que corre antes de comprobar
    // `!u`. Sólo se corta la publicacion misma.
    const detail = truncate(lastLine, MAX_DETAIL_CHARS)
    const key = `${state}|${tempo}|${detail}`
    if (key === lastKey) return
    lastKey = key
    if (disposed) return
    Promise.resolve(onPatch({ state, tempo, detail, updatedAt: new Date().toISOString() })).catch(logErrorFn)
  }

  const timer = setInterval(() => {
    if (lastWriteAt > 0 && Date.now() - lastWriteAt < tickMs) emit('working', 'active')
    else if (!pendingLineEmpty && lastLine) emit('blocked', 'blocked')
    else emit('working', 'idle')
  }, tickMs)
  timer.unref()

  return {
    feed(chunk: string): void {
      // Sin guarda de `disposed` aqui — `ke` tampoco la tiene en `feed`;
      // el corte real esta en `emit()`, justo antes de publicar.
      const clean = Bun.stripANSI(chunk.replace(CURSOR_BACK_RE, '\x00'))
        .replace(/\r\n?/g, '\n')
        .replace(/\0+$/, '')
        .replace(/\0/g, '\n')
      if (!clean) return
      lastWriteAt = Date.now()
      pendingLine += clean
      const lines = pendingLine.split('\n')
      pendingLine = lines.pop() ?? ''
      pendingLineEmpty = pendingLine === ''
      lastLine = pendingLine.trim() || lines.findLast(l => l.trim())?.trim() || lastLine
      if (pendingLine.length > MAX_DETAIL_CHARS * 2) pendingLine = pendingLine.slice(-MAX_DETAIL_CHARS)
      if (lastKey.startsWith('blocked|')) emit('working', 'active')
    },
    dispose(): void {
      disposed = true
      clearInterval(timer)
    },
    get lastLine(): string {
      return truncate(lastLine, MAX_DETAIL_CHARS)
    },
  }
}
