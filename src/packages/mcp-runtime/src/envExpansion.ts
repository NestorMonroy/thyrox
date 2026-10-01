/**
 * Porte de `ccnmt: packages/mcp-runtime/src/envExpansion.ts` — su única
 * exportación.
 *
 * Reenvío: la expansión vive en `@thyrox/config/utils/envExpansion`, donde la
 * fuente la movió para romper el ciclo config → mcp-runtime, y aquí se
 * reexporta para que los imports existentes sigan funcionando.
 */
export { expandEnvVarsInString } from '@thyrox/config/utils/envExpansion.js'
