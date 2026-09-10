/**
 * La carga y la edición de reglas de permiso en los archivos de settings.
 *
 * Procedencia: `ccnmt: packages/permission/src/permissionsLoader.ts` (296
 * líneas, 7 exports). Ese árbol declara `"license": "UNLICENSED"`, así que los
 * cuerpos se **reimplementan** y no se copian.
 *
 * Es la contraparte de lectura de `./PermissionUpdate.ts`: aquél escribe lo que
 * una actualización decide, éste lee lo que quedó escrito y lo convierte en
 * reglas evaluables.
 *
 * DOS DIVERGENCIAS DECLARADAS, las dos por un símbolo que este árbol no tiene:
 *
 *  1. `getEnabledSettingSources` no está portada en `@thyrox/config`, así que
 *     `loadAllPermissionRulesFromDisk` recorre TODAS las fuentes declaradas en
 *     vez de las que una restricción `--setting-sources` deje pasar. Es
 *     exactamente lo que `config/settings/settings.ts` ya hace en su propio
 *     recorrido, y lo declara ahí: se mantiene la misma conducta en los dos
 *     sitios en lugar de que uno filtre y el otro no.
 *  2. `safeParseJSON` tampoco existe; el equivalente de este árbol es
 *     `safeParseJSONC`, que además tolera comentarios. Para un archivo de
 *     settings es un superconjunto seguro: todo JSON válido es JSONC válido.
 */
import { readFileSync } from '@thyrox/storage/fileRead.js'
import {
  getFsImplementation,
  safeResolvePath,
} from '@thyrox/storage/fsOperations.js'
import { safeParseJSONC } from '@thyrox/storage/json.js'
import { logError } from '@thyrox/local-observability/logging'
import { SETTING_SOURCES, type SettingSource } from '@thyrox/config/constants'
import {
  type EditableSettingSource,
  getSettingsFilePathForSource,
  getSettingsForSource,
  updateSettingsForSource,
} from '@thyrox/config/settings'
import type { SettingsJson } from '@thyrox/config/types'
import type {
  PermissionBehavior,
  PermissionRule,
  PermissionRuleSource,
  PermissionRuleValue,
} from './PermissionRule.js'
import {
  permissionRuleValueFromString,
  permissionRuleValueToString,
} from './permissionRuleParser.js'

/**
 * ¿La política administrada exige que SÓLO valgan sus reglas?
 *
 * La ausencia de la clave se lee como `false`: leerla al revés dejaría a
 * cualquier instalación sin poder guardar una regla, sin que nadie lo pidiera.
 */
export function shouldAllowManagedPermissionRulesOnly(): boolean {
  return (
    getSettingsForSource('policySettings')?.allowManagedPermissionRulesOnly ===
    true
  )
}

/** Si la política manda, las opciones de «permitir siempre» no se ofrecen. */
export function shouldShowAlwaysAllowOptions(): boolean {
  return !shouldAllowManagedPermissionRulesOnly()
}

const SUPPORTED_RULE_BEHAVIORS = [
  'allow',
  'deny',
  'ask',
] as const satisfies PermissionBehavior[]

/**
 * Lectura TOLERANTE, sólo para editar — nunca para ejecutar.
 *
 * Parsea el archivo sin validar contra el esquema. La razón es concreta: al
 * añadir una regla se reescribe el archivo entero, y si un campo ajeno
 * —digamos un hook mal escrito— hace fallar la validación, la lectura estricta
 * devolvería `null` y la reescritura BORRARÍA las reglas que ya había. Para
 * ejecutar sigue valiendo la lectura validada, que es la que decide permisos.
 */
function getSettingsForSourceLenient_FOR_EDITING_ONLY_NOT_FOR_READING(
  source: SettingSource,
): SettingsJson | null {
  const filePath = getSettingsFilePathForSource(source)
  if (!filePath) {
    return null
  }

  try {
    const { resolvedPath } = safeResolvePath(getFsImplementation(), filePath)
    const content = readFileSync(resolvedPath)
    if (content.trim() === '') {
      return {}
    }
    const data = safeParseJSONC(content)
    return data && typeof data === 'object' ? (data as SettingsJson) : null
  } catch {
    return null
  }
}

/** Convierte el bloque `permissions` de un archivo en reglas con su fuente. */
function settingsJsonToRules(
  data: SettingsJson | null,
  source: PermissionRuleSource,
): PermissionRule[] {
  if (!data || !data.permissions) {
    return []
  }

  const { permissions } = data
  const rules: PermissionRule[] = []
  for (const behavior of SUPPORTED_RULE_BEHAVIORS) {
    const behaviorArray = permissions[behavior]
    if (behaviorArray) {
      for (const ruleString of behaviorArray) {
        rules.push({
          source,
          ruleBehavior: behavior,
          ruleValue: permissionRuleValueFromString(ruleString),
        })
      }
    }
  }
  return rules
}

