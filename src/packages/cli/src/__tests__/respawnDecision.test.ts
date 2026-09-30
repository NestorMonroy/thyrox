import { describe, expect, test } from 'bun:test'

import {
  decideRespawnArgs,
  decideRevivalEnv,
  INTERACTIVE_LINEAGE_MAX_AGE_MS,
  isRevivalGuardEnabled,
  RESPAWN_MESSAGES,
  type RespawnDispatch,
  VERSION_STALENESS_STAMP,
} from '../bg/respawnDecision.js'

describe('decideRespawnArgs', () => {
  test('exec mode returns the launch args verbatim, ignoring attempt', () => {
    const dispatch: RespawnDispatch = {
      sessionId: 'sess-1',
      launch: { mode: 'exec', args: ['run', 'this'] },
    }
    expect(decideRespawnArgs(dispatch, 3, true, 'sess-1', undefined, ['--model', 'x'])).toEqual([
      'run',
      'this',
    ])
  })

  test('attempt > 1 with messages resumes from the live transcript path', () => {
    const dispatch: RespawnDispatch = {
      sessionId: 'sess-1',
      launch: { mode: 'prompt', args: ['do the thing'] },
    }
    expect(
      decideRespawnArgs(dispatch, 2, true, 'sess-1', '/tmp/live.jsonl', ['--model', 'sonnet']),
    ).toEqual(['--resume', '/tmp/live.jsonl', '--model', 'sonnet'])
  })

  test('attempt > 1 with messages falls back to resumeSessionId without a live transcript', () => {
    const dispatch: RespawnDispatch = {
      sessionId: 'sess-1',
      launch: { mode: 'prompt', args: ['do the thing'] },
    }
    expect(decideRespawnArgs(dispatch, 2, true, 'sess-2', undefined, [])).toEqual([
      '--resume',
      'sess-2',
    ])
  })

  test('strips --environment and --pool (and their values) from respawnFlags', () => {
    const dispatch: RespawnDispatch = {
      sessionId: 'sess-1',
      launch: { mode: 'prompt', args: [] },
    }
    expect(
      decideRespawnArgs(dispatch, 2, true, 'sess-1', 'live.jsonl', [
        '--environment',
        'staging',
        '--model',
        'sonnet',
        '--pool=default',
      ]),
    ).toEqual(['--resume', 'live.jsonl', '--model', 'sonnet'])
  })

  test('attempt > 1 without messages, resumeSessionId != dispatch.sessionId switches session id', () => {
    const dispatch: RespawnDispatch = {
      sessionId: 'sess-1',
      launch: { mode: 'prompt', args: [] },
    }
    expect(decideRespawnArgs(dispatch, 2, false, 'sess-2', undefined, ['--model', 'sonnet'])).toEqual([
      '--session-id',
      'sess-2',
      '--model',
      'sonnet',
    ])
  })

  test('resume mode with fork prefixes --session-id/--fork-session', () => {
    const dispatch: RespawnDispatch = {
      sessionId: 'sess-1',
      launch: {
        mode: 'resume',
        sessionId: 'orig-sess',
        fork: true,
        transcriptPath: '/tmp/orig.jsonl',
        flagArgs: ['--model', 'sonnet'],
      },
    }
    expect(decideRespawnArgs(dispatch, 1, false, 'sess-1', undefined, [])).toEqual([
      '--session-id',
      'sess-1',
      '--fork-session',
      '--resume',
      '/tmp/orig.jsonl',
      '--model',
      'sonnet',
    ])
  })

  test('resume mode without fork just resumes, falling back to launch.sessionId', () => {
    const dispatch: RespawnDispatch = {
      sessionId: 'sess-1',
      launch: { mode: 'resume', sessionId: 'orig-sess', flagArgs: [] },
    }
    expect(decideRespawnArgs(dispatch, 1, false, 'sess-1', undefined, [])).toEqual([
      '--resume',
      'orig-sess',
    ])
  })

  test('default (prompt mode, first attempt) returns launch.args filtered', () => {
    const dispatch: RespawnDispatch = {
      sessionId: 'sess-1',
      launch: { mode: 'prompt', args: ['--model', 'sonnet', '--pool', 'x', 'the directive'] },
    }
    expect(decideRespawnArgs(dispatch, 1, false, 'sess-1', undefined, [])).toEqual([
      '--model',
      'sonnet',
      'the directive',
    ])
  })
})

describe('VERSION_STALENESS_STAMP', () => {
  test('matches the reference stamp (Je, chunk-ygx717jg.js)', () => {
    expect(VERSION_STALENESS_STAMP).toEqual({
      release: '2.1.213',
      commitMs: Date.UTC(2026, 6, 16, 18, 0, 5),
    })
  })
})

describe('RESPAWN_MESSAGES', () => {
  test('autoRestartContinuation matches the reference (kt, chunk-ygx717jg.js)', () => {
    expect(RESPAWN_MESSAGES.autoRestartContinuation).toBe(
      'Continue from where you left off. Note: this session was automatically restarted after its process exited unexpectedly; the user has not sent a new message since the restart. Re-verify anything time-sensitive (branch state, running processes, prior partial work) before continuing.',
    )
  })

  test('sessionIdCollision matches the reference (We, chunk-ygx717jg.js)', () => {
    expect(RESPAWN_MESSAGES.sessionIdCollision).toBe(
      'session ID already belongs to another conversation — open again to start with a new ID',
    )
  })
})

describe('isRevivalGuardEnabled', () => {
  test('defaults to true (no gate backend; ref $e default via x())', () => {
    expect(isRevivalGuardEnabled()).toBe(true)
  })
})

describe('decideRevivalEnv', () => {
  test('null when attempt is 1 (not a respawn)', () => {
    expect(
      decideRevivalEnv({
        attempt: 1,
        hasMessages: true,
        isUpgradeRespawn: false,
        interactiveLineage: false,
      }),
    ).toBeNull()
  })

  test('null when the resumed transcript has no messages', () => {
    expect(
      decideRevivalEnv({
        attempt: 2,
        hasMessages: false,
        isUpgradeRespawn: false,
        interactiveLineage: false,
      }),
    ).toBeNull()
  })

  test('null when the respawn was triggered by an upgrade, not a crash', () => {
    expect(
      decideRevivalEnv({
        attempt: 2,
        hasMessages: true,
        isUpgradeRespawn: true,
        interactiveLineage: false,
      }),
    ).toBeNull()
  })

  test('sets CLAUDE_CODE_RESUME_INTERRUPTED_TURN and the guarded prompt on a genuine crash respawn', () => {
    expect(
      decideRevivalEnv({
        attempt: 2,
        hasMessages: true,
        isUpgradeRespawn: false,
        interactiveLineage: false,
      }),
    ).toEqual({
      CLAUDE_CODE_RESUME_INTERRUPTED_TURN: '1',
      CLAUDE_CODE_RESUME_PROMPT: RESPAWN_MESSAGES.autoRestartContinuation,
    })
  })

  test('adds the max-age env var only for interactive lineage', () => {
    expect(
      decideRevivalEnv({
        attempt: 2,
        hasMessages: true,
        isUpgradeRespawn: false,
        interactiveLineage: true,
      }),
    ).toEqual({
      CLAUDE_CODE_RESUME_INTERRUPTED_TURN: '1',
      CLAUDE_CODE_RESUME_PROMPT: RESPAWN_MESSAGES.autoRestartContinuation,
      CLAUDE_CODE_RESUME_INTERRUPTED_TURN_MAX_AGE_MS: String(INTERACTIVE_LINEAGE_MAX_AGE_MS),
    })
  })
})
