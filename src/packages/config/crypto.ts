/**
 * Puerto de `ccnmt: packages/config/crypto.ts` (11 líneas fuente).
 * Reimplementación fiel VERBATIM.
 *
 * Punto de indirección para el campo "browser" de package.json: cuando bun
 * construye un bundle de navegador con `--target browser`, este archivo se
 * sustituye por una variante `crypto.browser.ts` (no portada aquí — ningún
 * consumidor de este árbol construye para navegador todavía) para evitar un
 * polyfill de ~500KB que Bun incluiría para `import ... from 'crypto'`. Los
 * builds de Node/Bun usan este archivo tal cual.
 *
 * La fuente advierte: `export { randomUUID } from 'crypto'` (sintaxis de
 * re-exportación directa) rompe bajo la compilación a bytecode interna de
 * bun — el import-y-luego-export explícito de abajo produce un binding en
 * vivo correcto.
 */
import { randomUUID } from 'node:crypto'
export { randomUUID }
