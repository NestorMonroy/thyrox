/**
 * Puerto de `ccnmt: packages/config/env/index.ts` (13 líneas fuente) — un
 * barrel puro. La fuente re-exporta seis hermanos: `./utils.js`,
 * `./validation.js`, `./privacy.js`, `./git-settings.js`, `./paths.js`,
 * `./dynamic.js`. Sólo DOS están dentro de los 15 módulos del alcance:
 * `utils` (ya portado antes de este pase, `../env/utils.ts`) y `dynamic`
 * (`./dynamic.ts`, portado en este mismo pase).
 *
 * Los otros cuatro NO se re-exportan aquí — `validation.ts`,
 * `privacy.ts`, `git-settings.ts` y `paths.ts` están fuera del alcance de
 * los 15 módulos, y un `export * from` hacia un archivo ausente rompería la
 * carga del barrel entero (a diferencia de un `require()` diferido dentro
 * de una función, un `export * from` estático SÍ se resuelve al cargar el
 * módulo). Reexportarlos con nombres inventados sería fabricar un módulo
 * que la fuente no tiene en esta forma — «un módulo fabricado es peor que
 * uno ausente» (`porte-completo-no-parcial.md`).
 */

export * from './utils.js'
export * from './dynamic.js'
