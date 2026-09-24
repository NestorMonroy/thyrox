/**
 * El motor de ejecución de hooks — reimplementación desde el binario 2.1.275.
 *
 * El CONTRATO lo fijan los llamadores del árbol (`toolHooks.ts`, `query.ts`,
 * `fileChangedWatcher.ts`, `worktree/index.ts`…): los nombres, las firmas y
 * los campos que leen de cada resultado. La CONDUCTA la fija el binario
 * (`chunk-q2gh92k2.js`: `sT` = executeHooksOutsideREPL, `y$r`/`rBn` = el
 * matcher, `Tse` = PreCompact, `Rse` = el timeout de SessionEnd) y la
 * referencia de salida `_references/hook-output-control.md`.
 *
 * Los hooks son comandos `bash` reales, no dobles: lo que se prueba es que el
 * motor lea exit codes, stdout y stderr como el cliente.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import {
  createBaseHookInput,
  executeCwdChangedHooks,
  executeFileChangedHooks,
  executeHooksOutsideREPL,
  executePostToolBatchHooks,
  executePreCompactHooks,
  executePreToolHooks,
  executeWorktreeCreateHook,
  executeWorktreeRemoveHook,
  getSessionEndHookTimeoutMs,
  hasBlockingResult,
  hasWorktreeCreateHook,
  hookMatcherMatches,
  SESSION_END_HOOK_TIMEOUT_MS_DEFAULT,
} from '../hooks.ts'
import {
  resetHooksConfigSnapshot,
  setHooksConfigSnapshot,
} from '../hooksConfigSnapshot.ts'

const cmd = (command: string, extra: Record<string, unknown> = {}) => ({
  type: 'command',
  command,
  ...extra,
})

function context() {
  const abortController = new AbortController()
  return {
    abortController,
    getAppState: () => ({ toolPermissionContext: { mode: 'default' } }),
  }
}

async function collect<T>(gen: AsyncGenerator<T>): Promise<T[]> {
  const out: T[] = []
  for await (const r of gen) out.push(r)
  return out
}

beforeEach(() => resetHooksConfigSnapshot())
afterEach(() => {
  resetHooksConfigSnapshot()
  delete process.env.CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS
})

describe('hookMatcherMatches — el matcher del cliente', () => {
  test('vacío o * casan con todo', () => {
    expect(hookMatcherMatches(undefined, 'Write')).toBe(true)
    expect(hookMatcherMatches('', 'Write')).toBe(true)
    expect(hookMatcherMatches('*', 'Write')).toBe(true)
  })
  test('una lista simple es pertenencia exacta, no subcadena', () => {
    expect(hookMatcherMatches('Write|Edit', 'Edit')).toBe(true)
    expect(hookMatcherMatches('Write|Edit', 'MultiEdit')).toBe(false)
  })
  test('lo demás es una regex sin anclar', () => {
    expect(hookMatcherMatches('mcp__.*', 'mcp__github__get')).toBe(true)
    expect(hookMatcherMatches('Bash(', 'Bash')).toBe(false)
  })
})

describe('createBaseHookInput', () => {
  test('lleva sesión, transcript, cwd y el modo de permiso pedido', () => {
    const base = createBaseHookInput('plan')
    expect(typeof base.session_id).toBe('string')
    expect(typeof base.transcript_path).toBe('string')
    expect(base.cwd).toBe(process.cwd())
    expect(base.permission_mode).toBe('plan')
  })
})

describe('executeHooksOutsideREPL — exit codes y JSON', () => {
  const input = { ...createBaseHookInput(), hook_event_name: 'ConfigChange' }

  test('sin hooks configurados no corre nada', async () => {
    expect(await executeHooksOutsideREPL({ hookInput: input })).toEqual([])
  })
  test('exit 0: éxito con stdout como salida', async () => {
    setHooksConfigSnapshot({ ConfigChange: [{ hooks: [cmd("printf 'hecho'")] }] })
    const [r] = await executeHooksOutsideREPL({ hookInput: input })
    expect(r).toMatchObject({ succeeded: true, blocked: false, output: 'hecho', exitCode: 0 })
  })
  test('exit 2: bloquea y la razón es el stderr', async () => {
    setHooksConfigSnapshot({ ConfigChange: [{ hooks: [cmd("echo no >&2; exit 2")] }] })
    const [r] = await executeHooksOutsideREPL({ hookInput: input })
    expect(r).toMatchObject({ succeeded: false, blocked: true, output: 'no\n' })
    expect(hasBlockingResult([r!])).toBe(true)
  })
  test('otro exit: falla SIN bloquear', async () => {
    setHooksConfigSnapshot({ ConfigChange: [{ hooks: [cmd("echo roto >&2; exit 1")] }] })
    const [r] = await executeHooksOutsideREPL({ hookInput: input })
    expect(r).toMatchObject({ succeeded: false, blocked: false })
    expect(hasBlockingResult([r!])).toBe(false)
  })
  test('decision block en JSON bloquea con su reason; watchPaths y systemMessage viajan', async () => {
    const json = JSON.stringify({ decision: 'block', reason: 'política', systemMessage: 'aviso', hookSpecificOutput: { watchPaths: ['/a'] } })
    setHooksConfigSnapshot({ ConfigChange: [{ hooks: [cmd(`printf '%s' '${json}'`)] }] })
    const [r] = await executeHooksOutsideREPL({ hookInput: input })
    expect(r).toMatchObject({ blocked: true, output: 'política', systemMessage: 'aviso', watchPaths: ['/a'] })
  })
  test('el hook recibe el input por stdin', async () => {
    setHooksConfigSnapshot({ ConfigChange: [{ hooks: [cmd('cat')] }] })
    const [r] = await executeHooksOutsideREPL({ hookInput: { ...input, marca: 'x1' } })
    expect(JSON.parse(r!.output)).toMatchObject({ hook_event_name: 'ConfigChange', marca: 'x1' })
  })
  test('el matcher filtra por matchQuery', async () => {
    setHooksConfigSnapshot({ ConfigChange: [{ matcher: 'skills', hooks: [cmd('true')] }] })
    expect(await executeHooksOutsideREPL({ hookInput: input, matchQuery: 'otra' })).toEqual([])
    expect(await executeHooksOutsideREPL({ hookInput: input, matchQuery: 'skills' })).toHaveLength(1)
  })
  test('un hook colgado se corta por su timeout y no bloquea', async () => {
    setHooksConfigSnapshot({ ConfigChange: [{ hooks: [cmd('sleep 5', { timeout: 0.2 })] }] })
    const [r] = await executeHooksOutsideREPL({ hookInput: input })
    expect(r).toMatchObject({ succeeded: false, blocked: false })
  })
})

describe('executeHooks — el agregado que lee el bucle', () => {
  test('PreToolUse: permissionDecision deny llega como permissionBehavior con su razón', async () => {
    const json = JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: 'no' } })
    setHooksConfigSnapshot({ PreToolUse: [{ matcher: 'Bash', hooks: [cmd(`printf '%s' '${json}'`)] }] })
    const rs = await collect(executePreToolHooks('Bash', 'tu1', { command: 'ls' }, context(), 'default'))
    const r = rs.find((x: any) => x.permissionBehavior)
    expect(r).toMatchObject({ permissionBehavior: 'deny', hookPermissionDecisionReason: 'no' })
  })
  test('PreToolUse: exit 2 es un blockingError con el comando', async () => {
    setHooksConfigSnapshot({ PreToolUse: [{ hooks: [cmd('echo peligro >&2; exit 2')] }] })
    const rs = await collect(executePreToolHooks('Bash', 'tu1', {}, context(), 'default'))
    expect(rs.find((x: any) => x.blockingError)).toMatchObject({
      blockingError: { blockingError: 'peligro', command: 'echo peligro >&2; exit 2' },
    })
  })
  test('PreToolUse: updatedInput y continue:false', async () => {
    const json = JSON.stringify({ continue: false, stopReason: 'alto', hookSpecificOutput: { hookEventName: 'PreToolUse', updatedInput: { command: 'pwd' } } })
    setHooksConfigSnapshot({ PreToolUse: [{ hooks: [cmd(`printf '%s' '${json}'`)] }] })
    const rs = await collect(executePreToolHooks('Bash', 'tu1', { command: 'ls' }, context(), 'default'))
    expect(rs.find((x: any) => x.updatedInput)).toMatchObject({ updatedInput: { command: 'pwd' } })
    expect(rs.find((x: any) => x.preventContinuation)).toMatchObject({ preventContinuation: true, stopReason: 'alto' })
  })
  test('PreToolUse: un matcher que no casa no corre', async () => {
    setHooksConfigSnapshot({ PreToolUse: [{ matcher: 'Write', hooks: [cmd('exit 2')] }] })
    expect(await collect(executePreToolHooks('Bash', 'tu1', {}, context(), 'default'))).toEqual([])
  })
  test('PostToolBatch: recibe tool_calls y devuelve additionalContexts', async () => {
    const script = `node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const i=JSON.parse(s);process.stdout.write(JSON.stringify({hookSpecificOutput:{hookEventName:"PostToolBatch",additionalContext:"n="+i.tool_calls.length}}))})'`
    setHooksConfigSnapshot({ PostToolBatch: [{ hooks: [cmd(script)] }] })
    const calls = [{ tool_name: 'Bash', tool_input: {}, tool_use_id: 'a' }, { tool_name: 'Read', tool_input: {}, tool_use_id: 'b' }]
    const rs = await collect(executePostToolBatchHooks(calls, context(), 'default', new AbortController().signal))
    expect(rs.flatMap((x: any) => x.additionalContexts ?? [])).toEqual(['n=2'])
  })
})

describe('eventos fuera del bucle', () => {
  test('CwdChanged junta resultados, watchPaths y systemMessages', async () => {
    const json = JSON.stringify({ systemMessage: 'cambió', hookSpecificOutput: { hookEventName: 'CwdChanged', watchPaths: ['/w'] } })
    setHooksConfigSnapshot({ CwdChanged: [{ hooks: [cmd(`printf '%s' '${json}'`)] }] })
    const r = await executeCwdChangedHooks('/a', '/b')
    expect(r.watchPaths).toEqual(['/w'])
    expect(r.systemMessages).toEqual(['cambió'])
    expect(r.results).toHaveLength(1)
  })
  test('FileChanged casa por nombre de archivo', async () => {
    setHooksConfigSnapshot({ FileChanged: [{ matcher: '.envrc', hooks: [cmd('true')] }] })
    expect((await executeFileChangedHooks('/p/.envrc', 'change')).results).toHaveLength(1)
    expect((await executeFileChangedHooks('/p/otro', 'change')).results).toHaveLength(0)
  })
  test('PreCompact: la salida exitosa se vuelve instrucción nueva', async () => {
    setHooksConfigSnapshot({ PreCompact: [{ hooks: [cmd("printf 'resume corto'")] }] })
    const r = await executePreCompactHooks({ trigger: 'manual', customInstructions: null }, new AbortController().signal)
    expect(r.newCustomInstructions).toBe('resume corto')
    expect(r.userDisplayMessage).toContain('completed successfully')
  })
  test('WorktreeCreate: sin hook no hay; con hook, la ruta es su stdout', async () => {
    expect(hasWorktreeCreateHook()).toBe(false)
    await expect(executeWorktreeCreateHook('slug')).rejects.toThrow()
    setHooksConfigSnapshot({ WorktreeCreate: [{ hooks: [cmd("printf '/tmp/arbol\\n'")] }] })
    expect(hasWorktreeCreateHook()).toBe(true)
    expect(await executeWorktreeCreateHook('slug')).toEqual({ worktreePath: '/tmp/arbol' })
  })
  test('WorktreeRemove: false sin hook, true si corrió', async () => {
    expect(await executeWorktreeRemoveHook('/tmp/arbol')).toBe(false)
    setHooksConfigSnapshot({ WorktreeRemove: [{ hooks: [cmd('true')] }] })
    expect(await executeWorktreeRemoveHook('/tmp/arbol')).toBe(true)
  })
  test('SessionEnd: la variable manda; si no, el mayor timeout declarado con piso y techo', () => {
    expect(getSessionEndHookTimeoutMs()).toBe(SESSION_END_HOOK_TIMEOUT_MS_DEFAULT)
    setHooksConfigSnapshot({ SessionEnd: [{ hooks: [cmd('true', { timeout: 30 })] }] })
    expect(getSessionEndHookTimeoutMs()).toBe(30_000)
    setHooksConfigSnapshot({ SessionEnd: [{ hooks: [cmd('true', { timeout: 900 })] }] })
    expect(getSessionEndHookTimeoutMs()).toBe(60_000)
    process.env.CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS = '4321'
    expect(getSessionEndHookTimeoutMs()).toBe(4321)
  })
})
