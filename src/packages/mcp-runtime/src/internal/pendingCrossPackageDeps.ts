/**
 * Sustitutos locales de símbolos que, en `ccnmt` (el árbol de referencia),
 * vienen de OTROS paquetes del monorepo —
 * `@claude-code-how-works/{config,provider}` — y que `@thyrox/{config,
 * provider}` todavía no exportan por ese subpath, o exportan el subpath
 * pero no ese símbolo (porte parcial). Mismo patrón que
 * `@thyrox/storage: src/internal/pendingCrossPackageDeps.ts` y
 * `@thyrox/local-observability: src/internal/pendingCrossPackageDeps.ts`:
 * un archivo consolidado, cada entrada con su cita de origen, su
 * divergencia exacta y su condición de retiro — en vez de reescribir el
 * mismo cuerpo en cada archivo de `mcp-runtime` que lo necesita.
 *
 * Sólo REIMPLEMENTACIÓN FIEL en este archivo — el símbolo es puro/simple y
 * su cuerpo real cabe verbatim. Se retira cuando el paquete hermano
 * exporte el subpath/símbolo real (el filtro de dos pasos vuelve a
 * verificarse entonces, no se asume).
 */

import { homedir } from 'node:os'
import { join } from 'node:path'

/**
 * Sustituto de `@claude-code-how-works/config/env/utils.js`'s
 * `getClaudeConfigHomeDir` — verbatim a `utils.ts:20-27` (memoizado, clave =
 * `CLAUDE_CONFIG_DIR`). `@thyrox/config` sólo exporta `./env/utils` con
 * `isEnvTruthy`/`readEnv`/`getAllEnv` (porte parcial TASK-DOCS-0200) — este
 * símbolo está entre los 14 omitidos. Idéntica reimplementación a la que ya
 * usa `@thyrox/local-observability: src/internal/pendingCrossPackageDeps.ts`
 * (mismo origen, mismo cuerpo verbatim); consolidada aquí para no repetirla
 * por tercera vez en este paquete — episodio que la origina:
 * :ref:`h-docs-1160`, donde un repunte por `grep` (sin resolución real)
 * confundió este símbolo con uno que sí resuelve.
 */
let _claudeConfigHomeDirCache: { key: string | undefined; value: string } | null =
  null
export function getClaudeConfigHomeDir(): string {
  const key = process.env.CLAUDE_CONFIG_DIR
  if (_claudeConfigHomeDirCache && _claudeConfigHomeDirCache.key === key) {
    return _claudeConfigHomeDirCache.value
  }
  const value = (key ?? join(homedir(), '.claude')).normalize('NFC')
  _claudeConfigHomeDirCache = { key, value }
  return value
}

/**
 * Sustituto de `@claude-code-how-works/config/env/utils.js`'s
 * `isEnvDefinedFalsy` — verbatim a `utils.ts:50-58`. Mismo estado que el
 * anterior: `@thyrox/config/env/utils` no lo exporta todavía.
 */
export function isEnvDefinedFalsy(
  envVar: string | boolean | undefined,
): boolean {
  if (envVar === undefined) return false
  if (typeof envVar === 'boolean') return !envVar
  if (!envVar) return false
  const normalizedValue = envVar.toLowerCase().trim()
  return ['0', 'false', 'no', 'off'].includes(normalizedValue)
}
