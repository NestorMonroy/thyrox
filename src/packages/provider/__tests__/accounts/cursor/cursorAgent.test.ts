/**
 * El proceso `cursor-agent`: se lanza con stdin cerrado, porque con un
 * descriptor en tubería espera entrada; un plazo lo termina con SIGTERM y,
 * si lo ignora, con SIGKILL. Su catálogo de modelos se lee de `--list-models`.
 *
 * Porte de `omniroute: src/lib/providerModels/cursorAgent.ts` (MIT).
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { fetchCursorAgentModels, humanizeCursorModelId, parseCursorAgentModels, resolveCursorAgentBinary, runCursorAgent } from '../../../src/accounts/cursor/cursorAgent.ts'

const dirs: string[] = []
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})
function script(body: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'cursor-agent-'))
  dirs.push(dir)
  const path = join(dir, 'cursor-agent')
  writeFileSync(path, `#!/bin/sh\n${body}\n`)
  chmodSync(path, 0o755)
  return path
}

describe('running cursor-agent', () => {
  test('collects its output and exit code, with stdin closed', async () => {
    const binary = script('read line && echo "read:$line"; echo "args:$*"; echo err 1>&2; exit 3')
    expect(await runCursorAgent(binary, ['--list-models'], 5000)).toEqual({ stdout: 'args:--list-models\n', stderr: 'err\n', code: 3, signal: null })
  })

  test('a process past its deadline is terminated', async () => {
    const outcome = await runCursorAgent(script('exec sleep 5'), [], 100)
    expect(outcome.signal).toBe('SIGTERM')
  })

  test('one that ignores SIGTERM is killed when a follow-up is declared', async () => {
    const binary = script("trap '' TERM; i=0; while [ $i -lt 50 ]; do sleep 0.1; i=$((i+1)); done")
    const outcome = await runCursorAgent(binary, [], 100, { sigkillFollowupMs: 100 })
    expect(outcome.signal).toBe('SIGKILL')
  }, 4000)

  test('a binary that cannot be spawned rejects', async () => {
    await expect(runCursorAgent('/nonexistent/cursor-agent', [], 1000)).rejects.toThrow()
  })
})

describe('finding the cursor-agent binary', () => {
  test('the fixed locations come first, then PATH unless disallowed', () => {
    const present = new Set(['/h/.local/bin/cursor-agent', '/usr/bin/cursor-agent', '/p2/cursor-agent'])
    const exists = (path: string) => present.has(path)
    expect(resolveCursorAgentBinary({ home: '/h', exists, path: '/p1:/p2' })).toBe('/h/.local/bin/cursor-agent')
    present.delete('/h/.local/bin/cursor-agent')
    expect(resolveCursorAgentBinary({ home: '/h', exists, path: '/p1:/p2' })).toBe('/usr/bin/cursor-agent')
    present.delete('/usr/bin/cursor-agent')
    expect(resolveCursorAgentBinary({ home: '/h', exists, path: '/p1:/p2' })).toBe('/p2/cursor-agent')
    expect(resolveCursorAgentBinary({ home: '/h', exists, path: '/p1:/p2', allowPathFallback: false })).toBeNull()
    expect(resolveCursorAgentBinary({ home: '/h', exists, path: '' })).toBeNull()
  })
})

describe('the cursor-agent model catalog', () => {
  test('is parsed from the current and the legacy formats, without duplicates', () => {
    expect(parseCursorAgentModels('Available models\n\nauto - Auto (default)\ngpt-5.3-codex - Codex 5.3\nauto - again\nTip: run --help\nlate - x')).toEqual(['auto', 'gpt-5.3-codex'])
    expect(parseCursorAgentModels('Error: Available models: a, b , a,')).toEqual(['a', 'b'])
    expect(parseCursorAgentModels('nothing here')).toEqual([])
  })

  test('ids read as names', () => {
    expect(humanizeCursorModelId('auto')).toBe('Auto (Server Picks)')
    expect(humanizeCursorModelId('gemini-2-5-pro')).toBe('Gemini 2.5 Pro')
    expect(humanizeCursorModelId('gpt-5-mini-high')).toBe('GPT 5 Mini High')
    expect(humanizeCursorModelId('composer-beta')).toBe('Composer Beta')
  })

  test('is fetched from --list-models', async () => {
    const binary = script('echo "Available models"; echo; echo "auto - Auto"; echo "gpt-5 - GPT 5"')
    expect(await fetchCursorAgentModels({ binary })).toEqual([{ id: 'auto', name: 'Auto (Server Picks)', owned_by: 'cursor' }, { id: 'gpt-5', name: 'GPT 5', owned_by: 'cursor' }])
  })

  test('an old release is asked with --model --help', async () => {
    const binary = script('if [ "$1" = "--model" ]; then echo "Available models: a, b"; fi')
    expect((await fetchCursorAgentModels({ binary })).map(model => model.id)).toEqual(['a', 'b'])
  })

  test('an unauthenticated agent and an empty catalog are errors', async () => {
    await expect(fetchCursorAgentModels({ binary: script('echo "Not logged in"') })).rejects.toThrow('cursor-agent is not authenticated')
    await expect(fetchCursorAgentModels({ binary: script('true') })).rejects.toThrow('did not return a model catalog')
  })

  test('without a declared binary it is looked up', async () => {
    const binary = script('echo "Available models: z"')
    expect((await fetchCursorAgentModels({ resolveBinary: () => binary })).map(model => model.id)).toEqual(['z'])
  })

  test('without a binary it says how to install one', async () => {
    await expect(fetchCursorAgentModels({ binary: '', resolveBinary: () => null })).rejects.toThrow('cursor-agent binary not found')
  })

  test('a binary that is not executable is named', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'cursor-agent-'))
    dirs.push(dir)
    mkdirSync(join(dir, 'x'))
    await expect(fetchCursorAgentModels({ binary: join(dir, 'missing') })).rejects.toThrow(`cursor-agent binary not executable at ${join(dir, 'missing')}`)
  })
})