/**
 * Todas las reglas de todas las fuentes.
 *
 * Con la política administrada activa, SÓLO las suyas: es lo que significa el
 * candado, y aplicarlo aquí evita que una regla local se cuele por la puerta
 * de la carga.
 */
export function loadAllPermissionRulesFromDisk(): PermissionRule[] {
  if (shouldAllowManagedPermissionRulesOnly()) {
    return getPermissionRulesForSource('policySettings')
  }

  const rules: PermissionRule[] = []
  // Divergencia 1 (ver la cabecera): sin `getEnabledSettingSources` se
  // recorren todas las fuentes declaradas.
  for (const source of SETTING_SOURCES) {
    rules.push(...getPermissionRulesForSource(source))
  }
  return rules
}

export function getPermissionRulesForSource(
  source: SettingSource,
): PermissionRule[] {
  const settingsData = getSettingsForSource(source)
  return settingsJsonToRules(settingsData, source)
}

export type PermissionRuleFromEditableSettings = PermissionRule & {
  source: EditableSettingSource
}

/** Las tres que tienen archivo editable detrás — ni política ni banderas. */
const EDITABLE_SOURCES: EditableSettingSource[] = [
  'userSettings',
  'projectSettings',
  'localSettings',
]

/**
 * Normaliza una entrada cruda del archivo pasándola por parseo y serialización.
 *
 * Es lo que hace que un nombre heredado escrito hace meses siga casando con su
 * forma canónica de hoy. Comparar cadenas crudas dejaría la regla viva mientras
 * el usuario cree haberla borrado.
 */
function normalizeEntry(raw: string): string {
  return permissionRuleValueToString(permissionRuleValueFromString(raw))
}

export function deletePermissionRuleFromSettings(
  rule: PermissionRuleFromEditableSettings,
): boolean {
  // La comprobación es de tiempo de EJECUCIÓN aunque el tipo ya lo acote: el
  // tipo se borra al compilar, y esta regla puede llegar desde disco o desde
  // un anfitrión SDK, donde no hay tipos que valgan.
  if (!EDITABLE_SOURCES.includes(rule.source as EditableSettingSource)) {
    return false
  }

  const ruleString = permissionRuleValueToString(rule.ruleValue)
  const settingsData = getSettingsForSource(rule.source)

  if (!settingsData || !settingsData.permissions) {
    return false
  }

  const behaviorArray = settingsData.permissions[rule.ruleBehavior]
  if (!behaviorArray) {
    return false
  }

  if (!behaviorArray.some(raw => normalizeEntry(raw) === ruleString)) {
    return false
  }

  try {
    // Se parte del objeto ORIGINAL para conservar las claves que este árbol no
    // entiende: un archivo de settings lo escriben varias versiones y varias
    // herramientas, y reescribirlo a ciegas borraría configuración ajena.
    const updatedSettingsData = {
      ...settingsData,
      permissions: {
        ...settingsData.permissions,
        [rule.ruleBehavior]: behaviorArray.filter(
          raw => normalizeEntry(raw) !== ruleString,
        ),
      },
    }

    const { error } = updateSettingsForSource(rule.source, updatedSettingsData)
    if (error) {
      return false
    }
    return true
  } catch (error) {
    logError(error)
    return false
  }
}

function getEmptyPermissionSettingsJson(): SettingsJson {
  return { permissions: {} }
}

export function addPermissionRulesToSettings(
  {
    ruleValues,
    ruleBehavior,
  }: {
    ruleValues: PermissionRuleValue[]
    ruleBehavior: PermissionBehavior
  },
  source: EditableSettingSource,
): boolean {
  if (shouldAllowManagedPermissionRulesOnly()) {
    return false
  }

  // Nada que añadir NO es un fallo: el llamador pidió que el estado quede como
  // quiere, y ya lo está.
  if (ruleValues.length < 1) {
    return true
  }

  const ruleStrings = ruleValues.map(permissionRuleValueToString)
  // Primero la lectura validada; si falla, la tolerante. El orden importa: la
  // tolerante existe para no perder reglas cuando otro campo del archivo está
  // mal, no para sustituir la validación.
  const settingsData =
    getSettingsForSource(source) ||
    getSettingsForSourceLenient_FOR_EDITING_ONLY_NOT_FOR_READING(source) ||
    getEmptyPermissionSettingsJson()

  try {
    const existingPermissions = settingsData.permissions || {}
    const existingRules = existingPermissions[ruleBehavior] || []

    const existingRulesSet = new Set(existingRules.map(normalizeEntry))
    const newRules = ruleStrings.filter(rule => !existingRulesSet.has(rule))

    if (newRules.length === 0) {
      return true
    }

    const updatedSettingsData = {
      ...settingsData,
      permissions: {
        ...existingPermissions,
        [ruleBehavior]: [...existingRules, ...newRules],
      },
    }
    const result = updateSettingsForSource(source, updatedSettingsData)
    if (result.error) {
      throw result.error
    }
    return true
  } catch (error) {
    logError(error)
    return false
  }
}
