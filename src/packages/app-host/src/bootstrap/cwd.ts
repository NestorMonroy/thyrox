/**
 * Porte de `ccnmt: packages/app-host/src/bootstrap/cwd.ts`.
 *
 * DEPENDENCIA NO RESUELTA, DECLARADA: importa `getCwdState` y
 * `getOriginalCwd` de `./state.js`, que otro agente de esta misma tanda
 * está escribiendo AHORA MISMO (no se toca ese archivo, per las
 * instrucciones de esta tarea). Medido al escribir este porte
 * (`grep -n "getCwdState\|getOriginalCwd" state.ts` → sin resultados): el
 * `state.ts` en curso hoy sólo exporta el estado de telemetría/meter
 * (`getMeter`, `getStatsStore`, …), no el estado de cwd/sesión que este
 * módulo necesita. `cwd.test.ts` queda por tanto en ROJO hasta que
 * `getCwdState`/`getOriginalCwd` se añadan a `state.ts` — DESCONOCIDO con
 * condición de cierre: que ese archivo declare esos dos símbolos.
 */
import { AsyncLocalStorage } from 'async_hooks'
import { getCwdState, getOriginalCwd } from './state.js'

const cwdOverrideStorage = new AsyncLocalStorage<string>()

/**
 * Corre una función con un directorio de trabajo sobrepuesto para el
 * contexto async actual. Todas las llamadas a pwd()/getCwd() dentro de
 * la función (y sus descendientes async) devolverán el cwd sobrepuesto
 * en vez del global. Esto permite que agentes concurrentes vean cada uno
 * su propio directorio de trabajo sin afectarse entre sí.
 */
export function runWithCwdOverride<T>(cwd: string, fn: () => T): T {
  return cwdOverrideStorage.run(cwd, fn)
}

/**
 * Devuelve el directorio de trabajo actual
 */
export function pwd(): string {
  return cwdOverrideStorage.getStore() ?? getCwdState()
}

/**
 * Devuelve el directorio de trabajo actual, o el original si el actual
 * no está disponible
 */
export function getCwd(): string {
  try {
    return pwd()
  } catch {
    return getOriginalCwd()
  }
}
