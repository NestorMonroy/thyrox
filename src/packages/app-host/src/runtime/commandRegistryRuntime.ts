// biome-ignore-all assist/source/organizeImports: ANT-ONLY import markers must not be reordered
import addDir, { cd } from '@thyrox/repl/commands/add-dir/index.js'
import { installCommandRegistryHostBindings } from '@thyrox/command-runtime'
import autofixPr from '@thyrox/command-runtime/stubs/stubCommand.js'
import backfillSessions from '@thyrox/command-runtime/stubs/stubCommand.js'
import btw from '@thyrox/command-runtime/commands/btw/index.js'
import goalJsx, { goalLocalCommand as goalLocal } from '@thyrox/command-runtime/commands/goal/index.js'
import goodClaude from '@thyrox/command-runtime/stubs/stubCommand.js'
import issue from '@thyrox/command-runtime/stubs/stubCommand.js'
import clear from '@thyrox/command-runtime/commands/clear/index.js'
import color from '@thyrox/repl/commands/color/index.js'
import commit from '@thyrox/agent/commands/commit.js'
import copy from '@thyrox/command-runtime/commands/copy/index.js'
import desktop from '@thyrox/repl/commands/desktop/index.js'
import commitPushPr from '@thyrox/agent/commands/commit-push-pr.js'
import compact from '@thyrox/command-runtime/commands/compact/index.js'
import pauseMemory from '@thyrox/command-runtime/commands/pause-memory/index.js'
import config from '@thyrox/repl/commands/config/index.js'
import { context, contextNonInteractive } from '@thyrox/command-runtime/commands/context/index.js'
import cost from '@thyrox/command-runtime/commands/cost/index.js'
import diff from '@thyrox/repl/commands/diff/index.js'
import ctx_viz from '@thyrox/command-runtime/stubs/stubCommand.js'
import doctor from '@thyrox/repl/commands/doctor/index.js'
import memory from '@thyrox/command-runtime/commands/memory/index.js'
import help from '@thyrox/repl/commands/help/index.js'
import ide from '@thyrox/command-runtime/commands/ide/index.js'
import init from '../commands/initCommand.js'
import initVerifiers from '../commands/init-verifiers.js'
import keybindings from '@thyrox/repl/commands/keybindings/index.js'
import login from '@thyrox/command-runtime/commands/login/index.js'
import logout from '@thyrox/provider/commands/logout/index.js'
import installGitHubApp from '@thyrox/command-runtime/commands/install-github-app/index.js'
import installSlackApp from '@thyrox/repl/commands/install-slack-app/index.js'
import breakCache from '@thyrox/command-runtime/stubs/stubCommand.js'
import mcp from '@thyrox/command-runtime/commands/mcp/index.js'
import mobile from '@thyrox/repl/commands/mobile/index.js'
import onboarding from '@thyrox/command-runtime/stubs/stubCommand.js'
import pr_comments from '@thyrox/agent/commands/pr_comments/index.js'
import rename from '@thyrox/command-runtime/commands/rename/index.js'
import resume from '@thyrox/command-runtime/commands/resume/index.js'
import review, { ultrareview } from '@thyrox/command-runtime/commands/review/review.js'
import session from '@thyrox/command-runtime/commands/session/index.js'
import share from '@thyrox/command-runtime/stubs/stubCommand.js'
import skills from '@thyrox/command-runtime/commands/skills/index.js'
import status from '@thyrox/command-runtime/commands/status/index.js'
import tasks from '@thyrox/agent/commands/tasks/index.js'
import teleport from '@thyrox/command-runtime/stubs/stubCommand.js'
/* eslint-disable @typescript-eslint/no-require-imports */
// agents-platform was an ant-internal command not present in this build; the
// shim was deleted with the rest of src/commands/. Treat as absent.
const agentsPlatform = null
/* eslint-enable @typescript-eslint/no-require-imports */
import securityReview from '@thyrox/agent/commands/security-review.js'
import bughunter from '@thyrox/command-runtime/stubs/stubCommand.js'
import terminalSetup from '@thyrox/command-runtime/commands/terminalSetup/index.js'
import usage from '@thyrox/repl/commands/usage/index.js'
import theme from '@thyrox/command-runtime/commands/theme/index.js'
import vim from '@thyrox/repl/commands/vim/index.js'
import { feature } from 'bun:bundle'
// Dead code elimination: conditional imports
/* eslint-disable @typescript-eslint/no-require-imports */
// proactive command shim deleted — feature gates default false in this build.
const proactive = null
const briefCommand =
  feature('KAIROS') || feature('KAIROS_BRIEF')
    ? require('@thyrox/agent/commands/brief.js').default
    : null
