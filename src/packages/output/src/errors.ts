/**
 * Puerto de `ccnmt: packages/output/src/errors.ts` (verbatim — sin imports
 * en la fuente). V7 §6.5 — el namespace tipado de errores del paquete
 * `output`: un `code` estable por clase, para que el consumidor discrimine
 * por codigo en vez de por `instanceof` de una jerarquia mas fina.
 */
export class OutputBaseError extends Error {
  readonly code: string

  constructor(code: string, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'OutputBaseError'
    this.code = code
  }
}

export class WriteError extends OutputBaseError {
  constructor(message: string, options?: ErrorOptions) {
    super('OUTPUT_WRITE_ERROR', message, options)
    this.name = 'OutputWriteError'
  }
}

export class RenderError extends OutputBaseError {
  constructor(message: string, options?: ErrorOptions) {
    super('OUTPUT_RENDER_ERROR', message, options)
    this.name = 'OutputRenderError'
  }
}

export class TargetUnavailableError extends OutputBaseError {
  constructor(message: string, options?: ErrorOptions) {
    super('OUTPUT_TARGET_UNAVAILABLE', message, options)
    this.name = 'OutputTargetUnavailableError'
  }
}
