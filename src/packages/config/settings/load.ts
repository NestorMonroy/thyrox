/**
 * Carga y fusión de settings, con su origen.
 *
 * Dos reglas, y la segunda es la que un `Object.assign` se salta:
 *
 * 1. **La precedencia manda, no el orden de la lista.** Se ordena por
 *    `precedence()` antes de fundir, así que pasar las fuentes en cualquier
 *    orden da el mismo resultado.
 * 2. **Los hooks se acumulan; no se pisan.** Un hook de proyecto no debe
 *    borrar el del usuario: los dos tienen que correr. Es lo que hace el
 *    cliente, y lo que hace útil tener hooks en varias fuentes.
 *
 * Además se devuelve `origin`: de qué fuente vino cada clave. Sin eso, "por
 * qué el modelo es este" se responde adivinando.
 */
import { existsSync, readFileSync } from 'node:fs'
import { precedence, type SettingSource } from './constants.ts'
import type { Settings } from './types.ts'
import { deferredKeysPresent } from './inventory.ts'
import { filterInvalidPermissionRules, formatZodError, type SettingsError } from './validation.ts'
import { SettingsSchema } from './types.ts'

export type SourcedSettings = { source: SettingSource; settings: Settings }
export type MergeResult = { settings: Settings; origin: Record<string, SettingSource> }

export function mergeSettings(entradas: SourcedSettings[]): MergeResult {
  const ordenadas = [...entradas].sort((a, b) => precedence(a.source) - precedence(b.source))
  const settings: Settings = {}
  const origin: Record<string, SettingSource> = {}
  for (const { source, settings: s } of ordenadas) {
    for (const [clave, valor] of Object.entries(s)) {
      if (valor === undefined) continue
      if (clave === 'hooks') {
        const acumulado = (settings.hooks ?? {}) as Record<string, unknown[]>
        for (const [evento, grupos] of Object.entries(valor as Record<string, unknown[]>)) {
          acumulado[evento] = [...(acumulado[evento] ?? []), ...(grupos ?? [])]
        }
        settings.hooks = acumulado as Settings['hooks']
        origin[clave] = source
        continue
      }
      if (clave === 'env') {
        settings.env = { ...(settings.env ?? {}), ...(valor as Record<string, string>) }
        origin[clave] = source
        continue
      }
      ;(settings as Record<string, unknown>)[clave] = valor
      origin[clave] = source
    }
  }
  return { settings, origin }
}

export type LoadSpec = { source: SettingSource; path: string }
export type LoadResult = MergeResult & {
  loaded: { source: SettingSource; path: string }[]
  errors: SettingsError[]
}

export function loadSettings(specs: LoadSpec[]): LoadResult {
  const entradas: SourcedSettings[] = []
  const loaded: { source: SettingSource; path: string }[] = []
  const errors: SettingsError[] = []
  for (const { source, path } of specs) {
    if (!existsSync(path)) continue
    let data: unknown
    try {
      data = JSON.parse(readFileSync(path, 'utf8'))
    } catch (e) {
      errors.push({ file: source, path, message: `JSON inválido: ${(e as Error).message}` })
      continue
    }
    errors.push(...filterInvalidPermissionRules(data, path))
    // Una clave diferida no invalida el archivo: se avisa nombrando el
    // servicio ajeno y la condición que la traería, y la carga sigue.
    for (const { key, reason } of deferredKeysPresent(data)) {
      errors.push({ file: source, path: `${path} → ${key}`, message: reason })
    }
    const r = SettingsSchema.safeParse(data)
    if (!r.success) {
      errors.push(...formatZodError(r.error, path))
      continue
    }
    entradas.push({ source, settings: r.data })
    loaded.push({ source, path })
  }
  return { ...mergeSettings(entradas), loaded, errors }
}
