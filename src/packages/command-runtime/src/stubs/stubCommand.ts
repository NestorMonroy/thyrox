// Stub command shared across feature-disabled entry points.
//
// Replaces 17 individual src/commands/(name)/index.js stubs that were
// identical (ant-trace, autofix-pr, backfill-sessions, break-cache,
// bughunter, ctx_viz, debug-tool-call, env, good-claude, issue,
// mock-limits, oauth-refresh, onboarding, perf-issue, share, summary,
// teleport). The registry treats isHidden + isEnabled=false commands as
// absent, so callers see the same runtime behavior as before while the
// file count drops by 17.
//
// Es un `Command` completo y no un objeto suelto: los registros que lo alojan
// (`BRIDGE_SAFE_COMMANDS`, `INTERNAL_ONLY_COMMANDS`) están tipados como
// `Command`, y con la forma parcial ninguno compilaba.
import type { Command } from '@thyrox/agent/command.js'

const stub: Command = {
  type: 'local',
  name: 'stub',
  description: 'Disabled command',
  isEnabled: () => false,
  isHidden: true,
  supportsNonInteractive: false,
  load: () => Promise.reject(new Error('stub command is disabled and cannot be loaded')),
}

export default stub
