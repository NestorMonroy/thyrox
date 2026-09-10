/**
 * Porte PARCIAL DECLARADO de `ccnmt: packages/permission/src/PermissionUpdate.ts`
 * (330 líneas, 8 exports, licencia UNLICENSED — reimplementación, no
 * copia). Es la función que **decide el nuevo estado** tras una
 * actualización de permiso — el corazón mutador de este paquete.
 *
 * PORTE CERRADO — los 8 de 8. El tramo anterior traía 6 y declaraba
 * `persistPermissionUpdate` / `persistPermissionUpdates` omitidas con este
 * bloqueo: *«llaman `getSettingsForSource`/`updateSettingsForSource` de
 * `@claude-code-how-works/config` … sin `@thyrox/config` linkeado en
 * `node_modules` de este paquete (cross-package sin symlink — exige
 * `bun install`, fuera de alcance)»*. Medido hoy:
 * `permission/node_modules/@thyrox/config` existe y las dos funciones están en
 * `config/settings/settings.ts`. El aviso SE RETIRA en vez de dejarlo
 * pudrirse — un bloqueo caducado que nadie borra se lee como vigente.
 *
 * Su razonamiento SÍ se conserva, porque sigue siendo correcto: portar sólo
 * `addRules` habría dado una función que compila, se llama igual para las seis
 * variantes y no-opea en silencio en cuatro. Por eso se portan las seis ramas
 * enteras o ninguna, y se portan enteras.
 *
 * DIVERGENCIA RETIRADA. El primer tramo resolvió `addRules` por el host
 * binding opcional `addPermissionRulesToSettings` —lanzando si no estaba
 * instalado, para no no-opear en silencio— porque el símbolo real no existía
 * en el árbol. Ya existe: `./permissionsLoader.ts` lo porta. Se importa
 * DIRECTO, como hace la fuente, y con eso la rama deja de depender de que un
 * anfitrión instale nada. El binding sigue declarado en `contracts.ts` para
 * quien quiera sustituir la implementación; este módulo ya no lo consulta.
 *
 * Divergencia medida (heredada de la propia fuente, no introducida aquí):
 * el comentario "V7 §11.4 — inline types + host binding wrappers" en
 * `PermissionUpdate.ts:18-21` ya declara `ToolPermissionContext` como tipo
 * inline laxo y envuelve `logForDebugging` sobre
 * `getPermissionHostBindings().logDebug?.()` — este puerto reproduce
 * exactamente esa forma, sin ampliarla.
 */
import { posix } from 'path'
import type {
  AdditionalWorkingDirectory,
  PermissionRuleValue,
  PermissionUpdate,
  PermissionUpdateDestination,
  WorkingDirectorySource,
} from './permissionTypes.js'
import { getPermissionHostBindings } from './host.js'
import { toPosixPath } from './filesystem.js'
import {
  permissionRuleValueFromString,
  permissionRuleValueToString,
} from './permissionRuleParser.js'
import {
  getSettingsForSource,
  updateSettingsForSource,
} from '@thyrox/config/settings'
import { addPermissionRulesToSettings } from './permissionsLoader.js'

export type { AdditionalWorkingDirectory, WorkingDirectorySource }

// V7 §11.4 — tipos inline + envoltorios de host binding (ver la propia
// fuente, PermissionUpdate.ts:18-21).
type ToolPermissionContext = { permissionRules: unknown; [key: string]: unknown }
function logForDebugging(msg: string, meta?: unknown): void {
  getPermissionHostBindings().logDebug?.(msg, meta)
}

export function extractRules(
  updates: PermissionUpdate[] | undefined,
): PermissionRuleValue[] {
  if (!updates) return []

  return updates.flatMap(update => {
    switch (update.type) {
      case 'addRules':
        return update.rules
      default:
        return []
    }
  })
}

export function hasRules(updates: PermissionUpdate[] | undefined): boolean {
  return extractRules(updates).length > 0
}

