/**
 * Porte COMPLETO de `ccnmt: packages/mcp-runtime/src/envExpansion.ts` — su
 * única exportación (un shim de reexportación), ninguna omitida.
 *
 * Shim de reenvío — la fuente se movió a
 * `@claude-code-how-works/config/utils/envExpansion` para romper el ciclo
 * config → mcp-runtime que forzaba un fallback de `require()` diferido en
 * `config/plugin/_deps.ts`. Se reexporta así para que los imports
 * existentes sigan funcionando.
 *
 * `@thyrox/config` NO declara todavía el subpath `./utils/envExpansion.js`
 * en su mapa de `exports` (sólo `.`, `./types`, `./constants`,
 * `./validation`, `./load`, `./env/utils`) — el especificador se conserva
 * verbatim y queda como deuda de import sin resolver hasta que ese
 * subpath se adapte, mismo criterio que la deuda ya congelada en
 * `tests/package/dependencies_baseline.txt` para `app-host`/`cli`.
 */
export { expandEnvVarsInString } from '@claude-code-how-works/config/utils/envExpansion.js'
