/**
 * `@thyrox/output/capture` — barrel export.
 *
 * Adaptado de `ccnmt: packages/output/src/capture/index.ts`. La fuente
 * reexporta tambien `./ansi-to-png.js` (texto → PNG via fuente de bitmap
 * embebida) y `./asciicast.js` (grabacion de sesion); ninguno se reexporta
 * aqui:
 *
 * - `ansi-to-png.js` depende de `stringWidth` de `@anthropic/ink`, no
 *   portado (ver el analisis de la iniciativa).
 * - `asciicast.js` depende de tres hermanos que hoy no resuelven desde
 *   este paquete: `@claude-code-how-works/local-observability` (paquete
 *   inexistente en este arbol), y dos simbolos que sus archivos fuente SI
 *   tienen pero que `@thyrox/app-host` y `@thyrox/storage` aun no
 *   exponen en su `exports` — `bootstrap/state.js`/`bootstrap/cleanupRegistry.js`
 *   del primero, `fsOperations.js` del segundo.
 */

export * from './ansi-to-svg.js'