const assistantCommand = feature('KAIROS')
  ? require('@thyrox/repl/commands/assistant/index.js').default
  : null
const bridge = feature('BRIDGE_MODE')
  ? require('@thyrox/command-runtime/commands/bridge/index.js').default
  : null
const remoteControlServerCommand =
  feature('DAEMON') && feature('BRIDGE_MODE')
    ? require('@thyrox/command-runtime/commands/remoteControlServer/index.js').default
    : null
const voiceCommand = feature('VOICE_MODE')
  ? require('@thyrox/command-runtime/commands/voice/index.js').default
  : null
// force-snip shim deleted — HISTORY_SNIP feature absent in this build.
const forceSnip = null
const webCmd = feature('CCR_REMOTE_SETUP')
  ? (
      require('@thyrox/teleport/remote-setup/index.js') as typeof import('@thyrox/teleport/remote-setup/index.js')
    ).default
  : null
const clearSkillIndexCache = feature('EXPERIMENTAL_SKILL_SEARCH')
  ? (
      require('@thyrox/agent/skillSearch/localSearch.js') as typeof import('@thyrox/agent/skillSearch/localSearch.js')
    ).clearSkillIndexCache
  : null
// subscribe-pr shim deleted — KAIROS_GITHUB_WEBHOOKS feature absent.
const subscribePr = null
const ultraplan = feature('ULTRAPLAN')
  ? require('@thyrox/repl/ultraplan.js').default
  : null
// `/workflows` — browse workflow + goal-run history (running + completed).
// ant v2.1.150 4938.js NlK. Unconditionally registered (ant ships the command
// in every build); visibility is the command's own runtime `isEnabled` →
// isWorkflowsEnabled() (ant `bp()`), so DCE must NOT strip it.
const workflowsCommand = (
  require('@thyrox/command-runtime/commands/workflows/index.js') as typeof import('@thyrox/command-runtime/commands/workflows/index.js')
).default
// torch shim deleted — TORCH feature absent.
const torch = null
const peersCmd = feature('UDS_INBOX')
  ? (
      require('@thyrox/command-runtime/stubs/emptyCommandStub.js') as typeof import('@thyrox/command-runtime/stubs/emptyCommandStub.js')
    ).default
  : null
// `/fork <directive>` — spawn an in-process background agent that inherits
// the full conversation context. Mirrors ant v2.1.131 4659.js / 4657.js /
// 4656.js (gJK / BJK / mJK). Gated behind FORK_SUBAGENT so the rest of the
// fork-subagent infra (forkSubagent.ts FORK_AGENT, AgentTool's isForkPath
// branch, isInForkChild guard) only ships when the slash command is wired.
const forkCmd = feature('FORK_SUBAGENT')
  ? (
      require('@thyrox/command-runtime/commands/fork/index.js') as typeof import('@thyrox/command-runtime/commands/fork/index.js')
    ).default
  : null
