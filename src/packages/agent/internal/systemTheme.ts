/**
 * Porte de `ccnmt: packages/agent/internal/systemTheme.ts`.
 *
 * `resolveThemeSetting` deja pasar cualquier ajuste explícito y sólo
 * dispara detección cuando el ajuste literal es `"auto"`. La detección lee
 * `COLORFGBG` (convención de xterm/muchas terminales: `"fg;bg"`, a veces
 * con un tercer segmento intermedio) y cachea el resultado a nivel de
 * módulo — un cambio de env posterior no invalida la cache.
 *
 * DIVERGENCIA DE ALCANCE, declarada. La fuente lee la variable con
 * `readEnv` de `@claude-code-how-works/config/env/utils`, que ese paquete
 * define como `process.env[name]` sin ninguna transformación
 * (`ccnmt: packages/config/env/utils.ts:198`). Ese paquete no vive en este
 * árbol y traerlo entero para una función de una línea no tiene
 * consumidor propio todavía, así que aquí se lee `process.env` directo.
 */

type SystemTheme = 'dark' | 'light'

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
  const colorfgbg = process.env.COLORFGBG
  if (!colorfgbg) return undefined
  const parts = colorfgbg.split(';')
  const bg = parts[parts.length - 1]
  if (bg === undefined || bg === '') return undefined
  const bgNum = Number(bg)
  if (!Number.isInteger(bgNum) || bgNum < 0 || bgNum > 15) return undefined
  return bgNum <= 6 || bgNum === 8 ? 'dark' : 'light'
}
