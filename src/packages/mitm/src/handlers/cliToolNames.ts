/**
 * Los nombres de herramienta en la forma del CLI: en minúsculas los usan los
 * clientes de terceros; el CLI los escribe en TitleCase. La tabla va del
 * primero al segundo.
 *
 * Porte de `omniroute: open-sse/services/claudeCodeToolRemapper.ts`
 * (`TOOL_RENAME_MAP`) y de `claudeCodeExtraRemap.ts` (MIT).
 */
export const CLI_TOOL_NAMES: Readonly<Record<string, string>> = {
  subagents: 'SubDispatch',
  session_status: 'CheckStatus',
  bash: 'Bash',
  read: 'Read',
  write: 'Write',
  edit: 'Edit',
  glob: 'Glob',
  grep: 'Grep',
  task: 'Task',
  agent: 'Agent',
  webfetch: 'WebFetch',
  websearch: 'WebSearch',
  todowrite: 'TodoWrite',
  todoread: 'TodoRead',
  question: 'Question',
  askuserquestion: 'AskUserQuestion',
  skill: 'Skill',
  slashcommand: 'SlashCommand',
  multiedit: 'MultiEdit',
  notebook: 'Notebook',
  notebookedit: 'NotebookEdit',
  notebookread: 'NotebookRead',
  lsp: 'Lsp',
  apply_patch: 'ApplyPatch',
  applypatch: 'ApplyPatch',
  bashoutput: 'BashOutput',
  killshell: 'KillShell',
  killbash: 'KillBash',
  enterplanmode: 'EnterPlanMode',
  exitplanmode: 'ExitPlanMode',
  enterworktree: 'EnterWorktree',
  exitworktree: 'ExitWorktree',
  artifact: 'Artifact',
  designsync: 'DesignSync',
  monitor: 'Monitor',
  sendmessage: 'SendMessage',
  listagents: 'ListAgents',
  pushnotification: 'PushNotification',
  reportfindings: 'ReportFindings',
  schedulewakeup: 'ScheduleWakeup',
  croncreate: 'CronCreate',
  crondelete: 'CronDelete',
  cronlist: 'CronList',
  taskoutput: 'TaskOutput',
  taskstop: 'TaskStop',
  taskcreate: 'TaskCreate',
  taskupdate: 'TaskUpdate',
  tasklist: 'TaskList',
  taskget: 'TaskGet',
  workflow: 'Workflow',
}

/** Un texto JSON con cada `"name": "<herramienta>"` en la forma del CLI. */
export function withCliToolNames(text: string): string {
  let named = text
  for (const [lower, cli] of Object.entries(CLI_TOOL_NAMES)) {
    named = named.replace(new RegExp(`"name"\\s*:\\s*"${lower}"`, 'g'), `"name":"${cli}"`)
  }
  return named
}
