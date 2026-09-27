/**
 * Umbral a partir del cual la duración de un hook se muestra al usuario.
 *
 * Vive aparte de `toolExecution.ts` para que la interfaz (`repl`) lo importe
 * sin arrastrar el ejecutor de herramientas: antes lo leía de un global
 * declarado en `cli/src/types/global.d.ts`, y `repl` sólo compilaba dentro
 * del programa de `cli`.
 */
export const HOOK_TIMING_DISPLAY_THRESHOLD_MS = 500
