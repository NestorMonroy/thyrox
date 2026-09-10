import { join } from 'path'

/**
 * Porte fiel de `ccnmt: packages/config/settings/managedPath.ts` — el
 * paquete `@claude-code-how-works/config` no tiene hogar en este árbol
 * (DEC-04), así que el único símbolo que `loadSkillsDir.ts` consume se
 * porta aquí, co-ubicado con su único consumidor.
 *
 * Divergencia declarada: la fuente memoiza con `lodash-es/memoize`, ausente
 * en `command-runtime` (0 dependencias declaradas en su `package.json`).
 * Se sustituye por una memoización manual de 0 argumentos — funcionalmente
 * idéntica para una función sin parámetros — en vez de añadir la
 * dependencia sólo para este porte.
 */
function getManagedSettingsPlatform(): 'macos' | 'windows' | 'other' {
  if (process.platform === 'darwin') return 'macos'
  if (process.platform === 'win32') return 'windows'
  return 'other'
}

let cachedManagedFilePath: string | undefined

/**
 * Get the path to the managed settings directory based on the current platform.
 */
export function getManagedFilePath(): string {
  if (cachedManagedFilePath !== undefined) return cachedManagedFilePath

  // Allow override for testing/demos (Ant-only, eliminated from external builds)
  if (
    process.env.USER_TYPE === 'ant' &&
    process.env.CLAUDE_CODE_MANAGED_SETTINGS_PATH
  ) {
    cachedManagedFilePath = process.env.CLAUDE_CODE_MANAGED_SETTINGS_PATH
    return cachedManagedFilePath
  }

  switch (getManagedSettingsPlatform()) {
    case 'macos':
      cachedManagedFilePath = '/Library/Application Support/ClaudeCode'
      break
    case 'windows':
      cachedManagedFilePath = 'C:\\Program Files\\ClaudeCode'
      break
    default:
      cachedManagedFilePath = '/etc/claude-code-how-works-how-works'
  }
  return cachedManagedFilePath
}

/**
 * Get the path to the managed-settings.d/ drop-in directory.
 * managed-settings.json is merged first (base), then files in this directory
 * are merged alphabetically on top (drop-ins override base, later files win).
 */
export function getManagedSettingsDropInDir(): string {
  return join(getManagedFilePath(), 'managed-settings.d')
}
