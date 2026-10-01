import { describe, expect, test } from 'bun:test'

import {
  createDaemonOrphanPredicate,
  daemonContainerOwner,
  retireDaemonOrphanedWorkerContainers,
  type PodmanCommandResult,
  type PodmanExecutor,
  type PresentWorkerContainer,
  type WorkerContainerLifecycleDeps,
} from '../podman/workerContainerLifecycle.js'

const LIVE_DAEMON_PID = 4100
const DEAD_DAEMON_PID = 9999

function container(owner: PresentWorkerContainer['owner']): PresentWorkerContainer {
  return { present: true, status: 'running', pid: 77, owner, workerId: 'w1' }
}

const isOrphan = createDaemonOrphanPredicate(pid => pid === LIVE_DAEMON_PID)

describe('daemonContainerOwner', () => {
  test('el daemon se declara dueño de tipo daemon, con su PID como identificador y como PID', () => {
    expect(daemonContainerOwner(LIVE_DAEMON_PID)).toEqual({ kind: 'daemon', id: String(LIVE_DAEMON_PID), pid: LIVE_DAEMON_PID })
  })
})

describe('createDaemonOrphanPredicate — la política del daemon, intacta', () => {
  test('un contenedor de un daemon muerto es huérfano', () => {
    expect(isOrphan(container({ kind: 'daemon', id: 'd', pid: DEAD_DAEMON_PID }))).toBe(true)
  })

  test('un contenedor de un daemon vivo no es huérfano', () => {
    expect(isOrphan(container({ kind: 'daemon', id: 'd', pid: LIVE_DAEMON_PID }))).toBe(false)
  })

  test('un contenedor del pool nunca es huérfano para el daemon, aunque su PID esté muerto', () => {
    expect(isOrphan(container({ kind: 'pool', id: 'p', pid: DEAD_DAEMON_PID }))).toBe(false)
    expect(isOrphan(container({ kind: 'pool', id: 'p', pid: null }))).toBe(false)
  })

  test('sin etiquetas de dueño no se atribuye a ningún daemon vivo: es huérfano, como antes', () => {
    expect(isOrphan(container({ kind: null, id: null, pid: null }))).toBe(true)
  })

  test('un dueño daemon sin PID legible es huérfano', () => {
    expect(isOrphan(container({ kind: 'daemon', id: 'd', pid: null }))).toBe(true)
  })
})

describe('retireDaemonOrphanedWorkerContainers', () => {
  test('retira el contenedor del daemon muerto y deja el del pool', async () => {
    const inspections: Record<string, string> = {
      'thyrox-worker-dead': `running\t77\tdaemon\t${DEAD_DAEMON_PID}\t${DEAD_DAEMON_PID}\tdead`,
      'thyrox-worker-pooled': `running\t78\tpool\tp1\t${DEAD_DAEMON_PID}\tpooled`,
    }
    const calls: string[][] = []
    const podman: PodmanExecutor = {
      async run(args): Promise<PodmanCommandResult> {
        calls.push([...args])
        if (args[0] === 'ps') return { exitCode: 0, stdout: Object.keys(inspections).join('\n'), stderr: '' }
        if (args[0] === 'inspect') return { exitCode: 0, stdout: inspections[args.at(-1) ?? ''] ?? '', stderr: '' }
        return { exitCode: 0, stdout: '', stderr: '' }
      },
    }
    const deps: WorkerContainerLifecycleDeps = {
      podman, isProcessAlive: pid => pid === LIVE_DAEMON_PID, killProcess: () => {},
    }
    const retirements = await retireDaemonOrphanedWorkerContainers(deps, 1)
    expect(retirements.map(retirement => retirement.name)).toEqual(['thyrox-worker-dead'])
    expect(calls.filter(call => call[0] === 'rm')).toEqual([['rm', '--force', 'thyrox-worker-dead']])
  })
})
