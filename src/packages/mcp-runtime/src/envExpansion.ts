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
 * como deuda de import sin resolver hasta que ese subpath se adapte, mismo
 * criterio que la deuda ya congelada en `tests/package/dependencies_baseline.txt`
 * para `app-host`/`cli`.
 *
 * Corrección sobre la primera versión de este archivo (H-DOCS-1160,
 * descubrimiento del defecto sistémico): un `export { X } from '...'`
 * ESTÁTICO de un especificador cuya base (`@claude-code-how-works/*`) no
 * existe en este árbol hace fallar la carga del MÓDULO ENTERO (`Cannot find
 * module`, medido con `bun -e "import(...)"`), no sólo el símbolo
 * reexportado. Este archivo no tiene consumidores todavía dentro de
 * mcp-runtime (verificado: `grep -rn expandEnvVarsInString src/` sin
 * resultados fuera de este archivo), así que envolverlo en una función que
 * diferí el `require()` no rompe ninguna llamada existente — sólo cambia
 * `export { fn }` por `export function fn(...)`, misma firma en la llamada.
 */

function requireConfigEnvExpansion(): {
  expandEnvVarsInString: (value: string) => {
    expanded: string
    missingVars: string[]
  }
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/config/utils/envExpansion.js')
}

export function expandEnvVarsInString(value: string): {
  expanded: string
  missingVars: string[]
} {
  return requireConfigEnvExpansion().expandEnvVarsInString(value)
}
