/**
 * La configuración de esta invocación, por `@thyrox/config` (T-044).
 *
 * No se parsea JSON a mano: la precedencia de las fuentes, la acumulación de
 * hooks y el origen por clave son del paquete, y duplicarlos aquí sería una
 * segunda implementación de las mismas reglas que nadie sincroniza.
 *
 * Extraído de `bin/harness.ts` en #205: lo consumen el modo bucle y el comando
 * `--config-origin`, así que vivía en el binario por accidente de historia, no
 * porque perteneciera al punto de entrada.
 */
import { join } from 'node:path'
import { loadSettings } from '@thyrox/config/load'
import type { HookConfig } from '@thyrox/agent/loop/hooks'
import type { PermissionPolicy } from '@thyrox/permission'
import { flag } from './flags.ts'

export type Settings = { hooks?: HookConfig; permissions?: PermissionPolicy }

/**
 * La configuración, por `@thyrox/config` (T-044).
 *
 * No se parsea JSON a mano: la precedencia de las fuentes, la acumulación de
 * hooks y el origen por clave son del paquete, y duplicarlos aquí sería una
 * segunda implementación de las mismas reglas que nadie sincroniza.
 *
 * `--settings` explícito gana sobre el árbol, porque es una orden de esta
 * invocación y no una preferencia del proyecto.
 */
export function loadFrom(argv: string[], cwd: string) {
  const explicito = flag(argv, 'settings')
  if (explicito) {
    return loadSettings([{ source: 'flagSettings', path: explicito }])
  }
  if (flag(argv, 'settings-source') !== 'project') {
    return { settings: {}, origin: {}, loaded: [], errors: [] }
  }
  return loadSettings([
    { source: 'projectSettings', path: join(cwd, '.claude', 'settings.json') },
    { source: 'localSettings', path: join(cwd, '.claude', 'settings.local.json') },
  ])
}

export function settingsFor(argv: string[], cwd: string): Settings {
  const r = loadFrom(argv, cwd)
  for (const e of r.errors) {
    // Un archivo ilegible avisa y NO tumba el arranque: quedarse sin sesión
    // por una coma de más en un settings es peor que correr sin ese archivo.
    process.stderr.write(`aviso: ${e.path} — ${e.message}; se ignora\n`)
  }
  return {
    hooks: r.settings.hooks as Settings['hooks'],
    permissions: r.settings.permissions as Settings['permissions'],
  }
}
