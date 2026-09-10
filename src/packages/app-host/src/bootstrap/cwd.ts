/**
 * Porte de `ccnmt: packages/app-host/src/bootstrap/cwd.ts`.
 *
 * La dependencia que este encabezado declaraba sin resolver —`getCwdState` y
 * `getOriginalCwd` de `./state.js`, que otro agente estaba escribiendo en
 * paralelo— YA ESTÁ. Su condición de cierre era que ese archivo declarara los
 * dos símbolos, y los declara. El aviso se retira en vez de dejarlo pudrirse:
 * un bloqueo caducado que nadie borra se lee como bloqueo vigente, y la
 * siguiente persona vuelve a rodearlo.
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