/* eslint-enable @typescript-eslint/no-require-imports */
import stop from '@thyrox/command-runtime/commands/stop/index.js'
import background from '@thyrox/command-runtime/commands/background/index.js'
import thinkback from '@thyrox/config/plugin/commands/thinkback/index.js'
import thinkbackPlay from '@thyrox/config/plugin/commands/thinkback-play/index.js'
import permissions from '@thyrox/permission/commands/index.js'
import plan from '@thyrox/repl/commands/plan/index.js'
import fast from '@thyrox/command-runtime/commands/fast/index.js'
import passes from '@thyrox/repl/commands/passes/index.js'
import privacySettings from '@thyrox/command-runtime/commands/privacy-settings/index.js'
import hooks from '@thyrox/repl/commands/hooks/index.js'
import files from '@thyrox/repl/commands/files/index.js'
import branch from '@thyrox/swarm/commands/branch/index.js'
import agents from '@thyrox/swarm/commands/agents/index.js'
import plugin from '@thyrox/command-runtime/commands/plugin/index.js'
import powerup from '@thyrox/command-runtime/commands/powerup/index.js'
import reloadPlugins from '@thyrox/config/plugin/commands/reload-plugins/index.js'
import rewind from '@thyrox/repl/commands/rewind/index.js'
import heapDump from '@thyrox/repl/commands/heapdump/index.js'
import tui from '@thyrox/repl/commands/tui/index.js'
import mockLimits from '@thyrox/command-runtime/stubs/stubCommand.js'
import bridgeKick from '@thyrox/bridge/commands/bridge-kick.js'
import version from '@thyrox/cli/commands/version.js'
import summary from '@thyrox/command-runtime/stubs/stubCommand.js'
import {
  resetLimits,
  resetLimitsNonInteractive,
} from '@thyrox/command-runtime/stubs/resetLimitsStub.js'
import antTrace from '@thyrox/command-runtime/stubs/stubCommand.js'
import perfIssue from '@thyrox/command-runtime/stubs/stubCommand.js'
import sandboxToggle from '@thyrox/repl/commands/sandbox-toggle/index.js'
import chrome from '@thyrox/command-runtime/commands/chrome/index.js'
import stickers from '@thyrox/repl/commands/stickers/index.js'
import advisor from '@thyrox/provider/commands/advisor.js'
import provider from '@thyrox/provider/commands/provider.js'
import { logError } from '@thyrox/local-observability/logging'
import { toError } from '@thyrox/local-observability/errorHelpers.js'
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import {
  getSkillDirCommands,
  clearSkillCaches,
  getDynamicSkills,
} from '@thyrox/command-runtime/skills/loadSkillsDir.js'
import { getBundledSkills } from '@thyrox/command-runtime/skills/bundledSkills.js'
import { getBuiltinPluginSkillCommands } from '@thyrox/config/plugin/builtin'
import {
  getPluginCommands,
  clearPluginCommandCache,
  getPluginSkills,
  clearPluginSkillsCache,
} from '@thyrox/config/plugin/loadPluginCommands'
import memoize from 'lodash-es/memoize.js'
import { isUsing3PServices, isClaudeAISubscriber } from '@thyrox/provider/authAlias.js'
import { isFirstPartyAnthropicBaseUrl } from '@thyrox/provider/providers.js'
import env from '@thyrox/command-runtime/stubs/stubCommand.js'
import exit from '@thyrox/repl/commands/exit/index.js'
import exportCommand from '@thyrox/repl/commands/export/index.js'
import model from '@thyrox/command-runtime/commands/model/index.js'
import tag from '@thyrox/repl/commands/tag/index.js'
import outputStyle from '@thyrox/repl/commands/output-style/index.js'
import remoteEnv from '@thyrox/command-runtime/commands/remote-env/index.js'
import upgrade from '@thyrox/command-runtime/commands/upgrade/index.js'
import {
  extraUsage,
  extraUsageNonInteractive,
} from '@thyrox/repl/extraUsage.js'
import rateLimitOptions from '@thyrox/command-runtime/commands/rate-limit-options/index.js'
import recap from '@thyrox/command-runtime/commands/recap/index.js'
import statusline from '@thyrox/repl/commands/statusline.js'
import effort from '@thyrox/command-runtime/commands/effort/index.js'
import stats from '@thyrox/repl/commands/stats/index.js'
// insights.ts is 113KB (3200 lines, includes diffLines/html rendering). Lazy
// shim defers the heavy module until /insights is actually invoked.
const usageReport: Command = {
  type: 'prompt',
  name: 'insights',
  description: 'Generate a report analyzing your Claude Code sessions',
  contentLength: 0,
  progressMessage: 'analyzing your sessions',
  source: 'builtin',
  async getPromptForCommand(args, context) {
    const real = (await import('@thyrox/command-runtime/commands/insights/insights.js')).default
    if (real.type !== 'prompt') throw new Error('unreachable')
    return real.getPromptForCommand(args, context)
  },
}
import oauthRefresh from '@thyrox/command-runtime/stubs/stubCommand.js'
import debugToolCall from '@thyrox/command-runtime/stubs/stubCommand.js'
import { getSettingSourceName } from '@thyrox/config/constants'
import {
  type Command,
  getCommandName,
  isCommandEnabled,
} from '@thyrox/agent/command.js'

