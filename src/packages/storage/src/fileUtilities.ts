/**
 * Porte PARCIAL, declarado, de `ccnmt: packages/storage/src/file.ts`
 * (19 859 bytes fuente, 24 símbolos exportados).
 *
 * `file.ts` YA EXISTE en este árbol con un porte parcial previo (sólo
 * `atomicWriteFile`, ver su docstring) que no me pertenece — no se toca.
 * Estos cinco símbolos de la MISMA fuente se portan aquí, en un módulo
 * propio, para no colisionar con ese porte:
 *
 *   - `isCompactLinePrefixEnabled` / `addLineNumbers` / `stripLineNumberPrefix`
 *     — formato "cat -n" que el tool Read añade a cada línea, y su inverso.
 *   - `convertLeadingTabsToSpaces` — normaliza tabs de indentación a espacios.
 *   - `normalizePathForComparison` / `pathsEqual` — comparación de rutas
 *     sensible a plataforma (Windows es case-insensitive; POSIX no).
 *
 * Los otros 19 símbolos de `file.ts` (I/O de archivo, `getDisplayPath`,
 * `findSimilarFile`, etc.) NO se portan — ningún test de este pase los
 * ejercita.
 *
 * Divergencia declarada — inyección de dependencias: la fuente lee
 * `getFeatureValue_CACHED_MAY_BE_STALE('tengu_compact_line_prefix_killswitch', …)`
 * de `@claude-code-how-works/config/feature-flags` y `getPlatform()` de
 * `@claude-code-how-works/config/platform`; ninguno de los dos paquetes
 * existe en este árbol, y su test de origen los inyecta con
 * `mock.module()` sobre esas rutas. Aquí se sustituyen por el mismo patrón
 * de inyección por setter que ya usa este paquete en
 * `internal/pendingCrossPackageDeps.ts` (`setGetCwdFn`): dos setters,
 * `setCompactLinePrefixKillswitchForTests` y `setPlatformForTests`, con
 * valor por defecto = el comportamiento real (killswitch off, plataforma
 * del host).
 */
import { normalize } from 'node:path'

export type Platform = 'macos' | 'windows' | 'linux' | 'unknown'

let platformOverride: Platform | null = null

/** Sólo para tests — fuerza el valor que devuelve `getPlatform()`. `null` = auto-detectar. */
export function setPlatformForTests(p: Platform | null): void {
  platformOverride = p
}

function getPlatform(): Platform {
  if (platformOverride) return platformOverride
  if (process.platform === 'darwin') return 'macos'
  if (process.platform === 'win32') return 'windows'
  if (process.platform === 'linux') return 'linux'
  return 'unknown'
}

let compactLinePrefixKillswitchOverride: boolean | null = null
let tabReadSepOverride: boolean | null = null

/** Sólo para tests — fuerza `tengu_compact_line_prefix_killswitch`. `null` = default (false). */
export function setCompactLinePrefixKillswitchForTests(v: boolean | null): void {
  compactLinePrefixKillswitchOverride = v
}

/** Sólo para tests — fuerza `tengu_tab_read_sep`. `null` = default (false). */
export function setTabReadSepForTests(v: boolean | null): void {
  tabReadSepOverride = v
}

/**
 * Whether to use the compact line-number prefix format (`N\t` instead of
 * `     N→`). Killswitch pattern: default off = compact format enabled.
 */
export function isCompactLinePrefixEnabled(): boolean {
  const tabReadSep = tabReadSepOverride ?? false
  if (tabReadSep) return true
  const killswitch = compactLinePrefixKillswitchOverride ?? false
  return !killswitch
}

/**
 * Adds cat -n style line numbers to the content.
 */
export function addLineNumbers({
  content,
  // 1-indexed
  startLine,
}: {
  content: string
  startLine: number
}): string {
  if (!content) {
    return ''
  }

  const lines = content.split(/\r?\n/)

  if (isCompactLinePrefixEnabled()) {
    return lines
      .map((line, index) => `${index + startLine}\t${line}`)
      .join('\n')
  }

  return lines
    .map((line, index) => {
      const numStr = String(index + startLine)
      if (numStr.length >= 6) {
        return `${numStr}→${line}`
      }
      return `${numStr.padStart(6, ' ')}→${line}`
    })
    .join('\n')
}

/**
 * Inverse of addLineNumbers — strips the `N→` or `N\t` prefix from a single
 * line. Co-located so format changes here and in addLineNumbers stay in sync.
 */
export function stripLineNumberPrefix(line: string): string {
  const match = line.match(/^\s*\d+[→\t](.*)$/)
  return match?.[1] ?? line
}

export function convertLeadingTabsToSpaces(content: string): string {
  // The /gm regex scans every line even on no-match; skip it entirely
  // for the common tab-free case.
  if (!content.includes('\t')) return content
  return content.replace(/^\t+/gm, _ => '  '.repeat(_.length))
}

/**
 * Normalize a file path for comparison, handling platform differences.
 * On Windows, normalizes path separators and converts to lowercase for
 * case-insensitive comparison.
 */
export function normalizePathForComparison(filePath: string): string {
  let normalized = normalize(filePath)

  if (getPlatform() === 'windows') {
    normalized = normalized.replace(/\//g, '\\').toLowerCase()
  }

  return normalized
}

/**
 * Compare two file paths for equality, handling Windows case-insensitivity.
 */
export function pathsEqual(path1: string, path2: string): boolean {
  return normalizePathForComparison(path1) === normalizePathForComparison(path2)
}
