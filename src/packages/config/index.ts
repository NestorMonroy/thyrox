// El puente al anfitrion, que la fuente pone al FRENTE del barril
// (`ccnmt: packages/config/index.ts:1-2`) y este puerto omitia. `host.ts` ya
// declaraba los tres simbolos; lo que faltaba era dejarlos entrar al paquete.
//
// Medido: cuatro consumidores lo importaban del barril —dos suites, el
// `packageHostSetup` de app-host, y el docstring de `cli/src/entry/main.ts`—
// y los cuatro morian con `Export named 'installConfigHostBindings' not
// found`. Es una ausencia de EXPORT, no de puerto.
//
// `tryGetConfigHostBindings` SI es de la fuente —lo declara su `host.ts` y lo
// consume su `global/config.ts:15`—; lo que diverge es que su barril no lo
// re-exporta y el nuestro si. Es divergencia de SUPERFICIE, no de porte, y
// entra porque `global/config.ts` lo consume igual que a sus dos hermanos.
//
// La primera version de este comentario afirmaba que el simbolo era NUESTRO y
// que «la fuente no lo declara». Era falso, y se midio despues de escribirlo:
// `grep tryGetConfigHostBindings` sobre `ccnmt: packages/` da tres hits. La
// forma del error es la de `metrica-decide-la-conclusion.md` —se comprobo que
// el BARRIL de la fuente no lo lleva y se concluyo sobre el PAQUETE—.
export type { ConfigHostBindings } from './contracts.ts'
export { installConfigHostBindings, getConfigHostBindings, tryGetConfigHostBindings } from './host.ts'
export { SETTING_SOURCES, EDITABLE_SOURCES, precedence, sourceDisplayName, parseSettingSourcesFlag, type SettingSource } from './settings/constants.ts'
export { SettingsSchema, PermissionsSchema, EnvironmentVariablesSchema, HooksSchema, HookMatcherSchema, HookCommandSchema, HOOK_EVENTS, type Settings, type Permissions, type HookEvent } from './settings/types.ts'
export { formatZodError, validateSettingsFileContent, filterInvalidPermissionRules, type SettingsError, type ValidationResult } from './settings/validation.ts'
export { CLIENT_SETTING_KEYS, KEY_STATUS, keysByStatus, deferredReason, deferredCondition, deferredKeysPresent, type ClientSettingKey, type KeyStatus } from './settings/inventory.ts'
export { loadSettings, mergeSettings, type LoadResult, type LoadSpec, type MergeResult, type SourcedSettings } from './settings/load.ts'
export { getCurrentProjectConfig, saveCurrentProjectConfig, getProjectPathForConfig,
  getGlobalConfig, saveGlobalConfig, getOrCreateUserID, isGlobalConfigKey, isProjectConfigKey, getGlobalConfigWriteCount, enableConfigs, checkHasTrustDialogAccepted, isPathTrusted, createDefaultGlobalConfig, _setGlobalConfigCacheForTesting, DEFAULT_GLOBAL_CONFIG, GLOBAL_CONFIG_KEYS, PROJECT_CONFIG_KEYS, CONFIG_WRITE_DISPLAY_THRESHOLD, NOTIFICATION_CHANNELS, type GlobalConfig, type ProjectConfig, type ConnectionRecord, type ConnectionModelRecord, type ConnectionModelEffort, type AuthProtocol, type AccountInfo, type NotificationChannel, type EditorMode, type DiffTool, type OutputStyle, type InstallMethod, type HistoryEntry, type PastedContent, type ReleaseChannel } from './global/config.ts'
export { getAutoUpdaterDisabledReason, formatAutoUpdaterDisabledReason, isAutoUpdaterDisabled, shouldSkipPluginAutoupdate, type AutoUpdaterDisabledReason } from './global/autoUpdater.ts'
// `global/constants.ts` no estaba en la superficie del paquete, y tres
// consumidores ya importaban `getInvokedBinaryName` desde `@thyrox/config`
// (repl x2, agent x1): el simbolo existe en `:59` y el barril no lo pasaba.
// `NOTIFICATION_CHANNELS` se OMITE a proposito — esta declarado por separado
// en `global/config.ts:208` y el barril ya lo re-exporta desde alli;
// re-exportarlo tambien aqui seria una colision. Que existan dos
// declaraciones del mismo nombre en el paquete es otro defecto, declarado y
// no corregido en este pase: TASK-THYROX-0210.
export { getInvokedBinaryName, EDITOR_MODES, TEAMMATE_MODES } from './global/constants.ts'
