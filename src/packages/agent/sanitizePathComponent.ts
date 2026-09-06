/**
 * Saneo de un componente de ruta — porte de `ccnmt: packages/agent/tasks.ts`
 * (`sanitizePathComponent`).
 *
 * DIVERGENCIA DE SITIO, declarada. En la referencia el mecanismo vive en el
 * tablero, porque su tablero escribe un archivo por tarea y el nombre del
 * archivo ES el identificador. El tablero de aqui persiste en sqlite y no
 * construye ninguna ruta, asi que ahi no tendria consumidor. Su rol es la
 * CONSTRUCCION DE RUTAS, y por eso vive junto a `docs.ts`, que es donde este
 * arbol arma rutas con un componente variable.
 */

/**
 * La lista blanca: alfanumerico ASCII, guion y guion bajo. Todo lo demas
 * pasa a guion.
 *
 * Es lista BLANCA y no negra a proposito. Una lista negra tiene que
 * enumerar cada vector —`..`, la barra, la contrabarra, el byte nulo, los
 * metacaracteres del interprete— y falla por el que no enumero. Esta falla
 * al reves: un caracter legitimo que no este en la lista se degrada a guion,
 * que es feo y no es una travesia de directorio.
 *
 * Ciega a: la colision. Dos entradas distintas pueden dar el mismo
 * componente saneado (`a/b` y `a-b` dan los dos `a-b`), asi que el saneo
 * protege la RUTA, no la unicidad. Quien necesite unicidad la toma del
 * identificador, no de su forma saneada.
 */
const ALLOWED = /[^a-zA-Z0-9_-]/g

/** Sanea un componente de ruta. Es idempotente: su salida ya pasa la lista. */
export function sanitizePathComponent(input: string): string {
  return input.replace(ALLOWED, '-')
}
