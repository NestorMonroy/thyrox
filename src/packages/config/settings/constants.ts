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
export type EditableSettingSource = (typeof EDITABLE_SOURCES)[number]
export const SOURCES = EDITABLE_SOURCES
export const CLAUDE_CODE_SETTINGS_SCHEMA_URL = 'https://json.schemastore.org/claude-code-settings.json'

let enabledSettingSources: readonly SettingSource[] = SETTING_SOURCES

export function getEnabledSettingSources(): readonly SettingSource[] {
  return enabledSettingSources
}

export function setEnabledSettingSources(sources: readonly SettingSource[]): void {
  enabledSettingSources = [...sources]
}

export function isSettingSourceEnabled(source: string): boolean {
  return enabledSettingSources.includes(source as SettingSource)
}

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

const SOURCE_NAMES: Record<SettingSource, string> = {
  userSettings: 'user',
  projectSettings: 'project',
  localSettings: 'project, gitignored',
  flagSettings: 'cli flag',
  policySettings: 'managed',
}

export function getSettingSourceName(source: SettingSource): string {
  return SOURCE_NAMES[source]
}

const DISPLAY_NAMES: Record<string, string> = {
  userSettings: 'User',
  projectSettings: 'Project',
  localSettings: 'Local',
  flagSettings: 'CLI flag',
  policySettings: 'Managed',
  plugin: 'Plugin',
  'built-in': 'Built-in',
}

export function getSourceDisplayName(source: string): string {
  return DISPLAY_NAMES[source] ?? source
}

const LOWERCASE_DESCRIPTIONS: Record<string, string> = {
  policySettings: 'enterprise managed settings',
  cliArg: 'CLI argument',
  session: 'current session',
}

const CAPITALIZED_DESCRIPTIONS: Record<string, string> = {
  userSettings: 'User settings',
  command: 'Command configuration',
}

export function getSettingSourceDisplayNameLowercase(source: string): string {
  return LOWERCASE_DESCRIPTIONS[source] ?? getSourceDisplayName(source)
}

export function getSettingSourceDisplayNameCapitalized(source: string): string {
  return CAPITALIZED_DESCRIPTIONS[source] ?? getSourceDisplayName(source)
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
