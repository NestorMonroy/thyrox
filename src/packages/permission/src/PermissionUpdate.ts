/**
 * Porte PARCIAL DECLARADO de `ccnmt: packages/permission/src/PermissionUpdate.ts`
 * (330 líneas, 8 exports, licencia UNLICENSED — reimplementación, no
 * copia). Es la función que **decide el nuevo estado** tras una
 * actualización de permiso — el corazón mutador de este paquete.
 *
 * PORTADOS (6 de 8) — la mutación EN MEMORIA del contexto, que no toca
 * disco en ningún caso de su `switch` (los 6 tipos de `PermissionUpdate`
 * están completos, ninguno queda a medias):
 *
 *   `extractRules` · `hasRules` · `applyPermissionUpdate` ·
 *   `applyPermissionUpdates` · `supportsPersistence` ·
 *   `createReadRuleSuggestion`
 *
 * OMITIDOS (2 de 8), declarados por nombre, línea y bloqueo — los DOS
 * juntos, no uno a medias, para no dejar una función que persiste 1 de 5
 * destinos en silencio y parece completa:
 *
 *   - `persistPermissionUpdate` (`PermissionUpdate.ts:196-268`) — su caso
 *     `addRules` SÍ sería portable (usa `addPermissionRulesToSettings`, un
 *     host binding YA declarado en `./contracts.ts`), pero los otros
 *     cuatro casos (`addDirectories`, `removeRules`, `removeDirectories`,
 *     `setMode`, `replaceRules`) llaman `getSettingsForSource`/
 *     `updateSettingsForSource` de `@claude-code-how-works/config` — I/O
 *     de disco de settings, sin binding equivalente en
 *     `PermissionHostBindings` y sin `@thyrox/config` linkeado en
 *     `node_modules` de este paquete (cross-package sin symlink — exige
 *     `bun install`, fuera de alcance). Portar sólo `addRules` produciría
 *     una función que compila, se llama igual para las 6 variantes de
 *     `PermissionUpdate`, y no-opea en silencio en 4 de ellas — exactamente
 *     el porte parcial silencioso que la consigna de esta tarea prohíbe.
 *     Se declara NO PORTADA entera en vez de aproximarla.
 *   - `persistPermissionUpdates` (`:270-274`) — depende de la anterior.
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
  permissionRuleValueToString,
} from './permissionRuleParser.js'

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