// Re-export types from the centralized location
export type {
  Command,
  CommandBase,
  CommandResultDisplay,
  LocalCommandResult,
  LocalJSXCommandContext,
  PromptCommand,
  ResumeEntrypoint,
} from '@thyrox/agent/command.js'
export { getCommandName, isCommandEnabled } from '@thyrox/agent/command.js'

// Commands that get eliminated from the external build
export const INTERNAL_ONLY_COMMANDS = [
  backfillSessions,
  breakCache,
  bughunter,
  commit,
  commitPushPr,
  ctx_viz,
  goodClaude,
  issue,
  initVerifiers,
  ...(forceSnip ? [forceSnip] : []),
  mockLimits,
  bridgeKick,
  version,
  ...(subscribePr ? [subscribePr] : []),
  resetLimits,
  resetLimitsNonInteractive,
  onboarding,
  share,
  summary,
  teleport,
  antTrace,
  perfIssue,
  env,
  oauthRefresh,
  debugToolCall,
  agentsPlatform,
  autofixPr,
].filter((c): c is Command => c !== null)

// Declared as a function so that we don't run this until getCommands is called,
// since underlying functions read from config, which can't be read at module initialization time
const COMMANDS = memoize((): Command[] => [
  addDir,
  cd,
  advisor,
  provider,
  agents,
  goalJsx,
  goalLocal,
  branch,
  btw,
  chrome,
  clear,
  color,
  compact,
  config,
  pauseMemory,
  copy,
  desktop,
  context,
  contextNonInteractive,
  cost,
  diff,
  doctor,
  effort,
  exit,
  fast,
  files,
  heapDump,
  tui,
  help,
  ide,
  init,
  keybindings,
  installGitHubApp,
  installSlackApp,
  mcp,
  memory,
  mobile,
  model,
  outputStyle,
  remoteEnv,
  plugin,
  powerup,
  pr_comments,
  reloadPlugins,
  rename,
  resume,
  session,
  skills,
  stats,
  status,
  statusline,
  stickers,
  tag,
  theme,
  review,
  ultrareview,
  rewind,
  securityReview,
  terminalSetup,
  upgrade,
  extraUsage,
  extraUsageNonInteractive,
  rateLimitOptions,
  recap,
  usage,
  usageReport,
  vim,
  stop,
  background,
  ...(webCmd ? [webCmd] : []),
  ...(forkCmd ? [forkCmd] : []),
  ...(proactive ? [proactive] : []),
  ...(briefCommand ? [briefCommand] : []),
  ...(assistantCommand ? [assistantCommand] : []),
  ...(bridge ? [bridge] : []),
  ...(remoteControlServerCommand ? [remoteControlServerCommand] : []),
  ...(voiceCommand ? [voiceCommand] : []),
  thinkback,
  thinkbackPlay,
  permissions,
  plan,
  privacySettings,
  hooks,
  exportCommand,
  sandboxToggle,
  ...(!isUsing3PServices() ? [logout, login()] : []),
  passes,
  ...(peersCmd ? [peersCmd] : []),
  tasks,
  workflowsCommand,
  ...(ultraplan ? [ultraplan] : []),
  ...(torch ? [torch] : []),
  ...(process.env.USER_TYPE === 'ant' && !process.env.IS_DEMO
    ? INTERNAL_ONLY_COMMANDS
    : []),
])

