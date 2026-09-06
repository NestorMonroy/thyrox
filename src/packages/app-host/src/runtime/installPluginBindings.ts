/**
 * Adaptación de @claude-code-how-works/app-host: src/runtime/installPluginBindings.ts.
 * Capa 1 tramo B — porte FIEL de la lógica de wiring; importaciones
 * DECLARADAS COLGANTES, sin traducir y sin stub.
 *
 * La fuente conecta cada slot setter de
 * `@claude-code-how-works/config/plugin/_deps` (95 símbolos —
 * `set*Fn`) a su implementación real en el host: 33 paquetes hermanos
 * distintos (`agent`, `command-runtime`, `config`, `ide`,
 * `local-observability`, `mcp-runtime`, `output`, `permission`,
 * `provider`, `shell`, `storage`, `tool-registry`) más tres módulos del
 * propio `bootstrap/` de este paquete. NINGUNO de esos 33 destinos
 * existe hoy en este árbol salvo tres excepciones parciales:
 *
 *   - `@thyrox/storage` SÍ existe como paquete, pero no expone
 *     `file.js`/`fsOperations.js`/`git.js`/`secureStorage.js` en su
 *     `package.json` (`exports`) — los cuatro subpaths que este archivo
 *     necesita.
 *   - `@thyrox/agent` SÍ existe, pero no expone `attachments.js`,
 *     `effort.js`, `frontmatterParser.js`, `misc/systemDirectories.js`
 *     ni `yaml.js`.
 *   - `@thyrox/config` SÍ existe, pero no expone `constants.js`,
 *     `dxt/helpers.js`, `dxt/zip.js`, `gitFilesystem.js`,
 *     `outputStyles.js`, `plugin/_deps`, `plugin/builtin` ni
 *     `settings` con la forma que aquí se necesita.
 *
 * `bridge`, `cli`, `ide`, `local-observability`, `mcp-runtime`,
 * `output`, `permission`, `provider`, `shell` y `tool-registry` no
 * existen como paquetes en absoluto.
 *
 * Los tres imports propios del paquete —`../bootstrap/state.js`,
 * `../bootstrap/cleanupRegistry.js`, `../bootstrap/cwd.js`— SÍ se
 * tradujeron a ruta relativa (son del mismo paquete, no un paquete
 * hermano). `registerCleanup` (`cleanupRegistry.ts`) y `getCwd`
 * (`cwd.ts`) YA existen ahí. `getSessionId`, `getOriginalCwd`,
 * `getInlinePlugins`, `getRegisteredHooks`, `registerHookCallbacks`,
 * `clearRegisteredPluginHooks`, `getAdditionalDirectoriesForClaudeMd`,
 * `getUseCoworkPlugins` y `waitForScrollIdle` NO están (todavía) en el
 * `state.ts` de este árbol — `bootstrap/` es zona PROHIBIDA para este
 * pase (la escribe otro agente en paralelo); se conserva el import tal
 * cual, mismo criterio que `activityManager.ts` (hermano ya portado en
 * este paquete) fija para `getActiveTimeCounter`.
 *
 * Ninguno de los 95 setters se stubea ni se reimplementa con lógica
 * propia: cada uno se porta con el MISMO cuerpo que la fuente (el mismo
 * `require(...)` perezoso hacia el mismo paquete hermano), porque ese
 * cuerpo —qué función busca, con qué firma la llama— ES el contrato que
 * se está adaptando. Ninguna de las 33 rutas de `require`/`import` se
 * tradujo a `@thyrox/...`: se pinnearon literales contra la fuente,
 * mismo criterio que `agent/internal/macroFallback.ts` fija para
 * `@claude-code-how-works/config/env`.
 *
 * El auto-run `installPluginBindings()` al final del módulo (igual que
 * la fuente) agotaría el wiring completo al importar — pero el primer
 * import de valor del archivo (`@claude-code-how-works/config/plugin/_deps`)
 * ya agota la resolución de módulos antes de eso.
 *
 * Sin test: no hay ninguna combinación de estos 33 destinos que
 * resuelva hoy en este árbol. Mismo estado que
 * `installCliBindings.ts`/`installNativeStdinReader.ts` (hermanos en
 * este directorio).
 */

