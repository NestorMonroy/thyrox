/**
 * Barril de `@thyrox/shell` — PORTE PARCIAL DEL PAQUETE.
 *
 * La fuente (`claude-code-nestor-monroy-tools: packages/shell/src/index.ts`)
 * reexporta ~20 módulos (tipos de shell, contexto de snapshot, parser AST
 * de bash, `bashPipeCommand`, `commands`, `shellQuoting`, `Shell.ts`,
 * PowerShell, sandbox, terminal…). Esta tarea (TASK-DOCS-0200) portó sólo
 * los cinco módulos que sus cinco tests ejercitan; este barril reexporta
 * SÓLO esos. El resto del paquete fuente NO está portado.
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
  type CommandSpec,
  type Argument,
  type Option,
} from './bash/registry.js'

export { peekForStdinData } from './process.js'

export { formatShellPrefixCommand } from './bash/shellPrefix.js'

export { quote } from './bash/shellQuote.js'

export { subprocessEnv, registerUpstreamProxyEnvFn } from './subprocessEnv.js'
