/**
 * La pausa de memoria de la sesión: `/pause-memory` la alterna, y mientras
 * está puesta la memoria automática queda apagada y las guardas de ruta
 * niegan leer y escribir bajo su directorio.
 *
 * Porte de 2.1.281: `isMemoryPaused` ≙ `Yh`, `setMemoryPaused` ≙ `E5`
 * (`chunk-cqc88nqm.js`). En el binario el indicador vive en las banderas de
 * sesión del anfitrión (`sessionFlags.memoryToggledOff`); aquí vive en
 * `@thyrox/memory`, la dependencia común más baja de sus lectores
 * (`permission`, `command-runtime` y este mismo paquete, que no dependen del
 * anfitrión en esa dirección). Es estado de proceso, como el del binario:
 * no se persiste y arranca en `false`.
 */
let memoryToggledOff = false

export function isMemoryPaused(): boolean {
  return memoryToggledOff
}

export function setMemoryPaused(paused: boolean): void {
  memoryToggledOff = paused
}
