/**
 * `@thyrox/output/formatters` — barrel export.
 *
 * Adaptado de `ccnmt: packages/output/src/formatters/index.ts`. La fuente
 * `truncate.ts` y su dependencia `stringWidth` de `@anthropic/ink` ya están
 * portados en este árbol. Se reexporta el módulo canónico en lugar de mantener
 * una exclusión heredada que ya no describe el checkout.
 */

export * from './format.js'
export * from './brief-timestamp.js'
export * from './truncate.js'
