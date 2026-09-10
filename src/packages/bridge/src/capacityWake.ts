/**
 * Puerto fiel de `ccnmt: packages/bridge/src/capacityWake.ts` (56 líneas
 * fuente, 100% portado, sin dependencias).
 *
 * Primitiva compartida de "despertar por capacidad" para los poll loops
 * del bridge. Tanto replBridge.ts como bridgeMain.ts necesitan dormir
 * mientras están "en capacidad" pero despertar antes si (a) la señal del
 * loop externo aborta (shutdown), o (b) se libera capacidad (sesión
 * terminada / transporte perdido). Este módulo encapsula el controlador
 * de despertar mutable + el merger de dos señales que ambos poll loops
 * duplicaban byte a byte en la fuente.
 */

export type CapacitySignal = { signal: AbortSignal; cleanup: () => void }

export type CapacityWake = {
  /**
   * Crea una señal que aborta cuando la señal del loop externo o el
   * controlador de despertar de capacidad se dispara. Devuelve la señal
   * fusionada y una función de limpieza que remueve los listeners cuando
   * el sleep resuelve normalmente (sin abortar).
   */
  signal(): CapacitySignal
  /**
   * Aborta el sleep de "en capacidad" actual y arma un controlador
   * nuevo para que el poll loop re-chequee trabajo nuevo de inmediato.
   */
  wake(): void
}

export function createCapacityWake(outerSignal: AbortSignal): CapacityWake {
  let wakeController = new AbortController()

  function wake(): void {
    wakeController.abort()
    wakeController = new AbortController()
  }

  function signal(): CapacitySignal {
    const merged = new AbortController()
    const abort = (): void => merged.abort()
    if (outerSignal.aborted || wakeController.signal.aborted) {
      merged.abort()
      return { signal: merged.signal, cleanup: () => {} }
    }
    outerSignal.addEventListener('abort', abort, { once: true })
    const capSig = wakeController.signal
    capSig.addEventListener('abort', abort, { once: true })
    return {
      signal: merged.signal,
      cleanup: () => {
        outerSignal.removeEventListener('abort', abort)
        capSig.removeEventListener('abort', abort)
      },
    }
  }

  return { signal, wake }
}
