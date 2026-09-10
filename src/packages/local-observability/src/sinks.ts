/**
 * Puerto de `ccnmt: packages/local-observability/src/sinks.ts` (14
 * líneas fuente, 100 % portado).
 */

import { initializeErrorLogSink } from './logging/error-log-sink.js'

/**
 * Acopla los sinks locales al proceso que NO reenvían telemetría hacia
 * afuera. Se llama desde setup() para el comando por defecto; otros
 * puntos de entrada (subcomandos, daemon, bridge) lo llaman
 * directamente porque no pasan por setup().
 *
 * Módulo hoja — se mantiene fuera de setup.ts para evitar el ciclo de
 * import setup → commands → bridge → setup.
 */
export function initSinks(): void {
  initializeErrorLogSink()
}
