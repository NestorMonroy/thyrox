import type { Point } from './layout/geometry.js'

/**
 * El cursor del TERMINAL: su posicion en la rejilla y si se dibuja.
 *
 * Su forma se DERIVO de los cuatro sitios que lo construyen —`frame.ts`,
 * `renderer.ts` dos veces e `ink.tsx`— y de las diecisiete lecturas que hace
 * el motor de diferencias (`x` 7, `y` 9, `visible` 1). Los cuatro construyen
 * exactamente `{ x, y, visible }`, y `log-update.ts` lo pasa a
 * `new VirtualScreen(origin: Point, …)`, que es lo que obliga a que extienda
 * `Point` en vez de declarar dos numeros sueltos.
 *
 * Antes era `export type Cursor = unknown`, un stub auto-generado. No era una
 * omision de nuestro porte —la fuente lo tiene igual— asi que no habia de
 * donde copiarlo: se derivo del uso. Ese `unknown` producia quince TS18046 y
 * un TS2345 en dos archivos, o sea **dieciseis de los treinta y siete**
 * errores del paquete.
 *
 * NO confundir con el cursor de TEXTO (`@thyrox/repl/Cursor.js`), que es otro
 * tipo y otra cosa: lleva `offset`, `startOfLogicalLine`, `nextWord` y demas,
 * y lo consumen `vim/` y `search/`. Comparten el nombre `cursor` y nada mas
 * —el significante, no el significado—; darle a este los metodos de aquel
 * seria portar el tipo equivocado.
 */
export type Cursor = Point & {
  /** Si el terminal lo dibuja. El motor de diferencias emite `cursorShow`
   *  cuando pasa a verdadero al terminar un frame. */
  visible: boolean
}
