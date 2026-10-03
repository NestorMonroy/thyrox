/**
 * TASK-THYROX-0636 — todo panel que el backend de tmux crea arranca con la
 * orden de relleno (`-- cat`), no con un shell.
 *
 * Procedencia: `Vjo` en `chunk-rc3494v9.js` (2.1.283). Sus cinco sitios de
 * creación —`new-session`, `new-window` y tres `split-window`— cierran con
 * `"--", vFe`. La orden fija el proceso del panel hasta que el `respawn-pane`
 * de `sendCommandToPane` lo sustituye por la orden real del compañero.
 *
 * Métrica: los argumentos exactos que `TmuxBackend` entrega a tmux, contra un
 * doble de `execFileNoThrow` que responde como tmux.
 * Ciega a: si un tmux real acepta `-- cat` en cada subcomando.
 */
import { beforeEach, describe, expect, test } from 'bun:test'

type Call = string[]
let calls: Call[] = []
let sessionExists = false
let windows = ''
let panes = '%1'

async function install(): Promise<void> {
  const m = await import('../src/adapters/appRuntime.ts')
  const map: Record<string, unknown> = {}
  for (const n of m.SWARM_FUNCTION_BINDINGS) map[n] = () => undefined
  for (const n of m.SWARM_VALUE_BINDINGS) map[n] = ''
  map.logForDebugging = () => undefined
  map.logError = () => undefined
  map.count = (xs: unknown[], p: (x: unknown) => boolean) => xs.filter(p).length
  map.sleep = () => Promise.resolve()
  map.execFileNoThrow = async (_cmd: string, args: string[]) => {
    calls.push(args)
    const sub = args.find(a =>
      [
        'has-session',
        'new-session',
        'new-window',
        'split-window',
        'list-windows',
        'list-panes',
        'display-message',
      ].includes(a),
    )
    if (sub === 'has-session')
      return { code: sessionExists ? 0 : 1, stdout: '', stderr: '' }
    if (sub === 'display-message')
      return { code: 0, stdout: '%0', stderr: '' }
    if (sub === 'list-windows') return { code: 0, stdout: windows, stderr: '' }
    if (sub === 'list-panes') return { code: 0, stdout: panes, stderr: '' }
    if (sub === 'new-session' || sub === 'new-window' || sub === 'split-window')
      return { code: 0, stdout: '%9', stderr: '' }
    return { code: 0, stdout: '', stderr: '' }
  }
  m.installSwarmAppRuntime(map as never)
}

function tail(sub: string): string[] | undefined {
  const call = calls.find(c => c.includes(sub))
  return call?.slice(-2)
}

async function backend(inside: boolean) {
  const mod = await import('../src/backends/TmuxBackend.ts')
  mod._test_resetTmuxBackendState()
  const b = new mod.TmuxBackend()
  b.isRunningInside = async () => inside
  return b
}

beforeEach(async () => {
  calls = []
  sessionExists = false
  windows = ''
  panes = '%1'
  await install()
})

describe('TmuxBackend: orden de relleno en cada panel nuevo', () => {
  test('1. new-session cierra con -- cat', async () => {
    const b = await backend(false)
    await b.createTeammatePaneInSwarmView('ana', 'blue' as never)
    expect(tail('new-session')).toEqual(['--', 'cat'])
  })

  test('2. new-window cierra con -- cat', async () => {
    sessionExists = true
    windows = 'otra'
    const b = await backend(false)
    await b.createTeammatePaneInSwarmView('ana', 'blue' as never)
    expect(tail('new-window')).toEqual(['--', 'cat'])
  })

  test('3. split-window externo cierra con -- cat', async () => {
    sessionExists = true
    windows = 'swarm-view'
    panes = '%1\n%2'
    const b = await backend(false)
    await b.createTeammatePaneInSwarmView('ana', 'blue' as never)
    expect(tail('split-window')).toEqual(['--', 'cat'])
  })

  test('4. split-window con líder (primero y siguientes) cierra con -- cat', async () => {
    panes = '%0'
    const b = await backend(true)
    await b.createTeammatePaneInSwarmView('ana', 'blue' as never)
    expect(tail('split-window')).toEqual(['--', 'cat'])

    calls = []
    panes = '%0\n%5'
    await b.createTeammatePaneInSwarmView('bea', 'red' as never)
    expect(tail('split-window')).toEqual(['--', 'cat'])
  })
})
