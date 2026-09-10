/**
 * Puerto de `ccnmt: packages/output/src/index.ts` (verbatim).
 *
 * Punto de entrada del paquete `output`: el contrato de `OutputEvent`/
 * `OutputTarget` y sus tres implementaciones sin dependencia visual
 * (json/silent/terminal). Ver `package.json` para el resto de la
 * superficie portada (buffers, formatters, capture/ansi-to-svg,
 * utils/*) y el analisis de la iniciativa para lo que queda diferido.
 */
export type { OutputEvent, OutputTarget } from './contracts.js'
export { JsonOutputTarget } from './targets/json.js'
export { SilentOutputTarget } from './targets/silent.js'
export { TerminalOutputTarget } from './targets/terminal.js'
export * from './errors.js'
