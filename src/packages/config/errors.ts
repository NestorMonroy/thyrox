/**
 * Puerto de `ccnmt: packages/config/errors.ts` (67 líneas fuente). No es uno
 * de los 15 del alcance — es la dependencia de hoja que `host.ts` necesita
 * (`HostBindingsError`) y que a su vez necesita `remote/index.ts`: sin
 * dependencias propias (cero `import`), se porta en el sitio en vez de
 * bloquearse.
 *
 * Espacio de nombres de errores tipados de config. Cada clase extiende
 * `ConfigBaseError`, que lleva un `code` estable (para matching en CI/logs) y
 * soporta el encadenamiento nativo `Error.cause`.
 */

export class ConfigBaseError extends Error {
  readonly code: string
  constructor(code: string, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ConfigBaseError'
    this.code = code
  }
}

export class ValidationError extends ConfigBaseError {
  constructor(message: string, options?: ErrorOptions) {
    super('CONFIG_VALIDATION_ERROR', message, options)
    this.name = 'ConfigValidationError'
  }
}

export class NotFoundError extends ConfigBaseError {
  constructor(message: string, options?: ErrorOptions) {
    super('CONFIG_NOT_FOUND', message, options)
    this.name = 'ConfigNotFoundError'
  }
}

export class PermissionDeniedError extends ConfigBaseError {
  constructor(message: string, options?: ErrorOptions) {
    super('CONFIG_PERMISSION_DENIED', message, options)
    this.name = 'ConfigPermissionDeniedError'
  }
}

export class AccessError extends ConfigBaseError {
  constructor(message: string, options?: ErrorOptions) {
    super('CONFIG_ACCESS_ERROR', message, options)
    this.name = 'ConfigAccessError'
  }
}

export class HostBindingsError extends ConfigBaseError {
  constructor(message: string, options?: ErrorOptions) {
    super('CONFIG_HOST_BINDINGS_ERROR', message, options)
    this.name = 'ConfigHostBindingsError'
  }
}

export class ParseError extends ConfigBaseError {
  readonly filePath: string
  readonly defaultConfig: unknown

  constructor(
    message: string,
    filePath: string,
    defaultConfig: unknown,
    options?: ErrorOptions,
  ) {
    super('CONFIG_PARSE_ERROR', message, options)
    this.name = 'ConfigParseError'
    this.filePath = filePath
    this.defaultConfig = defaultConfig
  }
}
