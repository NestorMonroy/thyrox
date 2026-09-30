/**
 * El punto único por donde un error y una acción llegan a la base.
 *
 * Deshabilitado por defecto: el arranque lo habilita al adjuntar el sumidero de
 * errores, así que una prueba que llama `logError` sin arrancar no escribe en el
 * hogar real. Registrar no espera ni lanza: la escritura corre aparte, un error
 * al guardar un error se descarta, y `flushErrorRecording` espera las
 * escrituras pendientes (el apagado, las pruebas).
 */
import { createActionTrail, type ActionTrail } from './actionTrail.ts'
import type { ErrorStore } from './errorStore.ts'
import type { ErrorSource } from './migrations.ts'

type RecorderOptions = {
  store: ErrorStore
  sessionId: () => string | null
  version: string | null
  now?: () => string
}

let recorder: (RecorderOptions & { trail: ActionTrail; now: () => string }) | null = null
const pending = new Set<Promise<unknown>>()

export function enableErrorRecording(options: RecorderOptions): void {
  recorder = { ...options, trail: createActionTrail(), now: options.now ?? (() => new Date().toISOString()) }
}

export function disableErrorRecording(): void {
  recorder = null
}

export function recordAction(name: string, metadata: Record<string, unknown> = {}): void {
  recorder?.trail.push(name, metadata, recorder.now())
}

export function recordError(source: ErrorSource, error: unknown, context?: Record<string, unknown>): void {
  if (!recorder) return
  let write: Promise<unknown>
  try {
    write = recorder.store
      .record({
        occurredAt: recorder.now(),
        sessionId: recorder.sessionId(),
        version: recorder.version,
        source,
        error,
        context,
        actions: recorder.trail.snapshot(),
      })
      .catch(() => {})
  } catch {
    return
  }
  pending.add(write)
  void write.finally(() => pending.delete(write))
}

/** Espera las escrituras de errores que sigan en curso. */
export async function flushErrorRecording(): Promise<void> {
  await Promise.all([...pending])
}
