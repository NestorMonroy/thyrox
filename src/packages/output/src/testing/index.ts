/**
 * `@claude-code-how-works/output/testing` — puerto de
 * `ccnmt: packages/output/src/testing/index.ts` (verbatim).
 *
 * V7 §9.11 — el fake en memoria del paquete output. NO debe importar de
 * ../internal/ (regla dura de V7 §9.11).
 */
import type { OutputEvent, OutputTarget } from '../contracts.js'

export type { OutputEvent, OutputTarget }

/**
 * CapturingOutputTarget — captura todos los OutputEvent emitidos en un
 * arreglo tipado. Los tests pueden inspeccionar `.events` despues de
 * ejercitar el sistema bajo prueba.
 */
export class CapturingOutputTarget implements OutputTarget {
  readonly events: OutputEvent[] = []

  emit(event: OutputEvent): void {
    this.events.push(event)
  }

  flush(): void {}

  close(): void {}

  /** Limpia todos los eventos capturados. */
  reset(): void {
    this.events.length = 0
  }
}
