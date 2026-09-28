/**
 * Si hay backend de storage para las claves de sesión. La decisión se toma
 * una vez por proceso: el primer valor servido queda fijado, y uno posterior
 * que lo contradiga se avisa y se descarta, para que dos lecturas de la
 * bandera no repartan las claves entre dos backends.
 *
 * Porte de `N`, `DBo` y `dVn` (`chunk-8nz62976.js`, `chunk-w1vp9f7e.js`) de
 * 2.1.283. En la referencia el valor lo sirve una bandera remota; aquí nadie
 * la sirve todavía, así que el backend queda inactivo hasta que un llamador
 * lo fije.
 */
import { logForDebugging } from '../debug.ts'

export type PinOutcome = 'pinned' | 'unchanged' | 'conflict'

export class StorageBackendPin {
  #value: boolean | undefined

  constructor(private readonly warn: (message: string) => void = message => logForDebugging(message, { level: 'warn' })) {}

  /** `N`: si el backend quedó fijado como activo. */
  isActive(): boolean {
    return this.#value === true
  }

  /** `DBo`: fija el valor la primera vez; después sólo informa si coincide. */
  pin(value: unknown): PinOutcome {
    const active = value === true
    if (this.#value === undefined) {
      this.#value = active
      return 'pinned'
    }
    return this.#value === active ? 'unchanged' : 'conflict'
  }

  /** `dVn`: fija un valor servido, avisando si no es booleano o si contradice al primero. */
  pinServed(value: unknown): PinOutcome {
    if (typeof value !== 'boolean') this.warn(`storage backend flag served a ${typeof value}, not a boolean; treating it as off`)
    const outcome = this.pin(value)
    if (outcome === 'conflict') this.warn(`storage backend flag read ${String(value)} at a second pin in this process; keeping the first decision`)
    return outcome
  }
}

/** La decisión de este proceso. */
export const storageBackendPin = new StorageBackendPin()