export const builtInCommandNames = memoize(
  (): Set<string> =>
    new Set(COMMANDS().flatMap(_ => [_.name, ...(_.aliases ?? [])])),
)

async function getSkills(cwd: string): Promise<{
  skillDirCommands: Command[]
  pluginSkills: Command[]
  bundledSkills: Command[]
  builtinPluginSkills: Command[]
}> {
  try {
    const [skillDirCommands, pluginSkills] = await Promise.all([
      getSkillDirCommands(cwd).catch((err: unknown) => {
        logError(toError(err))
        logForDebugging(
          'Skill directory commands failed to load, continuing without them',
        )
        return []
      }),
      getPluginSkills().catch(err => {
        logError(toError(err))
        logForDebugging('Plugin skills failed to load, continuing without them')
        return []
      }),
    ])
    // Bundled skills are registered synchronously at startup
    const bundledSkills = getBundledSkills()
    // Built-in plugin skills come from enabled built-in plugins
    const builtinPluginSkills = getBuiltinPluginSkillCommands()
    logForDebugging(
      `getSkills returning: ${skillDirCommands.length} skill dir commands, ${pluginSkills.length} plugin skills, ${bundledSkills.length} bundled skills, ${builtinPluginSkills.length} builtin plugin skills`,
    )
    return {
      skillDirCommands,
      pluginSkills,
      bundledSkills,
      builtinPluginSkills,
    }
  } catch (err) {
    // This should never happen since we catch at the Promise level, but defensive
    logError(toError(err))
    logForDebugging('Unexpected error in getSkills, returning empty')
    return {
      skillDirCommands: [],
      pluginSkills: [],
      bundledSkills: [],
      builtinPluginSkills: [],
    }
  }
}

// Named-workflow slash commands (ant `/workflow run <name>` family, built from
// .claude/workflows/ + bundled registry) are a P5 staged-gap:
// createWorkflowCommand.ts is still a stub and the named-workflow resolver is
// not wired (see WorkflowTool.ts resolveScript). Until that lands there are no
// per-workflow commands to register. The Workflow TOOL + ultrawork keyword +
// /workflows browser all ship and work without this. Mientras tanto la fuente
// aporta cero comandos, y se declara así en vez de con un `null` que el
// compilador leía como código muerto.
const NO_WORKFLOW_COMMANDS: Command[] = []

/**
 * Filters commands by their declared `availability` (auth/provider requirement).
 * Commands without `availability` are treated as universal.
 * This runs before `isEnabled()` so that provider-gated commands are hidden
 * regardless of feature-flag state.
 *
 * Not memoized — auth state can change mid-session (e.g. after /login),
 * so this must be re-evaluated on every getCommands() call.
 */
export function meetsAvailabilityRequirement(cmd: Command): boolean {
  if (!cmd.availability || cmd.availability.length === 0) return true
  for (const a of cmd.availability) {
    switch (a) {
      case 'claude-ai':
        if (isClaudeAISubscriber()) return true
        break
      case 'console':
        // Console API key user = direct 1P API customer (not 3P, not claude.ai).
        // Excludes 3P (Bedrock/Vertex/Foundry) who don't set ANTHROPIC_BASE_URL
        // and gateway users who proxy through a custom base URL.
        if (
          !isClaudeAISubscriber() &&
          !isUsing3PServices() &&
          isFirstPartyAnthropicBaseUrl()
        )
          return true
        break
      default: {
        const _exhaustive: never = a
        void _exhaustive
        break
      }
    }
  }
  return false
}

