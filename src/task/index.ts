/**
 * El subsistema de tareas — su mitad TypeScript, junto a la mitad Python.
 *
 * Por qué NO es un paquete propio, y por qué antes lo fue: la extracción del
 * bucle midió dos aristas —bucle → tareas = 0, tareas → bucle = 0— y de ahí
 * concluyó dos cosas. La primera sigue en pie: **el mecanismo no pertenece al
 * bucle**, sus consumidores son el ejecutable y sus tests. La segunda era
 * falsa: que por eso fuera un paquete.
 *
 * Lo corrige el análisis de la referencia
 * (`analisis-flujo-de-tareas-en-ccnmt.rst`): allí cinco roles alojan el sujeto
 * en dieciocho directorios y **cero paquetes llevan su nombre**. Un mecanismo
 * que no pertenece al bucle no se vuelve paquete: se vuelve subdirectorio del
 * rol al que sirve. Y la medición decisiva estaba hecha y se leyó al revés —
 * el paquete tenía UN consumidor, y un paquete con un consumidor es un
 * directorio con manifiesto.
 *
 * La forma que adopta es la del árbol, no una invención: `src/paths/`
 * (`reach.py` + `reach.ts` + `docs.ts`) y `src/store/` (`agent_sessions.py` +
 * `db.ts`) ya alojan las dos mitades de un mecanismo bajo una raíz nombrada
 * por su ROL. `src/task/` hace lo mismo con sus 9 `.py`, sus 7 `.sh` y estos
 * cuatro `.ts`.
 *
 * La frase que este docstring decía —«vive tras su propia frontera de
 * directorio con su propio manifiesto, que es la forma que las cinco
 * referencias comparten»— se retira: medido en este árbol, cinco `.ts` viven
 * fuera de `src/packages/` y tres de ellos junto a un hermano Python. La
 * frontera declarada no era la del árbol.
 */
export { fsPremiseIo, readPremises } from './io.ts'
export { assessAll, assessPremise, type PremiseIo, type TaskPremise } from './premises.ts'
export { parseRstTasks } from './rst.ts'
