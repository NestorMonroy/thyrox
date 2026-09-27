/**
 * La raíz de configuración del usuario. El ejecutable 2.1.283 la resuelve
 * como `CLAUDE_CONFIG_DIR ?? ~/.claude`; thyrox la migra a nombres propios (thyrox-rename: keep — respaldo heredado)
 * (decisión del ejecutor 2026-09-27, «Migrar a .thyrox») y conserva los
 * heredados sólo como respaldo de lectura, para que un usuario que aún no
 * migró no pierda su configuración.
 *
 * Orden: `THYROX_CONFIG_DIR` → `CLAUDE_CONFIG_DIR` → `~/.thyrox` si existe → (thyrox-rename: keep — respaldo heredado)
 * `~/.claude` si existe → `~/.thyrox` (el destino de una instalación nueva).
 * Una variable vacía no cuenta como declarada: el ejecutable usa `??` y
 * resolvería a la cadena vacía, que ninguna ruta posterior puede usar.
 *
 * Sin dependencias de otros módulos del paquete: las copias locales que
 * varios paquetes mantenían para romper ciclos de importación se reemplazan
 * por esta única definición.
 */
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export const CONFIG_DIR_ENV = 'THYROX_CONFIG_DIR'
export const LEGACY_CONFIG_DIR_ENV = 'CLAUDE_CONFIG_DIR' // thyrox-rename: keep — respaldo heredado de configHome
export const CONFIG_DIR_NAME = '.thyrox'
export const LEGACY_CONFIG_DIR_NAME = '.claude'
/** Los dos nombres que el cliente lee como raíz de configuración, el propio
 * primero. Quien protege o reconoce configuración compara contra los dos. */
export const CONFIG_DIR_NAMES = [CONFIG_DIR_NAME, LEGACY_CONFIG_DIR_NAME] as const

export type ConfigHomeInputs = {
  env: Record<string, string | undefined>
  home: string
  exists: (path: string) => boolean
}

export function resolveConfigHomeDir({ env, home, exists }: ConfigHomeInputs): string {
  const declared = env[CONFIG_DIR_ENV] || env[LEGACY_CONFIG_DIR_ENV]
  if (declared) return declared.normalize('NFC')
  const own = join(home, CONFIG_DIR_NAME)
  const legacy = join(home, LEGACY_CONFIG_DIR_NAME)
  const chosen = !exists(own) && exists(legacy) ? legacy : own
  return chosen.normalize('NFC')
}

let cache: { key: string; value: string } | undefined

/**
 * La raíz para este proceso. Se memoiza por el valor de las dos variables y
 * por el directorio del usuario: cambiar cualquiera recalcula. La existencia de los directorios se lee una
 * vez por clave — una sesión que crea `~/.thyrox` a mitad de camino sigue en
 * `~/.claude` hasta la siguiente, que es lo que evita partir su estado en dos.
 */
export function getConfigHomeDir(): string {
  const home = homedir()
  const key = `${process.env[CONFIG_DIR_ENV] ?? ''}\u0000${process.env[LEGACY_CONFIG_DIR_ENV] ?? ''}\u0000${home}`
  if (cache?.key === key) return cache.value
  const value = resolveConfigHomeDir({ env: process.env, home, exists: existsSync })
  cache = { key, value }
  return value
}
