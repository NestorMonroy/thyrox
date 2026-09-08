/**
 * Puerto de `ccnmt: packages/tool-registry/src/errors.ts` (26 líneas,
 * 5 símbolos). El espacio de errores del registro.
 *
 * Cada uno lleva `code` además de `name`: el nombre es para el humano que
 * lee la traza y el código es para el que discrimina en un `catch`. Un
 * `instanceof` sobre la clase base más el código cubre los dos usos sin
 * comparar cadenas de mensaje, que es lo que se rompe al reescribir un
 * texto.
 */

export class ToolBaseError extends Error {
  readonly code: string

  constructor(code: string, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ToolBaseError'
    this.code = code
  }
}

export class NotFoundError extends ToolBaseError {
  constructor(message: string, options?: ErrorOptions) {
    super('TOOL_NOT_FOUND', message, options)
    this.name = 'ToolNotFoundError'
  }
}

export class InvalidInputError extends ToolBaseError {
  constructor(message: string, options?: ErrorOptions) {
    super('TOOL_INVALID_INPUT', message, options)
    this.name = 'ToolInvalidInputError'
  }
}

export class ExecutionError extends ToolBaseError {
  constructor(message: string, options?: ErrorOptions) {
    super('TOOL_EXECUTION_ERROR', message, options)
    this.name = 'ToolExecutionError'
  }
}

export class HostBindingsError extends ToolBaseError {
  constructor(message: string, options?: ErrorOptions) {
    super('TOOL_HOST_BINDINGS_ERROR', message, options)
    this.name = 'ToolHostBindingsError'
  }
}
