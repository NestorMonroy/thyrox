/**
 * `@thyrox/output/capture` — barrel export.
 *
 * Adaptado de `ccnmt: packages/output/src/capture/index.ts`, que reexporta
 * tambien `./ansi-to-png.js` (texto -> PNG) y `./asciicast.js` (grabacion de
 * sesion). Los dos se excluian por dependencias que no resolvian
 * (`stringWidth` de `@anthropic/ink`, y dos hermanos de `app-host` y
 * `storage`). Medido 2026-09-23 importandolos con Bun: los dos cargan, porque
 * `@ant/ink` se publica como `@anthropic/ink` y ya exporta `stringWidth`. La
 * exclusion ya no tenia causa y se reexportan como en la fuente.
 */

export * from './ansi-to-svg.js'
export * from './ansi-to-png.js'
export * from './asciicast.js'
