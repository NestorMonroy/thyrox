/**
 * Sustituto local, compartido, para `@claude-code-how-works/shell/shellConfig.ts`
 * — módulo entero ausente en `@thyrox/shell` (medido con
 * `Bun.resolveSync('@thyrox/shell/shellConfig.js', <dir>)` desde este
 * paquete: "Cannot find module"). Lo usan tanto `autoUpdater.ts` como
 * `nativeInstaller/installer.ts`; se centraliza aquí en vez de repetir
 * el `require()` diferido en cada punto de uso.
 *
 * Se retira en cuanto `@thyrox/shell/shellConfig.ts` exista, sustituyendo
 * el import por el real.
 */

export type ShellConfigApi = {
  getShellConfigPaths: () => Record<string, string>
  readFileLines: (path: string) => Promise<string[] | null>
  filterClaudeAliases: (lines: string[]) => {
    filtered: string[]
    hadAlias: boolean
  }
  writeFileLines: (path: string, lines: string[]) => Promise<void>
}

let _cached: ShellConfigApi | null | undefined

/**
 * Devuelve la API de `shellConfig` si el módulo existe, o `null` si no
 * resuelve. Cachea el resultado (incluido el `null`) para no reintentar
 * el `require()` en cada llamada.
 */
export function tryGetShellConfig(): ShellConfigApi | null {
  if (_cached !== undefined) {
    return _cached
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _cached = require('@thyrox/shell/shellConfig.js') as ShellConfigApi
  } catch {
    _cached = null
  }
  return _cached
}