export function applyPermissionUpdate(
  context: ToolPermissionContext,
  update: PermissionUpdate,
): ToolPermissionContext {
  switch (update.type) {
    case 'setMode':
      logForDebugging(
        `Applying permission update: Setting mode to '${update.mode}'`,
      )
      return {
        ...context,
        mode: update.mode,
      }

    case 'addRules': {
      const ruleStrings = update.rules.map(rule =>
        permissionRuleValueToString(rule),
      )
      logForDebugging(
        `Applying permission update: Adding ${update.rules.length} ${update.behavior} rule(s) to destination '${update.destination}': ${JSON.stringify(ruleStrings)}`,
      )

      const ruleKind =
        update.behavior === 'allow'
          ? 'alwaysAllowRules'
          : update.behavior === 'deny'
            ? 'alwaysDenyRules'
            : 'alwaysAskRules'

      return {
        ...context,
        [ruleKind]: {
          ...(context[ruleKind] as Record<string, string[]> | undefined),
          [update.destination]: [
            ...(((context[ruleKind] as Record<string, string[]> | undefined)?.[
              update.destination
            ]) || []),
            ...ruleStrings,
          ],
        },
      }
    }

    case 'replaceRules': {
      const ruleStrings = update.rules.map(rule =>
        permissionRuleValueToString(rule),
      )
      logForDebugging(
        `Replacing all ${update.behavior} rules for destination '${update.destination}' with ${update.rules.length} rule(s): ${JSON.stringify(ruleStrings)}`,
      )

      const ruleKind =
        update.behavior === 'allow'
          ? 'alwaysAllowRules'
          : update.behavior === 'deny'
            ? 'alwaysDenyRules'
            : 'alwaysAskRules'

      return {
        ...context,
        [ruleKind]: {
          ...(context[ruleKind] as Record<string, string[]> | undefined),
          [update.destination]: ruleStrings,
        },
      }
    }

    case 'addDirectories': {
      logForDebugging(
        `Applying permission update: Adding ${update.directories.length} director${update.directories.length === 1 ? 'y' : 'ies'} with destination '${update.destination}': ${JSON.stringify(update.directories)}`,
      )
      const newAdditionalDirs = new Map(
        context.additionalWorkingDirectories as
          | Map<string, AdditionalWorkingDirectory>
          | undefined,
      )
      for (const directory of update.directories) {
        newAdditionalDirs.set(directory, {
          path: directory,
          source: update.destination,
        })
      }
      return {
        ...context,
        additionalWorkingDirectories: newAdditionalDirs,
      }
    }

    case 'removeRules': {
      const ruleStrings = update.rules.map(rule =>
        permissionRuleValueToString(rule),
      )
      logForDebugging(
        `Applying permission update: Removing ${update.rules.length} ${update.behavior} rule(s) from source '${update.destination}': ${JSON.stringify(ruleStrings)}`,
      )

      const ruleKind =
        update.behavior === 'allow'
          ? 'alwaysAllowRules'
          : update.behavior === 'deny'
            ? 'alwaysDenyRules'
            : 'alwaysAskRules'

      const existingRules =
        ((context[ruleKind] as Record<string, string[]> | undefined)?.[
          update.destination
        ]) || []
      const rulesToRemove = new Set(ruleStrings)
      const filteredRules = existingRules.filter(
        rule => !rulesToRemove.has(rule),
      )

      return {
        ...context,
        [ruleKind]: {
          ...(context[ruleKind] as Record<string, string[]> | undefined),
          [update.destination]: filteredRules,
        },
      }
    }

    case 'removeDirectories': {
      logForDebugging(
        `Applying permission update: Removing ${update.directories.length} director${update.directories.length === 1 ? 'y' : 'ies'}: ${JSON.stringify(update.directories)}`,
      )
      const newAdditionalDirs = new Map(
        context.additionalWorkingDirectories as
          | Map<string, AdditionalWorkingDirectory>
          | undefined,
      )
      for (const directory of update.directories) {
        newAdditionalDirs.delete(directory)
      }
      return {
        ...context,
        additionalWorkingDirectories: newAdditionalDirs,
      }
    }

    default:
      return context
  }
}

export function applyPermissionUpdates(
  context: ToolPermissionContext,
  updates: PermissionUpdate[],
): ToolPermissionContext {
  let updatedContext = context
  for (const update of updates) {
    updatedContext = applyPermissionUpdate(updatedContext, update)
  }
  return updatedContext
}

/**
 * Los tres destinos con soporte de persistencia — subconjunto de
 * `PermissionUpdateDestination` que SÍ tiene un archivo de settings
 * editable detrás. Divergencia: la fuente tipa el retorno como
 * `destination is EditableSettingSource` (de `@claude-code-how-works/config`,
 * no linkeado); aquí el predicado angosta directamente sobre
 * `PermissionUpdateDestination`, con los mismos tres literales.
 */
