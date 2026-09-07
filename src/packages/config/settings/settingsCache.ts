/**
 * Puerto de `ccnmt: packages/config/settings/settingsCache.ts` (80 líneas
 * fuente). Reimplementación fiel VERBATIM en su lógica; DIVERGENCIA
 * estructural declarada abajo.
 *
 * DIVERGENCIA declarada: `settings.ts` (ya portado por un agente anterior)
 * documenta explícitamente que sustituyó esta caché por tres cachés de
 * módulo locales, ámbito-archivo, EN VEZ de importar `settingsCache.ts`
 * (que entonces no existía) — ver su docstring: *"Caché: ./settingsCache.ts
 * no existe en @thyrox/config. Se sustituye por tres cachés de módulo
 * equivalentes […], ámbito local a este archivo"*. Este archivo, ahora
 * portado, es una caché INDEPENDIENTE con el mismo contrato — no está
 * conectada a la de `settings.ts`. Sirve a los consumidores NUEVOS de este
 * mismo pase (`remote/syncCacheState.ts`, `changeDetector.ts` cuando se
 * porte) que citan `resetSettingsCache` por este nombre. Reconectar
 * `settings.ts` para que use esta caché en vez de la suya propia es
 * trabajo de un pase posterior — declarado, no fabricado en silencio (ver
 * el informe de esta tarea).
 */
import type { SettingSource } from './constants.ts'
import type { SettingsJson } from './types.ts'
import type { SettingsError, SettingsWithErrors } from './validation.ts'

// La fuente tipa esto como `ValidationError`; nuestro `validation.ts` (ya
// portado, con un esquema más reducido) declara el mismo campo bajo
// `SettingsError` — mismo shape (`file`, `path`, `message`). Ver la misma
// nota en `mdm/settings.ts`.
type ValidationError = SettingsError

let sessionSettingsCache: SettingsWithErrors | null = null

export function getSessionSettingsCache(): SettingsWithErrors | null {
  return sessionSettingsCache
}

export function setSessionSettingsCache(value: SettingsWithErrors): void {
  sessionSettingsCache = value
}

/**
 * Caché por-fuente para `getSettingsForSource`. Se invalida junto con el
 * `sessionSettingsCache` fusionado — los mismos disparadores de
 * `resetSettingsCache()` (escritura de settings, --add-dir, init de
 * plugin, refresh de hooks).
 */
const perSourceCache = new Map<SettingSource, SettingsJson | null>()

export function getCachedSettingsForSource(
  source: SettingSource,
): SettingsJson | null | undefined {
  // undefined = cache miss; null = "sin settings para esta fuente" cacheado.
  return perSourceCache.has(source) ? perSourceCache.get(source) : undefined
}

export function setCachedSettingsForSource(
  source: SettingSource,
  value: SettingsJson | null,
): void {
  perSourceCache.set(source, value)
}

/**
 * Caché indexada por ruta para `parseSettingsFile`. Tanto
 * `getSettingsForSource` como `loadSettingsFromDisk` llaman a
 * `parseSettingsFile` sobre las mismas rutas durante el arranque — esto
 * deduplica la lectura de disco + el parseo zod.
 */
type ParsedSettings = {
  settings: SettingsJson | null
  errors: ValidationError[]
}
const parseFileCache = new Map<string, ParsedSettings>()

export function getCachedParsedFile(path: string): ParsedSettings | undefined {
  return parseFileCache.get(path)
}

export function setCachedParsedFile(path: string, value: ParsedSettings): void {
  parseFileCache.set(path, value)
}

export function resetSettingsCache(): void {
  sessionSettingsCache = null
  perSourceCache.clear()
  parseFileCache.clear()
}

/**
 * Capa base de settings de plugin para la cascada de settings.
 * `pluginLoader` escribe aquí tras cargar plugins; `loadSettingsFromDisk`
 * lo lee como la base de menor prioridad.
 */
let pluginSettingsBase: Record<string, unknown> | undefined

export function getPluginSettingsBase(): Record<string, unknown> | undefined {
  return pluginSettingsBase
}

export function setPluginSettingsBase(
  settings: Record<string, unknown> | undefined,
): void {
  pluginSettingsBase = settings
}

export function clearPluginSettingsBase(): void {
  pluginSettingsBase = undefined
}