/**
 * Loads all command sources (skills, plugins, workflows). Memoized by cwd
 * because loading is expensive (disk I/O, dynamic imports).
 */
const loadAllCommands = memoize(async (cwd: string): Promise<Command[]> => {
  const [
    { skillDirCommands, pluginSkills, bundledSkills, builtinPluginSkills },
    pluginCommands,
    workflowCommands,
  ] = await Promise.all([
    getSkills(cwd),
    getPluginCommands(),
    Promise.resolve(NO_WORKFLOW_COMMANDS),
  ])

  return [
    ...bundledSkills,
    ...builtinPluginSkills,
    ...skillDirCommands,
    ...workflowCommands,
    ...pluginCommands,
    ...pluginSkills,
    ...COMMANDS(),
  ]
})

/**
 * Returns commands available to the current user. The expensive loading is
 * memoized, but availability and isEnabled checks run fresh every call so
 * auth changes (e.g. /login) take effect immediately.
 */
export async function getCommands(cwd: string): Promise<Command[]> {
  const allCommands = await loadAllCommands(cwd)

  // Get dynamic skills discovered during file operations. `dynamicSkills.ts`
  // declara sólo el subconjunto que lee; lo que guarda es el comando entero
  // que produce su cargador (`loadSkillsDir.ts`, `setSkillDirectoryLoader`).
  const dynamicSkills = getDynamicSkills() as Command[]

  // Build base commands without dynamic skills
  const baseCommands = allCommands.filter(
    _ => meetsAvailabilityRequirement(_) && isCommandEnabled(_),
  )

  if (dynamicSkills.length === 0) {
    return baseCommands
  }

  // Dedupe dynamic skills - only add if not already present
  const baseCommandNames = new Set(baseCommands.map(c => c.name))
  const uniqueDynamicSkills = dynamicSkills.filter(
    (s: Command) =>
      !baseCommandNames.has(s.name) &&
      meetsAvailabilityRequirement(s) &&
      isCommandEnabled(s),
  )

  if (uniqueDynamicSkills.length === 0) {
    return baseCommands
  }

  // Insert dynamic skills after plugin skills but before built-in commands
  const builtInNames = new Set(COMMANDS().map(c => c.name))
  const insertIndex = baseCommands.findIndex(c => builtInNames.has(c.name))

  if (insertIndex === -1) {
    return [...baseCommands, ...uniqueDynamicSkills]
  }

  return [
    ...baseCommands.slice(0, insertIndex),
    ...uniqueDynamicSkills,
    ...baseCommands.slice(insertIndex),
  ]
}

/**
 * Clears only the memoization caches for commands, WITHOUT clearing skill caches.
 * Use this when dynamic skills are added to invalidate cached command lists.
 */
export function clearCommandMemoizationCaches(): void {
  loadAllCommands.cache?.clear?.()
  getSkillToolCommands.cache?.clear?.()
  getSlashCommandToolSkills.cache?.clear?.()
  // getSkillIndex in skillSearch/localSearch.ts is a separate memoization layer
  // built ON TOP of getSkillToolCommands/getCommands. Clearing only the inner
  // caches is a no-op for the outer — lodash memoize returns the cached result
  // without ever reaching the cleared inners. Must clear it explicitly.
  clearSkillIndexCache?.()
}

export function clearCommandsCache(): void {
  clearCommandMemoizationCaches()
  clearPluginCommandCache()
  clearPluginSkillsCache()
  clearSkillCaches()
}

/**
 * Filter AppState.mcp.commands to MCP-provided skills (prompt-type,
 * model-invocable, loaded from MCP). These live outside getCommands() so
 * callers that need MCP skills in their skill index thread them through
 * separately.
 */
export function getMcpSkillCommands(
  mcpCommands: readonly Command[],
): readonly Command[] {
  if (feature('MCP_SKILLS')) {
    return mcpCommands.filter(
      cmd =>
        cmd.type === 'prompt' &&
        cmd.loadedFrom === 'mcp' &&
        !cmd.disableModelInvocation,
    )
  }
  return []
}