import {
  setBuildPluginTelemetryFieldsFn,
  setClassifyPluginCommandErrorFn,
  setCloneFn,
  setExecFileNoThrowFn,
  setExecFileNoThrowWithCwdFn,
  setFsImplementationFn,
  setGetCwdFn,
  setGetHeadForDirFn,
  setGetInlinePluginsFn,
  setGetOriginalCwdFn,
  setGetSessionIdFn,
  setGetSettingsForSourceFn,
  setGetSettingsFn,
  setGitExeFn,
  setIsSettingSourceEnabledFn,
  setJsonParseFn,
  setJsonStringifyFn,
  setLogErrorFn,
  setLogForDebuggingFn,
  setLogForDiagnosticsNoPIIFn,
  setLoadMarkdownConfigFn,
  setPathExistsFn,
  setRegisterCleanupFn,
  setSafeResolvePathFn,
  setSanitizePathFn,
  setWhichFn,
  setWriteFileSyncAndFlushFn,
  setRgPathFn,
  setSecureStorageReadFn,
  setSecureStorageWriteFn,
  setParseMarkdownFrontmatterFn,
  setWalkMarkdownFilesFn,
  setGetRegisteredHooksFn,
  setRegisterHookCallbacksFn,
  setClearRegisteredPluginHooksFn,
  setGetSecureStorageFn,
  // -- Wave A teardown: 20 slots sin wire de host (ver comentario de la
  //    fuente: mismo patrón que el defecto del hook ralph-loop).
  setRipGrepFn,
  setUnzipFileFn,
  setParseZipModesFn,
  setIsFsInaccessibleFn,
  setFindCanonicalGitRootFn,
  setGetSystemDirectoriesFn,
  setGetAdditionalDirectoriesForClaudeMdFn,
  setGetUseCoworkPluginsFn,
  setResetSentSkillNamesFn,
  setUninstallPluginOpFn,
  setUpdatePluginOpFn,
  setClearAgentDefinitionsCacheFn,
  setClearAllOutputStylesCacheFn,
  setClearCommandsCacheFn,
  setClearPromptCacheFn,
  setParseEffortValueFn,
  setParseYamlFn,
  setParseUserSpecifiedModelFn,
  setParseAndValidateManifestFromBytesFn,
  setGetAgentDefinitionsWithOverridesFn,
  // -- Wave A2: 13 wires restantes
  setIsBuiltinPluginIdFn,
  setGetBuiltinPluginDefinitionFn,
  setExtractDescriptionFromMarkdownFn,
  setExpandTildeFn,
  setExpandEnvVarsInStringFn,
  setExecuteShellCommandsInPromptFn,
  setParseFrontmatterFn,
  setParseAgentToolsFromFrontmatterFn,
  setParseSlashCommandToolsFromFrontmatterFn,
  setParseShellFrontmatterFn,
  setParseBooleanFrontmatterFn,
  setParsePositiveIntFromFrontmatterFn,
  setParseArgumentNamesFn,
  setSubstituteArgumentsFn,
  setPluralFn,
  setHasShownHintThisSessionFn,
  setSetPendingHintFn,
  setReinitializeLspServerManagerFn,
  setWaitForScrollIdleFn,
  setWithDiagnosticsTimingFn,
  setWriteFileSyncFn,
  setWriteToStdoutFn,
  setGracefulShutdownFn,
} from '@claude-code-how-works/config/plugin/_deps'

import {
  clearRegisteredPluginHooks,
  getInlinePlugins,
  getOriginalCwd,
  getRegisteredHooks,
  getSessionId,
  registerHookCallbacks,
} from '../bootstrap/state.js'
import { registerCleanup } from '../bootstrap/cleanupRegistry.js'
import { getCwd } from '../bootstrap/cwd.js'
import { logForDebugging } from '@claude-code-how-works/local-observability/debug.js'
import { logForDiagnosticsNoPII } from '@claude-code-how-works/local-observability/logging'
import {
  toError as _toError, // se conserva por claridad, aunque _deps trae su propio toError
} from '@claude-code-how-works/local-observability/errorHelpers.js'
import {
  execFileNoThrow,
  execFileNoThrowWithCwd,
} from '@claude-code-how-works/shell/execFileNoThrow.js'
import { pathExists, writeFileSyncAndFlush } from '@claude-code-how-works/storage/file.js'
import { getFsImplementation, safeResolvePath } from '@claude-code-how-works/storage/fsOperations.js'
import { gitExe } from '@claude-code-how-works/storage/git.js'
import { getHeadForDir } from '@claude-code-how-works/config/gitFilesystem.js'
import { logError } from '@claude-code-how-works/local-observability/logging'
import { clone, jsonParse, jsonStringify } from '@claude-code-how-works/local-observability/slowOperations.js'
import { which } from '@claude-code-how-works/shell/which.js'
import {
  getSettingsForSource,
  getSettings,
} from '@claude-code-how-works/config/settings'
import { isSettingSourceEnabled } from '@claude-code-how-works/config/constants'
import {
  buildPluginTelemetryFields,
  classifyPluginCommandError,
} from '@claude-code-how-works/tool-registry/telemetry/pluginTelemetry.js'

