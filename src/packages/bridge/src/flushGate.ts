/**
 * Puerto fiel de `ccnmt: packages/bridge/src/flushGate.ts` (71 líneas
 * fuente, 100% portado, sin dependencias).
 *
 * Máquina de estados que compuerta la escritura de mensajes durante un
 * flush inicial.
 *
 * Cuando una sesión de bridge arranca, los mensajes históricos se
 * vuelcan al servidor vía un único POST HTTP. Durante ese flush, los
 * mensajes nuevos deben encolarse para evitar que lleguen al servidor
 * intercalados con los históricos.
 *
 * Ciclo de vida:
 *   start()      → enqueue() devuelve true, los items se encolan
 *   end()        → devuelve los items encolados para drenarlos,
 *                  enqueue() devuelve false
 *   drop()       → descarta los items encolados (cierre permanente del
 *                  transporte)
 *   deactivate() → limpia el flag active sin descartar items (reemplazo
 *                  de transporte — el transporte nuevo los drenará)
 */
export class FlushGate<T> {
  private _active = false
  private _pending: T[] = []

  get active(): boolean {
    return this._active
  }

  get pendingCount(): number {
    return this._pending.length
  }

  /** Marca el flush como en curso. enqueue() empezará a encolar items. */
  start(): void {
    this._active = true
  }

  /**
   * Termina el flush y devuelve los items encolados para drenarlos.
   * El llamador es responsable de enviar los items devueltos.
   */
  end(): T[] {
    this._active = false
    return this._pending.splice(0)
  }

  /**
   * Si el flush está activo, encola los items y devuelve true.
   * Si el flush no está activo, devuelve false (el llamador debe
   * enviarlos directamente).
   */
  enqueue(...items: T[]): boolean {
    if (!this._active) return false
    this._pending.push(...items)
    return true
  }

  /**
   * Descarta todos los items encolados (cierre permanente del
   * transporte). Devuelve la cantidad de items descartados.
   */
  drop(): number {
    this._active = false
    const count = this._pending.length
    this._pending.length = 0
    return count
  }

  /**
   * Limpia el flag active sin descartar los items encolados. Se usa
   * cuando el transporte se reemplaza (onWorkReceived) — el flush del
   * transporte nuevo drenará los items pendientes.
   */
  deactivate(): void {
    this._active = false
  }
}
