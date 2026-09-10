/**
 * `@thyrox/output/formatters` — barrel export.
 *
 * Adaptado de `ccnmt: packages/output/src/formatters/index.ts`. La fuente
 * reexporta tambien `./truncate.js`; aqui NO se reexporta porque ese modulo
 * depende de `stringWidth` de `@anthropic/ink` (no portado — ver el analisis
 * de la iniciativa) y esta deliberadamente ausente de este pase.
 */

export * from './format.js'
export * from './brief-timestamp.js'
