/**
 * Fuentes de settings y su precedencia.
 *
 * El orden es el del cliente (`ccb: settings/constants.ts`) y no es
 * alfabético: es **de menor a mayor precedencia**. Una fuente posterior gana
 * clave a clave sobre las anteriores, y `policySettings` gana sobre todo
 * porque es la de la organización, no la del usuario.
 */
export const SETTING_SOURCES = [
  'userSettings',
  'projectSettings',
  'localSettings',
  'flagSettings',
  'policySettings',
] as const

export type SettingSource = (typeof SETTING_SOURCES)[number]

/** Las que nosotros escribimos. `flagSettings` es efímera y `policySettings` es ajena. */
export const EDITABLE_SOURCES = ['localSettings', 'projectSettings', 'userSettings'] as const

const NOMBRES: Record<SettingSource, string> = {
  userSettings: 'usuario',
  projectSettings: 'proyecto',
  localSettings: 'proyecto, fuera de git',
  flagSettings: 'bandera de la línea de comandos',
  policySettings: 'política de la organización',
}

export function sourceDisplayName(source: SettingSource): string {
  return NOMBRES[source]
}

/** La precedencia como número: mayor gana. Es lo que consume `mergeSettings`. */
export function precedence(source: SettingSource): number {
  return SETTING_SOURCES.indexOf(source)
}

const ALIAS: Record<string, SettingSource> = {
  user: 'userSettings',
  project: 'projectSettings',
  local: 'localSettings',
  flag: 'flagSettings',
  policy: 'policySettings',
}

/** `--settings-sources user,project` → las fuentes, en el orden pedido. */
export function parseSettingSourcesFlag(flag: string): SettingSource[] {
  if (!flag.trim()) return []
  return flag.split(',').map((parte) => {
    const nombre = parte.trim()
    const fuente = ALIAS[nombre] ?? (SETTING_SOURCES as readonly string[]).includes(nombre) ? (ALIAS[nombre] ?? (nombre as SettingSource)) : undefined
    if (!fuente || !(SETTING_SOURCES as readonly string[]).includes(fuente)) {
      throw new Error(`fuente de settings desconocida: '${nombre}' (válidas: ${Object.keys(ALIAS).join(', ')})`)
    }
    return fuente
  })
}