export function supportsPersistence(
  destination: PermissionUpdateDestination,
): destination is 'localSettings' | 'userSettings' | 'projectSettings' {
  return (
    destination === 'localSettings' ||
    destination === 'userSettings' ||
    destination === 'projectSettings'
  )
}

export function createReadRuleSuggestion(
  dirPath: string,
  destination: PermissionUpdateDestination = 'session',
): PermissionUpdate | undefined {
  const pathForPattern = toPosixPath(dirPath)
  if (pathForPattern === '/') {
    return undefined
  }

  const ruleContent = posix.isAbsolute(pathForPattern)
    ? `/${pathForPattern}/**`
    : `${pathForPattern}/**`

  return {
    type: 'addRules',
    rules: [
      {
        toolName: 'Read',
        ruleContent,
      },
    ],
    behavior: 'allow',
    destination,
  }
}

/**
 * Escribe una actualización al archivo de settings de su destino.
 *
 * Es no-op para los destinos que no tienen archivo detrás (`session`,
 * `cliArg`): viven mientras dure el proceso, y escribirlos los volvería
 * permanentes sin que nadie lo pidiera.
 */
export function persistPermissionUpdate(update: PermissionUpdate): void {
  if (!supportsPersistence(update.destination)) return

  logForDebugging(
    `Persisting permission update: ${update.type} to source '${update.destination}'`,
  )

  switch (update.type) {
    case 'addRules': {
      addPermissionRulesToSettings(
        { ruleValues: update.rules, ruleBehavior: update.behavior },
        update.destination,
      )
      break
    }

    case 'addDirectories': {
      const existingSettings = getSettingsForSource(update.destination)
      const existingDirs =
        existingSettings?.permissions?.additionalDirectories || []
      const dirsToAdd = update.directories.filter(
        dir => !existingDirs.includes(dir),
      )
      // Sin nada que añadir NO se escribe: una escritura que no cambia nada
      // igual invalida cachés río abajo y toca el disco por gusto.
      if (dirsToAdd.length > 0) {
        updateSettingsForSource(update.destination, {
          permissions: {
            additionalDirectories: [...existingDirs, ...dirsToAdd],
          },
        })
      }
      break
    }

    case 'removeRules': {
      const existingSettings = getSettingsForSource(update.destination)
      const existingPermissions = existingSettings?.permissions || {}
      const existingRules = existingPermissions[update.behavior] || []
      const rulesToRemove = new Set(
        update.rules.map(permissionRuleValueToString),
      )
      // La comparación va NORMALIZADA en los dos lados: la regla guardada y la
      // que se pide quitar pueden estar escritas distinto y significar lo
      // mismo. Comparar cadenas crudas dejaría la regla viva mientras el
      // usuario cree haberla quitado.
      const filteredRules = existingRules.filter(rule => {
        const normalized = permissionRuleValueToString(
          permissionRuleValueFromString(rule),
        )
        return !rulesToRemove.has(normalized)
      })

      updateSettingsForSource(update.destination, {
        permissions: { [update.behavior]: filteredRules },
      })
      break
    }

    case 'removeDirectories': {
      const existingSettings = getSettingsForSource(update.destination)
      const existingDirs =
        existingSettings?.permissions?.additionalDirectories || []
      const dirsToRemove = new Set(update.directories)
      const filteredDirs = existingDirs.filter(dir => !dirsToRemove.has(dir))

      updateSettingsForSource(update.destination, {
        permissions: { additionalDirectories: filteredDirs },
      })
      break
    }

    case 'setMode': {
      updateSettingsForSource(update.destination, {
        permissions: { defaultMode: update.mode },
      })
      break
    }

    case 'replaceRules': {
      // SUSTITUYE la lista entera de ese comportamiento, no la extiende: es la
      // diferencia con `addRules`, y es lo que la palabra promete.
      updateSettingsForSource(update.destination, {
        permissions: {
          [update.behavior]: update.rules.map(permissionRuleValueToString),
        },
      })
      break
    }
  }
}

export function persistPermissionUpdates(updates: PermissionUpdate[]): void {
  for (const update of updates) {
    persistPermissionUpdate(update)
  }
}
