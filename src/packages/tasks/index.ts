/**
 * `@thyrox/tasks` — el subsistema de tareas, extraido del paquete del bucle.
 *
 * Por que es un paquete propio y no una carpeta del harness: medido antes de
 * moverlo, el bucle **no lo importa ni una vez**. Sus unicos consumidores eran
 * `bin/harness.ts` —el ejecutable— y dos tests. Un mecanismo que el bucle no
 * usa no es parte del bucle: viajaba dentro de su paquete, que es exactamente
 * lo que la Opcion B corrige.
 *
 * Aristas medidas al extraerlo: bucle -> tasks = 0, tasks -> bucle = 0. Por eso
 * este fue el primer tramo: no habia nudo que deshacer.
 *
 * Vive tras su propia frontera de directorio con su propio manifiesto, que es
 * la forma que las cinco referencias comparten para alojar una lengua no
 * dominante (`analisis-toolchains-en-las-referencias.rst`). Por eso NO aterrizo
 * en `src/task/`, que es la raiz Python homonima.
 */
export { fsPremiseIo, readPremises } from './io.ts'
export { assessAll, assessPremise, type PremiseIo, type TaskPremise } from './premises.ts'
export { parseRstTasks } from './rst.ts'