// SkillTool shows ALL prompt-based commands that the model can invoke
// This includes both skills (from /skills/) and commands (from /commands/)
export const getSkillToolCommands = memoize(
  async (cwd: string): Promise<Command[]> => {
    const allCommands = await getCommands(cwd)
    return allCommands.filter(
      cmd =>
        cmd.type === 'prompt' &&
        !cmd.disableModelInvocation &&
        cmd.source !== 'builtin' &&
        // Always include skills from /skills/ dirs, bundled skills, and legacy /commands/ entries
        // (they all get an auto-derived description from the first line if frontmatter is missing).
        // Plugin/MCP commands still require an explicit description to appear in the listing.
        (cmd.loadedFrom === 'bundled' ||
          cmd.loadedFrom === 'skills' ||
          cmd.loadedFrom === 'commands_DEPRECATED' ||
          cmd.hasUserSpecifiedDescription ||
          cmd.whenToUse),
    )
  },
)

// Filters commands to include only skills. Skills are commands that provide
// specialized capabilities for the model to use. They are identified by
// loadedFrom being 'skills', 'plugin', or 'bundled', or having disableModelInvocation set.
export const getSlashCommandToolSkills = memoize(
  async (cwd: string): Promise<Command[]> => {
    try {
      const allCommands = await getCommands(cwd)
      return allCommands.filter(
        cmd =>
          cmd.type === 'prompt' &&
          cmd.source !== 'builtin' &&
          (cmd.hasUserSpecifiedDescription || cmd.whenToUse) &&
          (cmd.loadedFrom === 'skills' ||
            cmd.loadedFrom === 'plugin' ||
            cmd.loadedFrom === 'bundled' ||
            cmd.disableModelInvocation),
      )
    } catch (error) {
      logError(toError(error))
      // Return empty array rather than throwing - skills are non-critical
      // This prevents skill loading failures from breaking the entire system
      logForDebugging('Returning empty skills array due to load failure')
      return []
    }
  },
)

/**
 * Commands that are safe to use in remote mode (--remote).
 * These only affect local TUI state and don't depend on local filesystem,
 * git, shell, IDE, MCP, or other local execution context.
 *
 * Used in two places:
 * 1. Pre-filtering commands in main.tsx before REPL renders (prevents race with CCR init)
 * 2. Preserving local-only commands in REPL's handleRemoteInit after CCR filters
 */
export const REMOTE_SAFE_COMMANDS: Set<Command> = new Set([
  session, // Shows QR code / URL for remote session
  exit, // Exit the TUI
  clear, // Clear screen
  help, // Show help
  theme, // Change terminal theme
  color, // Change agent color
  vim, // Toggle vim mode
  cost, // Show session cost (local cost tracking)
  usage, // Show usage info
  copy, // Copy last message
  btw, // Quick note
  plan, // Plan mode toggle
  keybindings, // Keybinding management
  statusline, // Status line toggle
  stickers, // Stickers
  mobile, // Mobile QR code
])

/**
 * Builtin commands of type 'local' that ARE safe to execute when received
 * over the Remote Control bridge. These produce text output that streams
 * back to the mobile/web client and have no terminal-only side effects.
 *
 * 'local-jsx' commands are blocked by type (they render Ink UI) and
 * 'prompt' commands are allowed by type (they expand to text sent to the
 * model) — this set only gates 'local' commands.
 *
 * When adding a new 'local' command that should work from mobile, add it
 * here. Default is blocked.
 */
export const BRIDGE_SAFE_COMMANDS: Set<Command> = new Set(
  [
    compact, // Shrink context — useful mid-session from a phone
    clear, // Wipe transcript
    cost, // Show session cost
    summary, // Summarize conversation
    files, // List tracked files
  ].filter((c): c is Command => c !== null),
)

