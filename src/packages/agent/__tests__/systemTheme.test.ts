/**
 * Porte de `ccnmt: packages/agent/__tests__/systemTheme.test.ts`.
 * Ejercita `resolveThemeSetting` de `internal/systemTheme.ts`: el paso a
 * través para cualquier ajuste explícito, y la detección por `COLORFGBG`
 * cuando el ajuste es `"auto"`, con cache a nivel de módulo.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

// Env real via process.env + set/delete directo. No mock.module — el
// mock de un módulo contamina el proceso y se filtra a tests hermanos
// (lección de la fuente: fallo de release por mock.module compartido
// entre `subprocessEnv.test.ts` y un módulo hermano).
const ENV_KEY = 'COLORFGBG'
let savedEnv: string | undefined

// La cache resetea al recargar el módulo. Se reimporta en cada test para
// limpiar el `cachedSystemTheme` a nivel de módulo.
async function freshResolveThemeSetting() {
  const mod = await import(
    '../internal/systemTheme.js?bust=' + Math.random()
  )
  return mod.resolveThemeSetting as (s: string) => string
}

beforeEach(() => {
  savedEnv = process.env[ENV_KEY]
  delete process.env[ENV_KEY]
})

afterEach(() => {
  if (savedEnv === undefined) delete process.env[ENV_KEY]
  else process.env[ENV_KEY] = savedEnv
})

describe('resolveThemeSetting — ajustes explícitos', () => {
  test('"dark" → "dark" (pasa tal cual)', async () => {
    const fn = await freshResolveThemeSetting()
    expect(fn('dark')).toBe('dark')
  })

  test('"light" → "light"', async () => {
    const fn = await freshResolveThemeSetting()
    expect(fn('light')).toBe('light')
  })

  test('"high-contrast" (nombre de tema propio) → pasa tal cual', async () => {
    // Contrato: sólo "auto" dispara la detección. Cualquier otra cadena
    // se devuelve tal cual para que quien llame pueda pasar nombres de
    // tema propios.
    const fn = await freshResolveThemeSetting()
    expect(fn('high-contrast')).toBe('high-contrast')
  })

  test('cadena vacía pasa tal cual (no es "auto")', async () => {
    const fn = await freshResolveThemeSetting()
    expect(fn('')).toBe('')
  })

  test('"AUTO" (mayúsculas) NO dispara detección — sensible a mayúsculas', async () => {
    // El chequeo es `setting === 'auto'`, exacto en minúsculas. Un
    // refactor futuro que agregue .toLowerCase() cambiaría el
    // comportamiento en silencio.
    const fn = await freshResolveThemeSetting()
    expect(fn('AUTO')).toBe('AUTO')
  })
})

describe('resolveThemeSetting — detección automática', () => {
  test('auto + sin COLORFGBG → default "dark"', async () => {
    const fn = await freshResolveThemeSetting()
    expect(fn('auto')).toBe('dark')
  })

  test('auto + COLORFGBG bg=0 (negro) → "dark"', async () => {
    process.env[ENV_KEY] = '15;0'
    const fn = await freshResolveThemeSetting()
    expect(fn('auto')).toBe('dark')
  })

  test('auto + COLORFGBG bg=6 (cyan, bajo) → "dark" (≤6 = dark)', async () => {
    process.env[ENV_KEY] = '15;6'
    const fn = await freshResolveThemeSetting()
    expect(fn('auto')).toBe('dark')
  })

  test('auto + COLORFGBG bg=7 (gris claro) → "light" (>6 salvo 8)', async () => {
    process.env[ENV_KEY] = '0;7'
    const fn = await freshResolveThemeSetting()
    expect(fn('auto')).toBe('light')
  })

  test('auto + COLORFGBG bg=8 (gris oscuro) → "dark" (caso especial)', async () => {
    // Contrato crítico: 8 es "bright black" / "gris oscuro", que
    // visualmente ES un fondo oscuro. La regla es "≤6 O ==8 → dark".
    process.env[ENV_KEY] = '15;8'
    const fn = await freshResolveThemeSetting()
    expect(fn('auto')).toBe('dark')
  })

  test('auto + COLORFGBG bg=15 (blanco) → "light"', async () => {
    process.env[ENV_KEY] = '0;15'
    const fn = await freshResolveThemeSetting()
    expect(fn('auto')).toBe('light')
  })

  test('auto + COLORFGBG bg=9 (rojo brillante) → "light" (9-14 son fg brillantes)', async () => {
    process.env[ENV_KEY] = '0;9'
    const fn = await freshResolveThemeSetting()
    expect(fn('auto')).toBe('light')
  })

  test('auto + COLORFGBG con 3 partes usa la ÚLTIMA como bg', async () => {
    // Algunas terminales emiten "fg;mid;bg". La función usa
    // parts[parts.length - 1], que maneja esto correctamente.
    process.env[ENV_KEY] = '15;default;0'
    const fn = await freshResolveThemeSetting()
    expect(fn('auto')).toBe('dark')
  })

  test('auto + COLORFGBG cadena vacía → default "dark"', async () => {
    process.env[ENV_KEY] = ''
    const fn = await freshResolveThemeSetting()
    expect(fn('auto')).toBe('dark')
  })

  test('auto + COLORFGBG bg=no-entero → default "dark"', async () => {
    process.env[ENV_KEY] = '15;default'
    const fn = await freshResolveThemeSetting()
    expect(fn('auto')).toBe('dark')
  })

  test('auto + COLORFGBG bg=-1 → default "dark" (fuera de rango)', async () => {
    process.env[ENV_KEY] = '15;-1'
    const fn = await freshResolveThemeSetting()
    expect(fn('auto')).toBe('dark')
  })

  test('auto + COLORFGBG bg=16 → default "dark" (fuera de rango)', async () => {
    process.env[ENV_KEY] = '0;16'
    const fn = await freshResolveThemeSetting()
    expect(fn('auto')).toBe('dark')
  })
})

describe('resolveThemeSetting — cache', () => {
  test('el resultado de detección se cachea dentro de una misma instancia de módulo', async () => {
    process.env[ENV_KEY] = '15;0'
    const fn = await freshResolveThemeSetting()
    expect(fn('auto')).toBe('dark')
    // Aunque el env cambie después de la primera llamada, el valor
    // cacheado persiste.
    process.env[ENV_KEY] = '0;15'
    expect(fn('auto')).toBe('dark') // sigue cacheado como dark
  })
})
