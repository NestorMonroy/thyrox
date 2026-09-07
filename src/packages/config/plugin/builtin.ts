/**
 * Puerto de `ccnmt: packages/config/plugin/builtin.ts` (159 líneas fuente).
 * Registro de plugins integrados (built-in): plugins que vienen con el CLI
 * y que el usuario puede habilitar/deshabilitar vía la UI `/plugin`.
 * Reimplementación fiel — mismo algoritmo de resolución de estado
 * habilitado (preferencia de usuario > default del plugin > `true`), mismo
 * ID `{name}@builtin`.
 *
 * Los plugins built-in difieren de los skills empaquetados
 * (`src/skills/bundled/`) en que: aparecen en la UI `/plugin` bajo una
 * sección "Built-in"; el usuario puede habilitarlos/deshabilitarlos
 * (persistido a settings de usuario); pueden proveer múltiples componentes
 * (skills, hooks, servidores MCP).
 *
 * `Command`, `BundledSkillDefinition` — de `./_deps.js`, portado en este
 * mismo pase.
 *
 * `BuiltinPluginDefinition`, `LoadedPlugin` — de `./types.ts` (367 líneas),
 * que NO es uno de los 15 módulos del alcance. Se declaran localmente los
 * subconjuntos de campos que este archivo usa (mismo criterio que
 * `dxt/helpers.ts` con `McpbManifestAny`): la fuente completa importa
 * además `PluginManifest`/`CommandMetadata` (de `./schemas.js`, tampoco
 * portado).
 *
 * `HooksSettings` — CORREGIDO: esta línea decía "de `../settings/types.ts`,
 * SÍ existe ya en este árbol" y era falso — medido con `tsc --noEmit`
 * (`TS2305: Module has no exported member 'HooksSettings'`). En `ccnmt` el
 * tipo no lo declara `settings/types.ts` — lo RE-EXPORTA desde
 * `./schemas/hooks.js` ("Re-export hook schemas … for backward compat").
 * El `settings/types.ts` YA EXISTENTE en este árbol (portado por un pase
 * distinto, fuera de mi alcance de edición) es una reimplementación más
 * simple que no incluye ese re-export. Este archivo no inspecciona el
 * contenido de `hooks`/`hooksConfig` — sólo lo transporta — así que el
 * subconjunto local opaco es fiel sin necesitar la forma completa.
 *
 * `getSettings` — repuntado vía `require()` diferido de
 * `../settings/settings.js`, el mismo bloqueo que `managedEnv.ts` y
 * `outputStyles.ts` (ver sus docstrings: es el caso `@thyrox/config/settings`
 * del brief).
 */

import type { BundledSkillDefinition, Command } from './_deps.js'

/** Subconjunto local opaco de `settings/schemas/hooks.ts::HooksSettings` — ver docstring del módulo. */
type HooksSettings = Record<string, unknown>

/** `./settings/settings.ts` — ver docstring del módulo. */
function requireSettingsSettings(): {
  getSettings: () => {
    enabledPlugins?: Record<string, boolean>
  } | null
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../settings/settings.js')
}

/**
 * Subconjunto local de `PluginManifest` (de `./schemas.ts`, no portado) —
 * sólo los tres campos que `getBuiltinPlugins` necesita para construir el
 * `LoadedPlugin`.
 */
type LocalPluginManifest = {
  name: string
  description?: string
  version?: string
}

/** Subconjunto local de `plugin/types.ts::BuiltinPluginDefinition`. */
export type BuiltinPluginDefinition = {
  name: string
  description: string
  version?: string
  skills?: BundledSkillDefinition[]
  hooks?: HooksSettings
  mcpServers?: Record<string, unknown>
  isAvailable?: () => boolean
  defaultEnabled?: boolean
}

/** Subconjunto local de `plugin/types.ts::LoadedPlugin`. */
export type LoadedPlugin = {
  name: string
  manifest: LocalPluginManifest
  path: string
  source: string
  repository: string
  enabled?: boolean
  isBuiltin?: boolean
  hooksConfig?: HooksSettings
  mcpServers?: Record<string, unknown>
}

const BUILTIN_PLUGINS: Map<string, BuiltinPluginDefinition> = new Map()

export const BUILTIN_MARKETPLACE_NAME = 'builtin'

/**
 * Registra un plugin built-in. Se llama desde `initBuiltinPlugins()` al
 * arrancar.
 */
