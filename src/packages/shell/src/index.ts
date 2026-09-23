/**
 * Barril público de `@thyrox/shell`.
 *
 * La fuente (`claude-code-nestor-monroy-tools: packages/shell/src/index.ts`)
 * reexporta los módulos de tipos, contexto, parser AST de bash,
 * `bashPipeCommand`, commands, quoting, providers, discovery, snapshots y
 * ejecución. Este árbol ya contiene esas implementaciones; se publican por
 * nombre desde sus dueños canónicos y se excluyen las copias `legacy`.
 *
 * @module
 */

export {
  extractHeredocs,
  restoreHeredocs,
  containsHeredoc,
  type HeredocInfo,
  type HeredocExtractionResult,
} from './bash/heredoc.js'

export {
  loadFigSpec,
  getCommandSpec,
  type CommandSpec,
  type Argument,
  type Option,
} from './bash/registry.js'

export { peekForStdinData } from './process.js'

export { formatShellPrefixCommand } from './bash/shellPrefix.js'

export { quote } from './bash/shellQuote.js'

export { subprocessEnv, registerUpstreamProxyEnvFn } from './subprocessEnv.js'

// Superficie canónica del runtime shell. Estos módulos ya están portados y
// los consumidores de la raíz no deben depender de rutas internas ni de las
// copias legacy que aún conserva el árbol.
export type {
  ExecOptions,
  ExecResult,
  ShellCommand,
  ShellConfig,
  ShellProvider,
  ShellType,
} from './types.js'
export { DEFAULT_HOOK_SHELL, SHELL_TYPES } from './types.js'
export type { ShellExecContext, SnapshotContext } from './context.js'
export type {
  ParseEntry,
  ShellParseResult,
  ShellQuoteResult,
} from './bash/shellQuote.js'
export {
  hasMalformedTokens,
  hasShellQuoteSingleQuoteBug,
  tryParseShellCommand,
  tryQuoteShellArgs,
} from './bash/shellQuote.js'
export {
  hasStdinRedirect,
  quoteShellCommand,
  shouldAddStdinRedirect,
} from './bash/shellQuoting.js'
export { rearrangePipeCommand } from './bash/bashPipeCommand.js'
export {
  PARSE_ABORTED,
  ensureInitialized,
  extractCommandArguments,
  parseCommand,
  parseCommandRaw,
} from './bash/parser.js'
export {
  clearCommandPrefixCaches,
  extractOutputRedirections,
  filterControlOperators,
  isHelpCommand,
  isUnsafeCompoundCommand,
  splitCommand,
  splitCommandWithOperators,
} from './bash/commands.js'
export {
  analyzeCommand,
  extractCompoundStructure,
  extractDangerousPatterns,
  extractQuoteContext,
  hasActualOperatorNodes,
} from './bash/treeSitterAnalysis.js'
export {
  createAndSaveSnapshot,
  createFindGrepShellIntegration,
  createRipgrepShellIntegration,
} from './bash/ShellSnapshot.js'
export { getCommandPrefixStatic, getCompoundCommandPrefixesStatic } from './bash/prefix.js'
export { DEPTH_RULES, buildPrefix } from './prefix/specPrefix.js'
export {
  FLAG_PATTERN,
  GIT_READ_ONLY_COMMANDS,
  validateFlags,
} from './providers/readOnlyCommandValidation.js'
export type {
  ExternalCommandConfig,
  FlagArgType,
} from './providers/readOnlyCommandValidation.js'
export { getMaxOutputLength } from './providers/outputLimits.js'
export {
  SHELL_TOOL_NAMES,
  isPowerShellToolEnabled,
} from './providers/shellToolUtils.js'
export { createBashShellProvider } from './providers/bashProvider.js'
export {
  buildPowerShellArgs,
  createPowerShellProvider,
} from './providers/powershellProvider.js'
export type { PowerShellEdition } from './providers/powershellDetection.js'
export { getCachedPowerShellPath } from './providers/powershellDetection.js'
export { resolveDefaultShell } from './providers/resolveDefaultShell.js'
export {
  createProviderResolver,
  createPsProviderFactory,
  createShellConfigFactory,
  findSuitableShell,
} from './shellDiscovery.js'
export {
  createAbortedCommand,
  createFailedCommand,
  wrapSpawn,
} from './shellCommand.js'
export {
  exec,
  setCreateTaskOutputFn,
  setCwd,
  setGetSandboxTmpDirNameFn,
} from './exec.js'
export type { TaskOutputPort } from './taskOutputPort.js'
export { MAX_TASK_OUTPUT_BYTES } from './shellCommand.js'
