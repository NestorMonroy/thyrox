/**
 * El punto único por donde un error y una acción llegan a la base.
 *
 * Deshabilitado por defecto: el arranque lo habilita al adjuntar el sumidero de
 * errores, así que una prueba que llama `logError` sin arrancar no escribe en el
 * hogar real. Registrar nunca lanza: un error al guardar un error no puede
 * tumbar a quien lo reporta.
 */
import { createActionTrail, type ActionTrail } from './actionTrail.ts'
import type { ErrorStore } from './errorStore.ts'
import type { ErrorSource } from './schema.ts'

type RecorderOptions = {
  store: ErrorStore
  sessionId: () => string | null
  version: string | null
  now?: () => string
}

let recorder: (RecorderOptions & { trail: ActionTrail; now: () => string }) | null = null

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
  try {
    recorder.store.record({
      occurredAt: recorder.now(),
      sessionId: recorder.sessionId(),
      version: recorder.version,
      source,
      error,
      context,
      actions: recorder.trail.snapshot(),
    })
  } catch {
    // El registro de errores no puede ser una fuente de errores.
  }
}