export function registerBuiltinPlugin(
  definition: BuiltinPluginDefinition,
): void {
  BUILTIN_PLUGINS.set(definition.name, definition)
}

/** Comprueba si un plugin ID representa un plugin built-in (termina en `@builtin`). */
export function isBuiltinPluginId(pluginId: string): boolean {
  return pluginId.endsWith(`@${BUILTIN_MARKETPLACE_NAME}`)
}

/**
 * Obtiene la definición de un plugin built-in específico por nombre. Útil
 * para que la UI `/plugin` muestre la lista de skills/hooks/MCP sin
 * consultar el marketplace.
 */
export function getBuiltinPluginDefinition(
  name: string,
): BuiltinPluginDefinition | undefined {
  return BUILTIN_PLUGINS.get(name)
}

/**
 * Obtiene todos los plugins built-in registrados como objetos
 * `LoadedPlugin`, repartidos en habilitados/deshabilitados según settings
 * de usuario (con `defaultEnabled` como fallback). Los plugins cuyo
 * `isAvailable()` devuelve `false` se omiten enteramente.
 */
export function getBuiltinPlugins(): {
  enabled: LoadedPlugin[]
  disabled: LoadedPlugin[]
} {
  const settings = requireSettingsSettings().getSettings()
  const enabled: LoadedPlugin[] = []
  const disabled: LoadedPlugin[] = []

  for (const [name, definition] of BUILTIN_PLUGINS) {
    if (definition.isAvailable && !definition.isAvailable()) {
      continue
    }

    const pluginId = `${name}@${BUILTIN_MARKETPLACE_NAME}`
    const userSetting = settings?.enabledPlugins?.[pluginId]
    // Estado habilitado: preferencia de usuario > default del plugin > true.
    const isEnabled =
      userSetting !== undefined
        ? userSetting === true
        : (definition.defaultEnabled ?? true)

    const plugin: LoadedPlugin = {
      name,
      manifest: {
        name,
        description: definition.description,
        version: definition.version,
      },
      path: BUILTIN_MARKETPLACE_NAME, // centinela — sin ruta de filesystem
      source: pluginId,
      repository: pluginId,
      enabled: isEnabled,
      isBuiltin: true,
      hooksConfig: definition.hooks,
      mcpServers: definition.mcpServers,
    }

    if (isEnabled) {
      enabled.push(plugin)
    } else {
      disabled.push(plugin)
    }
  }

  return { enabled, disabled }
}

/**
 * Obtiene skills de los plugins built-in habilitados como objetos
 * `Command`. Los skills de plugins deshabilitados no se devuelven.
 */
export function getBuiltinPluginSkillCommands(): Command[] {
  const { enabled } = getBuiltinPlugins()
  const commands: Command[] = []

  for (const plugin of enabled) {
    const definition = BUILTIN_PLUGINS.get(plugin.name)
    if (!definition?.skills) continue
    for (const skill of definition.skills) {
      commands.push(skillDefinitionToCommand(skill))
    }
  }

  return commands
}

/** Limpia el registro de plugins built-in (para tests). */
export function clearBuiltinPlugins(): void {
  BUILTIN_PLUGINS.clear()
}

// --

function skillDefinitionToCommand(definition: BundledSkillDefinition): Command {
  return {
    type: 'prompt',
    name: definition.name,
    description: definition.description,
    hasUserSpecifiedDescription: true,
    allowedTools: definition.allowedTools ?? [],
    argumentHint: definition.argumentHint,
    whenToUse: definition.whenToUse,
    model: definition.model,
    disableModelInvocation: definition.disableModelInvocation ?? false,
    userInvocable: definition.userInvocable ?? true,
    contentLength: 0,
    // 'bundled' y no 'builtin' — 'builtin' en Command.source significa
    // comandos slash hardcodeados (/help, /clear). Usar 'bundled' mantiene
    // estos skills en el listado del tool Skill, el logging de nombre de
    // analytics, y la exención de truncado de prompt. El aspecto
    // habilitable-por-usuario se rastrea en LoadedPlugin.isBuiltin.
    source: 'bundled',
    loadedFrom: 'bundled',
    hooks: definition.hooks,
    context: definition.context,
    agent: definition.agent,
    isEnabled: definition.isEnabled ?? (() => true),
    isHidden: !(definition.userInvocable ?? true),
    progressMessage: 'running',
    getPromptForCommand: definition.getPromptForCommand,
  }
}
