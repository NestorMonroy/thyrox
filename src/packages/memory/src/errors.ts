/**
 * Puerto de `ccnmt: packages/memory/src/errors.ts` (verbatim — sin
 * dependencias). V7 §6.5 — el namespace tipado de errores del paquete
 * `memory`: un `code` estable por clase, para que el consumidor discrimine
 * por código en vez de por `instanceof` de una jerarquía más fina.
 */
export class MemoryBaseError extends Error {
  readonly code: string

  constructor(code: string, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'MemoryBaseError'
    this.code = code
  }
}

export class MemoryReadError extends MemoryBaseError {
  constructor(message: string, options?: ErrorOptions) {
    super('MEMORY_READ_ERROR', message, options)
    this.name = 'MemoryReadError'
  }
}

export class MemoryWriteError extends MemoryBaseError {
  constructor(message: string, options?: ErrorOptions) {
    super('MEMORY_WRITE_ERROR', message, options)
    this.name = 'MemoryWriteError'
  }
}

export class MemoryPathError extends MemoryBaseError {
  constructor(message: string, options?: ErrorOptions) {
    super('MEMORY_PATH_ERROR', message, options)
    this.name = 'MemoryPathError'
  }
}

export class HostBindingsError extends MemoryBaseError {
  constructor(message: string, options?: ErrorOptions) {
    super('MEMORY_HOST_BINDINGS_ERROR', message, options)
    this.name = 'MemoryHostBindingsError'
  }
}

export class PathTraversalError extends MemoryBaseError {
  constructor(message: string, options?: ErrorOptions) {
    super('MEMORY_PATH_TRAVERSAL', message, options)
    this.name = 'MemoryPathTraversalError'
  }
}
