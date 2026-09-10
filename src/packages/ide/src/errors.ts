/**
 * Puerto de `ccnmt: packages/ide/src/errors.ts` (verbatim — sin
 * dependencias). El namespace tipado de errores del paquete `ide`: un
 * `code` estable por clase, para que el consumidor discrimine por código en
 * vez de por `instanceof` de una jerarquía más fina.
 */
export class IdeBaseError extends Error {
  readonly code: string

  constructor(code: string, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'IdeBaseError'
    this.code = code
  }
}

export class ConnectorError extends IdeBaseError {
  constructor(message: string, options?: ErrorOptions) {
    super('IDE_CONNECTOR_ERROR', message, options)
    this.name = 'IdeConnectorError'
  }
}

export class SelectionError extends IdeBaseError {
  constructor(message: string, options?: ErrorOptions) {
    super('IDE_SELECTION_ERROR', message, options)
    this.name = 'IdeSelectionError'
  }
}

export class IndexingError extends IdeBaseError {
  constructor(message: string, options?: ErrorOptions) {
    super('IDE_INDEXING_ERROR', message, options)
    this.name = 'IdeIndexingError'
  }
}
