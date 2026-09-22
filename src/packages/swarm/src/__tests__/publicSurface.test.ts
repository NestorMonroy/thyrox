import { describe, expect, test } from 'bun:test'
import {
  IT2_COMMAND,
  It2SetupPrompt,
  buildInheritedEnvVars,
  createAgentWorktree,
  createTeammatePaneInSwarmView,
  findTeammateTaskByAgentId,
  generateSandboxRequestId,
  generateTmuxSessionName,
  getCurrentWorktreeSession,
  getHardcodedTeammateModelFallback,
  getLeaderToolUseConfirmQueue,
  getRunningTeammatesSorted,
  initializeTeammateContextFromSession,
  initializeTeammateHooks,
  isInsideTmux,
  isSwarmWorker,
  markMessagesAsRead,
  pollForResponse,
  readUnreadMessages,
  registerLeaderToolUseConfirmQueue,
  sendPermissionRequestViaMailbox,
  validateWorktreeSlug,
  worktreeBranchName,
  writeToMailbox,
} from '../index.js'

describe('@thyrox/swarm public surface', () => {
  test('publishes the canonical implementations already present in the package', () => {
    const functions = [
      It2SetupPrompt,
      buildInheritedEnvVars,
      createAgentWorktree,
      createTeammatePaneInSwarmView,
      findTeammateTaskByAgentId,
      generateSandboxRequestId,
      generateTmuxSessionName,
      getCurrentWorktreeSession,
      getHardcodedTeammateModelFallback,
      getLeaderToolUseConfirmQueue,
      getRunningTeammatesSorted,
      initializeTeammateContextFromSession,
      initializeTeammateHooks,
      isInsideTmux,
      isSwarmWorker,
      markMessagesAsRead,
      pollForResponse,
      readUnreadMessages,
      registerLeaderToolUseConfirmQueue,
      sendPermissionRequestViaMailbox,
      validateWorktreeSlug,
      worktreeBranchName,
      writeToMailbox,
    ]

    expect(functions.every(value => typeof value === 'function')).toBe(true)
    expect(IT2_COMMAND).toBe('it2')
  })
})
