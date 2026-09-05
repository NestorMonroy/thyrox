/**
 * Diario de eventos (T-032) — el equivalente del `diag log` del cliente.
 *
 * Su única obligación dura es **no romper el flujo**. Un diario que lanza
 * cuando el disco se llena convierte un problema de telemetría en una sesión
 * caída; por eso traga el error y lleva su propia cuenta de fallos, que es lo
 * que permite saber que faltan líneas en vez de leer el silencio como calma.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname } from 'node:path'

export type JournalEntry = {
  timestamp: string
  sessionId: string
  kind: string
  data: Record<string, unknown>
}

export class Journal {
  readonly path: string
  readonly sessionId: string
  /** Cuántas líneas no se pudieron escribir. Un diario mudo con 0 fallos sí estuvo callado. */
  failures = 0

  constructor(path: string, sessionId: string) {
    this.path = path
    this.sessionId = sessionId
    try {
      mkdirSync(dirname(path), { recursive: true })
    } catch {
      this.failures += 1
    }
  }

  log(kind: string, data: Record<string, unknown>): void {
    const entrada: JournalEntry = { timestamp: new Date().toISOString(), sessionId: this.sessionId, kind, data }
    try {
      appendFileSync(this.path, `${JSON.stringify(entrada)}\n`, 'utf8')
    } catch {
      this.failures += 1
    }
  }
}

/** Las entradas legibles del diario. Una línea corrupta se salta, no tumba la lectura. */
export function readJournal(path: string): JournalEntry[] {
  if (!existsSync(path)) return []
  const out: JournalEntry[] = []
  for (const cruda of readFileSync(path, 'utf8').split('\n')) {
    if (!cruda.trim()) continue
    try {
      const e = JSON.parse(cruda) as JournalEntry
      if (e && typeof e.kind === 'string') out.push(e)
    } catch {
      // línea a medias de un escritor interrumpido
    }
  }
  return out
}