let installed = false

export function installPluginBindings(): void {
  if (installed) return
  installed = true

  // --- logging
  setLogForDebuggingFn((message, ...args) =>
    logForDebugging(message, ...(args as any)),
  )
  setLogErrorFn(error => logError(error))
  setLogForDiagnosticsNoPIIFn((level, event, data) =>
    logForDiagnosticsNoPII(level, event, data),
  )

  // --- registered hooks (la causa raíz de la fuente para que los Stop
  // hooks de plugins dejaran de disparar tras V7: loadPluginHooks()
  // escribe en los placeholders de _deps.ts, agent/hooks.ts lee del
  // STATE de app-host. Sin estos tres wires las dos mitades divergen y
  // todo hook de plugin aterriza en silencio en un slot no-op.)
  setGetRegisteredHooksFn(() => getRegisteredHooks() as never)
  setRegisterHookCallbacksFn(hooks => registerHookCallbacks(hooks as never))
  setClearRegisteredPluginHooksFn(() => clearRegisteredPluginHooks())

  // --- secureStorage (wire hermano del anterior: mismo patrón de slot
  // setter V7, tampoco conectado nunca. loadPluginOptions lee
  // `storage.read()` y revienta con null cuando dispara el default del
  // placeholder — se manifiesta como "null is not an object (evaluating
  // storage.read())" dentro de cada spawn de comando de hook.)
  setGetSecureStorageFn(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@claude-code-how-works/storage/secureStorage.js')
    return mod.getSecureStorage?.() ?? null
  })

  // --- Wave A teardown: 20 slots sin wire de host cuyo getter emparejado
  //     sí tenía lector real. Cada wire de abajo mapea el slot a su
  //     implementación V7 canónica. Donde se usa require() en vez de
  //     import estático es para evitar problemas de orden de carga
  //     cuando el módulo de implementación también toca el estado del
  //     host durante su propia inicialización.
  setRipGrepFn(async (...args: unknown[]) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ripGrep } = require('@claude-code-how-works/tool-registry/ripgrep.js')
    return ripGrep(...args)
  })
  setUnzipFileFn((zipPath, destDir) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { unzipFile } = require('@claude-code-how-works/config/dxt/zip.js')
    return unzipFile(zipPath, destDir)
  })
  setParseZipModesFn((data: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { parseZipModes } = require('@claude-code-how-works/config/dxt/zip.js')
    return parseZipModes(data)
  })
  setIsFsInaccessibleFn((err: unknown): boolean => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { isFsInaccessible } = require('@claude-code-how-works/local-observability/errorHelpers.js')
    return isFsInaccessible(err)
  })
  setFindCanonicalGitRootFn((p: string): string => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { findCanonicalGitRoot } = require('@claude-code-how-works/storage/git.js')
    return findCanonicalGitRoot(p)
  })
  setGetSystemDirectoriesFn(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getSystemDirectories } = require('@claude-code-how-works/agent/misc/systemDirectories.js')
    return getSystemDirectories()
  })
  setGetAdditionalDirectoriesForClaudeMdFn(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('../bootstrap/state.js')
    return mod.getAdditionalDirectoriesForClaudeMd?.() ?? []
  })
  setGetUseCoworkPluginsFn((): boolean => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('../bootstrap/state.js')
    return mod.getUseCoworkPlugins?.() ?? false
  })
  setResetSentSkillNamesFn(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { resetSentSkillNames } = require('@claude-code-how-works/agent/attachments.js')
    resetSentSkillNames()
  })
  setUninstallPluginOpFn(async (...args: unknown[]) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { uninstallPluginOp } = require('@claude-code-how-works/config/plugin/pluginOperations.js')
    return uninstallPluginOp(...args)
  })
  setUpdatePluginOpFn(async (...args: unknown[]) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { updatePluginOp } = require('@claude-code-how-works/config/plugin/pluginOperations.js')
    return updatePluginOp(...args)
  })
  setClearAgentDefinitionsCacheFn(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { clearAgentDefinitionsCache } = require('@claude-code-how-works/tool-registry/tools/AgentTool/loadAgentsDir.js')
    clearAgentDefinitionsCache()
  })
  setClearAllOutputStylesCacheFn(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { clearAllOutputStylesCache } = require('@claude-code-how-works/config/outputStyles.js')
    clearAllOutputStylesCache()
  })
  setClearCommandsCacheFn(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { clearCommandsCache } = require('@claude-code-how-works/command-runtime/api.js')
    clearCommandsCache()
  })
  setClearPromptCacheFn(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { clearPromptCache } = require('@claude-code-how-works/tool-registry/tools/SkillTool/prompt.js')
    clearPromptCache()
  })
  setParseEffortValueFn((v: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { parseEffortValue } = require('@claude-code-how-works/agent/effort.js')
    return parseEffortValue(v)
  })
  setParseYamlFn((input: string) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { parseYaml } = require('@claude-code-how-works/agent/yaml.js')
    return parseYaml(input)
  })
  setParseUserSpecifiedModelFn((...args: unknown[]) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { parseUserSpecifiedModel } = require('@claude-code-how-works/provider/model.js')
    return parseUserSpecifiedModel(...args)
  })
  setParseAndValidateManifestFromBytesFn(async (...args: unknown[]) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { parseAndValidateManifestFromBytes } = require('@claude-code-how-works/config/dxt/helpers.js')
    return parseAndValidateManifestFromBytes(...args)
  })
  setGetAgentDefinitionsWithOverridesFn(async (...args: unknown[]) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getAgentDefinitionsWithOverrides } = require('@claude-code-how-works/tool-registry/tools/AgentTool/loadAgentsDir.js')
    return getAgentDefinitionsWithOverrides(...args)
  })

  // --- Wave A2: 13 wires restantes
  setIsBuiltinPluginIdFn((id: string) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { isBuiltinPluginId } = require('@claude-code-how-works/config/plugin/builtin')
    return isBuiltinPluginId(id)
  })
  setGetBuiltinPluginDefinitionFn((id: string) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getBuiltinPluginDefinition } = require('@claude-code-how-works/config/plugin/builtin')
    return getBuiltinPluginDefinition(id)
  })
  setExtractDescriptionFromMarkdownFn((text: string, def: string) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { extractDescriptionFromMarkdown } = require('@claude-code-how-works/tool-registry/markdownConfigLoader.js')
    return extractDescriptionFromMarkdown(text, def)
  })
  setExpandTildeFn((p: string) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { expandTilde } = require('@claude-code-how-works/permission/pathValidation.js')
    return expandTilde(p)
  })
  setExpandEnvVarsInStringFn((s: string) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { expandEnvVarsInString } = require('@claude-code-how-works/mcp-runtime/envExpansion.js')
    return expandEnvVarsInString(s)
  })
  setExecuteShellCommandsInPromptFn(async (prompt: string, ...rest: unknown[]) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { executeShellCommandsInPrompt } = require('@claude-code-how-works/command-runtime/promptShellExecution.js')
    return executeShellCommandsInPrompt(prompt, ...rest)
  })
  setParseFrontmatterFn((...args: unknown[]) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { parseFrontmatter } = require('@claude-code-how-works/agent/frontmatterParser.js')
    return parseFrontmatter(...args)
  })
  setParseAgentToolsFromFrontmatterFn((...args: unknown[]) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { parseAgentToolsFromFrontmatter } = require('@claude-code-how-works/tool-registry/markdownConfigLoader.js')
    return parseAgentToolsFromFrontmatter(...args)
  })
  setParseSlashCommandToolsFromFrontmatterFn((...args: unknown[]) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { parseSlashCommandToolsFromFrontmatter } = require('@claude-code-how-works/tool-registry/markdownConfigLoader.js')
    return parseSlashCommandToolsFromFrontmatter(...args)
  })
  setParseShellFrontmatterFn((...args: unknown[]) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { parseShellFrontmatter } = require('@claude-code-how-works/agent/frontmatterParser.js')
    return parseShellFrontmatter(...args)
  })
  setParseBooleanFrontmatterFn((v: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { parseBooleanFrontmatter } = require('@claude-code-how-works/agent/frontmatterParser.js')
    return parseBooleanFrontmatter(v)
  })
  setParsePositiveIntFromFrontmatterFn((...args: unknown[]) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { parsePositiveIntFromFrontmatter } = require('@claude-code-how-works/agent/frontmatterParser.js')
    return parsePositiveIntFromFrontmatter(...args)
  })
  setParseArgumentNamesFn((...args: unknown[]) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { parseArgumentNames } = require('@claude-code-how-works/command-runtime/argumentSubstitution.js')
    return parseArgumentNames(...args)
  })
  setSubstituteArgumentsFn((...args: unknown[]) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { substituteArguments } = require('@claude-code-how-works/command-runtime/argumentSubstitution.js')
    return substituteArguments(...args)
  })
  setPluralFn((n: number, singular: string, plural?: string) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@claude-code-how-works/output/utils/stringUtils.js')
    return mod.plural(n, singular, plural)
  })
  setHasShownHintThisSessionFn(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { hasShownHintThisSession } = require('@claude-code-how-works/tool-registry/claudeCodeHints.js')
    return hasShownHintThisSession()
  })
  setSetPendingHintFn((hint: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { setPendingHint } = require('@claude-code-how-works/tool-registry/claudeCodeHints.js')
    setPendingHint(hint)
  })
  setReinitializeLspServerManagerFn(async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { reinitializeLspServerManager } = require('@claude-code-how-works/ide/lsp/manager.js')
    return reinitializeLspServerManager()
  })
  setWaitForScrollIdleFn(async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { waitForScrollIdle } = require('../bootstrap/state.js')
    return waitForScrollIdle?.()
  })
  setWithDiagnosticsTimingFn(async <T>(event: string, fn: () => Promise<T>): Promise<T> => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { withDiagnosticsTiming } = require('@claude-code-how-works/local-observability/logging')
    return withDiagnosticsTiming(event, fn) as Promise<T>
  })
  setWriteFileSyncFn((path: string, data: string) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { writeFileSync } = require('@claude-code-how-works/local-observability/slowOperations.js')
    writeFileSync(path, data)
  })
  setWriteToStdoutFn((data: string) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { writeToStdout } = require('@claude-code-how-works/shell/process.js')
    writeToStdout(data)
  })
  setGracefulShutdownFn(async (code?: number) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { gracefulShutdown } = require('../bootstrap/gracefulShutdown.js')
    return gracefulShutdown(code)
  })

  // --- sesión / cwd
  setGetSessionIdFn(() => getSessionId())
  setGetOriginalCwdFn(() => getOriginalCwd())
  setGetCwdFn(() => getCwd())
  setGetInlinePluginsFn(() =>
    getInlinePlugins() as Record<string, unknown> | undefined,
  )

  // --- settings
  setGetSettingsFn(() => getSettings() as any)
  setGetSettingsForSourceFn(source => getSettingsForSource(source as any) as any)
  setIsSettingSourceEnabledFn(source => isSettingSourceEnabled(source as any))

  // --- fs / path (métodos sync + async)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeFs = require('node:fs') as typeof import('node:fs')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeFsp = require('node:fs/promises') as typeof import('node:fs/promises')
  setFsImplementationFn({
    existsSync: p => getFsImplementation().existsSync(p),
    mkdirSync: (p, o) => getFsImplementation().mkdirSync(p, o),
    writeFileSync: (p, d) => getFsImplementation().writeFileSync(p, d),
    readFileSync: (p, e) => getFsImplementation().readFileSync(p, e) as string,
    readdirSync: p =>
      nodeFs.readdirSync(p, { withFileTypes: true }) as Array<{
        name: string
        isFile(): boolean
        isDirectory(): boolean
      }>,
    statSync: p => getFsImplementation().statSync(p) as any,
    rmSync: (p, o) => getFsImplementation().rmSync(p, o as any),
    rmdirSync: p => nodeFs.rmdirSync(p),
    renameSync: (o, n) => getFsImplementation().renameSync(o, n),
    appendFileSync: (p, d) => getFsImplementation().appendFileSync(p, d),
    cwd: () => getFsImplementation().cwd(),
    realpathSync: p => getFsImplementation().realpathSync(p) as string,
    readFile: async (p, opts) =>
      (await nodeFsp.readFile(p, opts?.encoding ?? 'utf-8')) as string,
    readFileBytes: async p => new Uint8Array(await nodeFsp.readFile(p)),
    writeFile: async (p, d) => nodeFsp.writeFile(p, d),
    mkdir: async (p, o) => {
      await nodeFsp.mkdir(p, { recursive: true, ...(o ?? {}) })
    },
    readdir: async p =>
      (await nodeFsp.readdir(p, { withFileTypes: true })) as Array<{
        name: string
        isFile(): boolean
        isDirectory(): boolean
      }>,
    stat: async p => (await nodeFsp.stat(p)) as any,
    rm: async (p, o) => nodeFsp.rm(p, o),
    rename: async (o, n) => nodeFsp.rename(o, n),
  })
  setPathExistsFn(p => pathExists(p))
  setSafeResolvePathFn((base, rel) => safeResolvePath(base, rel) ?? null)
  setWriteFileSyncAndFlushFn((p, d) => writeFileSyncAndFlush(p, d))
  setSanitizePathFn(p => p) // no-op; los archivos de plugin tienen su propio sanitizePath
  setRegisterCleanupFn(fn => registerCleanup(fn))

  // --- git
  setGitExeFn(() => gitExe() as any)
  setGetHeadForDirFn(dir => getHeadForDir(dir))

  // --- subproceso
  setExecFileNoThrowFn((cmd, args, options) =>
    execFileNoThrow(cmd, args, options) as any,
  )
  setExecFileNoThrowWithCwdFn((cmd, args, cwd, options) =>
    execFileNoThrowWithCwd(cmd, args, cwd, options) as any,
  )
  setWhichFn(cmd => which(cmd))

  // --- operaciones lentas
  setJsonStringifyFn(v => jsonStringify(v))
  setJsonParseFn(t => jsonParse(t) as unknown)
  setCloneFn(v => clone(v))

  // --- telemetría
  setBuildPluginTelemetryFieldsFn((...args) =>
    buildPluginTelemetryFields(...(args as any)),
  )
  setClassifyPluginCommandErrorFn(error =>
    classifyPluginCommandError(error) as any,
  )

  // --- helpers varios
  setRgPathFn(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('@claude-code-how-works/tool-registry/ripgrep.js')
      return mod.rgPath?.() ?? null
    } catch {
      return null
    }
  })
  setSecureStorageReadFn(async key => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('@claude-code-how-works/storage/secureStorage.js')
      return mod.secureStorageRead ? await mod.secureStorageRead(key) : null
    } catch {
      return null
    }
  })
  setSecureStorageWriteFn(async (key, value) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('@claude-code-how-works/storage/secureStorage.js')
      if (mod.secureStorageWrite) await mod.secureStorageWrite(key, value)
    } catch {
      // ignorar
    }
  })
  setParseMarkdownFrontmatterFn(text => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@claude-code-how-works/agent/frontmatterParser.js')
    return mod.parseMarkdownFrontmatter
      ? mod.parseMarkdownFrontmatter(text)
      : { frontmatter: {}, body: '' }
  })
  setWalkMarkdownFilesFn(async dir => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@claude-code-how-works/tool-registry/markdownConfigLoader.js')
    return mod.walkMarkdownFiles
      ? ((await mod.walkMarkdownFiles(dir)) as string[])
      : []
  })
  setLoadMarkdownConfigFn(path => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@claude-code-how-works/tool-registry/markdownConfigLoader.js')
    return mod.loadMarkdownConfig ? mod.loadMarkdownConfig(path) : null
  })
  // --- plugins builtin (basado en setter porque los originales son const arrays)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@claude-code-how-works/config/plugin/builtin')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {
      setGetBuiltinPluginsFn: _sgb,
      setIsBuiltinPluginIdFn: _sid,
      setGetBuiltinPluginDefinitionFn: _sgd,
    } = require('@claude-code-how-works/config/plugin/_deps')
    if (mod.getBuiltinPlugins) _sgb(() => mod.getBuiltinPlugins())
    if (mod.isBuiltinPluginId) _sid(mod.isBuiltinPluginId)
    if (mod.getBuiltinPluginDefinition) _sgd(mod.getBuiltinPluginDefinition)
  } catch (e) {
    // Plugins builtin no disponibles — cae a la estructura vacía.
  }

  // --- proveedores de argumentSubstitution + hints
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const argMod = require('src/utils/argumentSubstitution.js')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { setApplyArgumentSubstitutionsFn: _sas } = require(
      '@claude-code-how-works/config/plugin/_deps',
    )
    if (argMod.applyArgumentSubstitutions) _sas(argMod.applyArgumentSubstitutions)
  } catch {
    // ignorar
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const hintMod = require('@claude-code-how-works/tool-registry/claudeCodeHints.js')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { setGetHintsProviderFn: _gh } = require(
      '@claude-code-how-works/config/plugin/_deps',
    )
    if (hintMod.getHintsProvider) _gh(hintMod.getHintsProvider)
  } catch {
    // ignorar
  }
}

installPluginBindings()
