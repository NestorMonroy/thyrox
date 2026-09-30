import type { ThemeName } from '@anthropic/ink'
import { readEnv } from '@thyrox/config/env/utils'

type SystemTheme = 'dark' | 'light'

/**
 * El catálogo de temas renderizables, como registro para que tsc exija
 * que esté completo contra `ThemeName` (una clave de más o de menos no
 * compila) sin importar ink en tiempo de ejecución.
 */
const THEME_NAME_SET: Record<ThemeName, true> = {
  dark: true,
  light: true,
  'light-daltonized': true,
  'dark-daltonized': true,
  'light-ansi': true,
  'dark-ansi': true,
}

function isThemeName(value: string): value is ThemeName {
  return Object.hasOwn(THEME_NAME_SET, value)
}

/**
 * Resuelve el ajuste de tema a un `ThemeName` renderizable. `'auto'` se
 * detecta como en `resolveThemeSetting`; un nombre fuera del catálogo cae a
 * `'dark'`, que es exactamente lo que `getTheme` de ink hace con él en su
 * rama `default` (`@ant/ink/src/theme/theme-types.ts`), así que el color
 * observado no cambia — sólo deja de viajar como `string` en un contexto
 * tipado `ThemeName`.
 */
export function resolveThemeName(setting: string): ThemeName {
  const resolved = resolveThemeSetting(setting)
  return isThemeName(resolved) ? resolved : 'dark'
}

let cachedSystemTheme: SystemTheme | undefined

export function resolveThemeSetting(setting: string): string {
  if (setting === 'auto') {
    return getSystemThemeName()
  }
  return setting
}

function getSystemThemeName(): SystemTheme {
  if (cachedSystemTheme === undefined) {
    cachedSystemTheme = detectFromColorFgBg() ?? 'dark'
  }
  return cachedSystemTheme
}

function detectFromColorFgBg(): SystemTheme | undefined {
  const colorfgbg = readEnv('COLORFGBG')
  if (!colorfgbg) return undefined
  const parts = colorfgbg.split(';')
  const bg = parts[parts.length - 1]
  if (bg === undefined || bg === '') return undefined
  const bgNum = Number(bg)
  if (!Number.isInteger(bgNum) || bgNum < 0 || bgNum > 15) return undefined
  return bgNum <= 6 || bgNum === 8 ? 'dark' : 'light'
}