/**
 * Whether a slash command is safe to execute when its input arrived over the
 * Remote Control bridge (mobile/web client).
 *
 * PR #19134 blanket-blocked all slash commands from bridge inbound because
 * `/model` from iOS was popping the local Ink picker. This predicate relaxes
 * that with an explicit allowlist: 'prompt' commands (skills) expand to text
 * and are safe by construction; 'local' commands need an explicit opt-in via
 * BRIDGE_SAFE_COMMANDS; 'local-jsx' commands render Ink UI and stay blocked.
 */
export function isBridgeSafeCommand(cmd: Command): boolean {
  if (cmd.type === 'local-jsx') return false
  if (cmd.type === 'prompt') return true
  return BRIDGE_SAFE_COMMANDS.has(cmd)
}

/**
 * Filter commands to only include those safe for remote mode.
 * Used to pre-filter commands when rendering the REPL in --remote mode,
 * preventing local-only commands from being briefly available before
 * the CCR init message arrives.
 */
export function filterCommandsForRemoteMode(commands: Command[]): Command[] {
  return commands.filter(cmd => REMOTE_SAFE_COMMANDS.has(cmd))
}

export function findCommand(
  commandName: string,
  commands: Command[],
): Command | undefined {
  return commands.find(
    _ =>
      _.name === commandName ||
      getCommandName(_) === commandName ||
      _.aliases?.includes(commandName),
  )
}

export function hasCommand(commandName: string, commands: Command[]): boolean {
  return findCommand(commandName, commands) !== undefined
}

export function getCommand(commandName: string, commands: Command[]): Command {
  const command = findCommand(commandName, commands)
  if (!command) {
    throw ReferenceError(
      `Command ${commandName} not found. Available commands: ${commands
        .map(_ => {
          const name = getCommandName(_)
          return _.aliases ? `${name} (aliases: ${_.aliases.join(', ')})` : name
        })
        .sort((a, b) => a.localeCompare(b))
        .join(', ')}`,
    )
  }

  return command
}

/**
 * Formats a command's description with its source annotation for user-facing UI.
 * Use this in typeahead, help screens, and other places where users need to see
 * where a command comes from.
 *
 * For model-facing prompts (like SkillTool), use cmd.description directly.
 */
export function formatDescriptionWithSource(cmd: Command): string {
  if (cmd.type !== 'prompt') {
    return cmd.description
  }

  if (cmd.kind === 'workflow') {
    return `${cmd.description} (workflow)`
  }

  if (cmd.source === 'plugin') {
    const pluginName = cmd.pluginInfo?.pluginManifest.name
    if (pluginName) {
      return `(${pluginName}) ${cmd.description}`
    }
    return `${cmd.description} (plugin)`
  }

  if (cmd.source === 'builtin' || cmd.source === 'mcp') {
    return cmd.description
  }

  if (cmd.source === 'bundled') {
    return `${cmd.description} (bundled)`
  }

  return `${cmd.description} (${getSettingSourceName(cmd.source)})`
}

let commandRegistryHostBindingsInstalled = false

export function installCommandRuntimeBindings(): void {
  if (commandRegistryHostBindingsInstalled) {
    return
  }

  installCommandRegistryHostBindings<Command>({
    getCommands,
    clearCommandMemoizationCaches,
    clearCommandsCache,
    getCommandName,
    isCommandEnabled,
    builtInCommandNames: () => builtInCommandNames(),
    findCommand,
    hasCommand,
    getCommand,
    getSkillToolCommands,
    getSlashCommandToolSkills,
    getMcpSkillCommands: mcpCommands => getMcpSkillCommands(mcpCommands),
    internalOnlyCommands: () => INTERNAL_ONLY_COMMANDS,
    remoteSafeCommands: () => REMOTE_SAFE_COMMANDS,
    bridgeSafeCommands: () => BRIDGE_SAFE_COMMANDS,
    isBridgeSafeCommand,
    filterCommandsForRemoteMode,
    formatDescriptionWithSource,
  })

  commandRegistryHostBindingsInstalled = true
}

installCommandRuntimeBindings()
