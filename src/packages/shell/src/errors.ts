/**
 * Porte fiel de `ccnmt: packages/shell/src/errors.ts` — namespace de
 * errores tipados del shell (V7 §6.5).
 *
 * Porte COMPLETO: las cuatro clases exportadas de la fuente están
 * presentes con el mismo código, el mismo `name` y la misma cadena de
 * herencia.
 *
 * @module
 */
export class ShellBaseError extends Error {
  readonly code: string
  constructor(code: string, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ShellBaseError'
    this.code = code
  }
}
export class ExecError extends ShellBaseError {
  constructor(message: string, options?: ErrorOptions) {
    super('SHELL_EXEC_ERROR', message, options)
    this.name = 'ShellExecError'
  }
}
export class TimeoutError extends ShellBaseError {
  constructor(message: string, options?: ErrorOptions) {
    super('SHELL_TIMEOUT', message, options)
    this.name = 'ShellTimeoutError'
  }
}
export class QuotingError extends ShellBaseError {
  constructor(message: string, options?: ErrorOptions) {
    super('SHELL_QUOTING_ERROR', message, options)
    this.name = 'ShellQuotingError'
  }
}
