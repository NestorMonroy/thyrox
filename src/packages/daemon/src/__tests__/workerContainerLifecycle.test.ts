import { describe, expect, test } from 'bun:test'

import {
  DAEMON_PID_LABEL_KEY,
  DEFAULT_STOP_TIMEOUT_SECONDS,
  InvalidWorkerContainerSpecError,
  WORKER_CONTAINER_NAME_PREFIX,
  WORKER_ID_LABEL_KEY,
  createWorkerContainer,
  createWorkerContainerArgv,
  findOrphanedWorkerContainers,
  inspectWorkerContainer,
  inspectWorkerContainerArgv,
  isWorkerContainerProcessAlive,
  listWorkerContainerNamesArgv,
  parseWorkerContainerInspection,
  removeWorkerContainer,
  removeWorkerContainerArgv,
  retireOrphanedWorkerContainers,
  retireWorkerContainer,
  stopWorkerContainer,
  stopWorkerContainerArgv,
  validateWorkerContainerSpec,
  workerContainerName,
  type PodmanCommandResult,
  type PodmanExecutor,
  type WorkerContainerLifecycleDeps,
  type WorkerContainerSpec,
} from '../podman/workerContainerLifecycle.js'

const OK: PodmanCommandResult = { exitCode: 0, stdout: '', stderr: '' }

/** Ejecutor de Podman de prueba: registra cada argv recibido y resuelve por una tabla de respuestas indexada por el primer argumento (el subcomando). */
function createFakePodmanExecutor(
  responses: Partial<Record<string, PodmanCommandResult>> = {},
): PodmanExecutor & { readonly calls: readonly (readonly string[])[] } {
  const calls: string[][] = []
  return {
    calls,
    async run(args: readonly string[]): Promise<PodmanCommandResult> {
      calls.push([...args])
      return responses[args[0]] ?? OK
    },
  }
}

function fakeDeps(
  podman: PodmanExecutor,
  aliveProcesses: readonly number[] = [],
): WorkerContainerLifecycleDeps & { readonly killedPids: readonly { pid: number; signal: NodeJS.Signals }[] } {
  const killedPids: { pid: number; signal: NodeJS.Signals }[] = []
  return {
    podman,
    isProcessAlive: pid => aliveProcesses.includes(pid),
    killProcess: (pid, signal) => {
      killedPids.push({ pid, signal })
    },
    killedPids,
  }
}

function baseSpec(overrides: Partial<WorkerContainerSpec> = {}): WorkerContainerSpec {
  return {
    workerId: 'w1',
    image: 'thyrox-worker:latest',
    daemonPid: 4242,
    resourceArgv: ['--cpus', '1'],
    ...overrides,
  }
}

describe('workerContainerName', () => {
  test('antepone el prefijo declarado al identificador del worker', () => {
    expect(workerContainerName('w1')).toBe(`${WORKER_CONTAINER_NAME_PREFIX}w1`)
  })
})

describe('validateWorkerContainerSpec — rehúsos', () => {
  test('un workerId vacío rehúsa nombrando el campo', () => {
    try {
      validateWorkerContainerSpec(baseSpec({ workerId: '' }))
      throw new Error('debía rehusar')
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidWorkerContainerSpecError)
      expect((error as InvalidWorkerContainerSpecError).field).toBe('workerId')
    }
  })

  test('un workerId con caracteres fuera del patrón seguro rehúsa', () => {
    try {
      validateWorkerContainerSpec(baseSpec({ workerId: 'w1 con espacio' }))
      throw new Error('debía rehusar')
    } catch (error) {
      expect((error as InvalidWorkerContainerSpecError).field).toBe('workerId')
    }
  })

  test('una imagen vacía rehúsa nombrando el campo', () => {
    try {
      validateWorkerContainerSpec(baseSpec({ image: '' }))
      throw new Error('debía rehusar')
    } catch (error) {
      expect((error as InvalidWorkerContainerSpecError).field).toBe('image')
    }
  })

  test('un daemonPid <= 0 rehúsa nombrando el campo', () => {
    try {
      validateWorkerContainerSpec(baseSpec({ daemonPid: 0 }))
      throw new Error('debía rehusar')
    } catch (error) {
      expect((error as InvalidWorkerContainerSpecError).field).toBe('daemonPid')
    }
  })

  test('un spec válido no rehúsa', () => {
    expect(() => validateWorkerContainerSpec(baseSpec())).not.toThrow()
  })
})

describe('createWorkerContainerArgv', () => {
  test('compone nombre, etiquetas de daemon y worker, límites de recursos e imagen', () => {
    expect(createWorkerContainerArgv(baseSpec())).toEqual([
      'create',
      '--name', `${WORKER_CONTAINER_NAME_PREFIX}w1`,
      '--label', `${DAEMON_PID_LABEL_KEY}=4242`,
      '--label', `${WORKER_ID_LABEL_KEY}=w1`,
      '--cpus', '1',
      'thyrox-worker:latest',
    ])
  })

  test('añade el comando declarado al final del argv', () => {
    const argv = createWorkerContainerArgv(baseSpec({ command: ['node', 'worker.js'] }))
    expect(argv.slice(-2)).toEqual(['node', 'worker.js'])
  })

  test('no emite ningún argumento cuando el spec es inválido', () => {
    expect(() => createWorkerContainerArgv(baseSpec({ image: '' }))).toThrow(InvalidWorkerContainerSpecError)
  })
})

describe('inspectWorkerContainerArgv / stopWorkerContainerArgv / removeWorkerContainerArgv', () => {
  test('inspect pide status, pid y las dos etiquetas en una sola llamada', () => {
    const argv = inspectWorkerContainerArgv('thyrox-worker-w1')
    expect(argv[0]).toBe('inspect')
    expect(argv).toContain('thyrox-worker-w1')
    expect(argv.join(' ')).toContain('.State.Status')
    expect(argv.join(' ')).toContain('.State.Pid')
    expect(argv.join(' ')).toContain(DAEMON_PID_LABEL_KEY)
    expect(argv.join(' ')).toContain(WORKER_ID_LABEL_KEY)
  })

  test('stop lleva el plazo declarado', () => {
    expect(stopWorkerContainerArgv('thyrox-worker-w1', 7)).toEqual(['stop', '--time', '7', 'thyrox-worker-w1'])
  })

  test('remove siempre fuerza el retiro', () => {
    expect(removeWorkerContainerArgv('thyrox-worker-w1')).toEqual(['rm', '--force', 'thyrox-worker-w1'])
  })

  test('listWorkerContainerNamesArgv filtra por el prefijo de nombre declarado', () => {
    const argv = listWorkerContainerNamesArgv()
    expect(argv).toContain(`name=^${WORKER_CONTAINER_NAME_PREFIX}`)
  })
})

describe('parseWorkerContainerInspection', () => {
  test('un contenedor ausente (exit != 0) no está presente', () => {
    expect(parseWorkerContainerInspection({ exitCode: 1, stdout: '', stderr: 'no such container' })).toEqual({
      present: false,
    })
  })

  test('un contenedor presente reporta status, pid y las dos etiquetas', () => {
    const result: PodmanCommandResult = { exitCode: 0, stdout: 'running\t555\t4242\tw1', stderr: '' }
    expect(parseWorkerContainerInspection(result)).toEqual({
      present: true,
      status: 'running',
      pid: 555,
      daemonPid: 4242,
      workerId: 'w1',
    })
  })

  test('una etiqueta ausente ("<no value>") se lee como null, no como texto literal', () => {
    const result: PodmanCommandResult = { exitCode: 0, stdout: 'exited\t0\t<no value>\t<no value>', stderr: '' }
    const inspection = parseWorkerContainerInspection(result)
    expect(inspection).toEqual({ present: true, status: 'exited', pid: 0, daemonPid: null, workerId: null })
  })
})

describe('isWorkerContainerProcessAlive — la vivacidad se mide sobre el PID, no sobre el status', () => {
  test('running + pid vivo => vivo', () => {
    expect(
      isWorkerContainerProcessAlive(
        { present: true, status: 'running', pid: 555, daemonPid: null, workerId: null },
        pid => pid === 555,
      ),
    ).toBe(true)
  })

  test('TASK-THYROX-0605: running reportado pero el PID ya no existe => NO vivo', () => {
    expect(
      isWorkerContainerProcessAlive(
        { present: true, status: 'running', pid: 555, daemonPid: null, workerId: null },
        () => false,
      ),
    ).toBe(false)
  })

  test('ausente => no vivo, sin llegar a consultar el PID', () => {
    let consulted = false
    expect(isWorkerContainerProcessAlive({ present: false }, () => ((consulted = true), true))).toBe(false)
    expect(consulted).toBe(false)
  })
})

describe('createWorkerContainer', () => {
  test('crea y arranca el contenedor cuando el create sale 0', async () => {
    const podman = createFakePodmanExecutor()
    const deps = fakeDeps(podman)
    const result = await createWorkerContainer(deps, baseSpec())
    expect(result.exitCode).toBe(0)
    expect(podman.calls).toEqual([
      createWorkerContainerArgv(baseSpec()),
      ['start', `${WORKER_CONTAINER_NAME_PREFIX}w1`],
    ])
  })

  test('no arranca el contenedor si el create falla', async () => {
    const podman = createFakePodmanExecutor({ create: { exitCode: 125, stdout: '', stderr: 'boom' } })
    const deps = fakeDeps(podman)
    const result = await createWorkerContainer(deps, baseSpec())
    expect(result.exitCode).toBe(125)
    expect(podman.calls).toHaveLength(1)
  })
})

describe('inspectWorkerContainer / stopWorkerContainer / removeWorkerContainer', () => {
  test('inspectWorkerContainer invoca el argv exacto sobre el nombre dado', async () => {
    const podman = createFakePodmanExecutor({ inspect: { exitCode: 0, stdout: 'running\t9\t4242\tw1', stderr: '' } })
    const deps = fakeDeps(podman)
    const inspection = await inspectWorkerContainer(deps, 'thyrox-worker-w1')
    expect(inspection).toEqual({ present: true, status: 'running', pid: 9, daemonPid: 4242, workerId: 'w1' })
    expect(podman.calls).toEqual([inspectWorkerContainerArgv('thyrox-worker-w1')])
  })

  test('stopWorkerContainer respeta el plazo declarado', async () => {
    const podman = createFakePodmanExecutor()
    const deps = fakeDeps(podman)
    await stopWorkerContainer(deps, 'thyrox-worker-w1', 5)
    expect(podman.calls).toEqual([['stop', '--time', '5', 'thyrox-worker-w1']])
  })

  test('removeWorkerContainer siempre fuerza el retiro', async () => {
    const podman = createFakePodmanExecutor()
    const deps = fakeDeps(podman)
    await removeWorkerContainer(deps, 'thyrox-worker-w1')
    expect(podman.calls).toEqual([['rm', '--force', 'thyrox-worker-w1']])
  })
})

describe('retireWorkerContainer — ningún contenedor ni proceso sobrevive a su worker', () => {
  test('un contenedor ausente no invoca stop ni remove', async () => {
    const podman = createFakePodmanExecutor({ inspect: { exitCode: 1, stdout: '', stderr: 'no such container' } })
    const deps = fakeDeps(podman)
    const outcome = await retireWorkerContainer(deps, 'thyrox-worker-w1')
    expect(outcome).toEqual({ name: 'thyrox-worker-w1', stopped: false, removed: false, killedStaleProcess: false })
    expect(podman.calls).toHaveLength(1)
  })

  test('caso normal: stop y remove salen 0, y el PID ya no vive tras el retiro', async () => {
    const podman = createFakePodmanExecutor({
      inspect: { exitCode: 0, stdout: 'running\t9\t4242\tw1', stderr: '' },
    })
    const deps = fakeDeps(podman, [])
    const outcome = await retireWorkerContainer(deps, 'thyrox-worker-w1', 3)
    expect(outcome).toEqual({ name: 'thyrox-worker-w1', stopped: true, removed: true, killedStaleProcess: false })
    expect(deps.killedPids).toHaveLength(0)
    expect(podman.calls).toEqual([
      inspectWorkerContainerArgv('thyrox-worker-w1'),
      stopWorkerContainerArgv('thyrox-worker-w1', 3),
      removeWorkerContainerArgv('thyrox-worker-w1'),
    ])
  })

  test('usa el plazo por defecto declarado cuando no se pasa ninguno', async () => {
    const podman = createFakePodmanExecutor({
      inspect: { exitCode: 0, stdout: 'running\t9\t4242\tw1', stderr: '' },
    })
    const deps = fakeDeps(podman)
    await retireWorkerContainer(deps, 'thyrox-worker-w1')
    expect(podman.calls[1]).toEqual(stopWorkerContainerArgv('thyrox-worker-w1', DEFAULT_STOP_TIMEOUT_SECONDS))
  })

  test('TASK-THYROX-0605: si el PID sigue vivo tras stop+rm, se le manda SIGKILL directo — nada sobrevive', async () => {
    const podman = createFakePodmanExecutor({
      inspect: { exitCode: 0, stdout: 'running\t9\t4242\tw1', stderr: '' },
    })
    const deps = fakeDeps(podman, [9])
    const outcome = await retireWorkerContainer(deps, 'thyrox-worker-w1')
    expect(outcome.killedStaleProcess).toBe(true)
    expect(deps.killedPids).toEqual([{ pid: 9, signal: 'SIGKILL' }])
  })
})

describe('findOrphanedWorkerContainers / retireOrphanedWorkerContainers', () => {
  test('un contenedor cuyo daemon dueño ya no vive es huérfano', async () => {
    const podman = createFakePodmanExecutor({
      ps: { exitCode: 0, stdout: 'thyrox-worker-w1\n', stderr: '' },
      inspect: { exitCode: 0, stdout: 'running\t9\t4242\tw1', stderr: '' },
    })
    const deps = fakeDeps(podman, [])
    const orphans = await findOrphanedWorkerContainers(deps)
    expect(orphans).toEqual([{ name: 'thyrox-worker-w1', workerId: 'w1', daemonPid: 4242 }])
  })

  test('un contenedor cuyo daemon dueño sigue vivo NO es huérfano', async () => {
    const podman = createFakePodmanExecutor({
      ps: { exitCode: 0, stdout: 'thyrox-worker-w1\n', stderr: '' },
      inspect: { exitCode: 0, stdout: 'running\t9\t4242\tw1', stderr: '' },
    })
    const deps = fakeDeps(podman, [4242])
    expect(await findOrphanedWorkerContainers(deps)).toEqual([])
  })

  test('una etiqueta de daemon ausente o inválida no se puede atribuir a un daemon vivo: es huérfano', async () => {
    const podman = createFakePodmanExecutor({
      ps: { exitCode: 0, stdout: 'thyrox-worker-w2\n', stderr: '' },
      inspect: { exitCode: 0, stdout: 'exited\t0\t<no value>\t<no value>', stderr: '' },
    })
    const deps = fakeDeps(podman, [1])
    expect(await findOrphanedWorkerContainers(deps)).toEqual([{ name: 'thyrox-worker-w2', workerId: null, daemonPid: 0 }])
  })

  test('una lista vacía no produce huérfanos ni inspecciona nada', async () => {
    const podman = createFakePodmanExecutor({ ps: { exitCode: 0, stdout: '', stderr: '' } })
    const deps = fakeDeps(podman)
    expect(await findOrphanedWorkerContainers(deps)).toEqual([])
    expect(podman.calls).toEqual([listWorkerContainerNamesArgv()])
  })

  test('retireOrphanedWorkerContainers retira cada huérfano encontrado', async () => {
    const podman = createFakePodmanExecutor({
      ps: { exitCode: 0, stdout: 'thyrox-worker-w1\n', stderr: '' },
      inspect: { exitCode: 0, stdout: 'running\t9\t4242\tw1', stderr: '' },
    })
    const deps = fakeDeps(podman, [])
    const retirements = await retireOrphanedWorkerContainers(deps)
    expect(retirements).toEqual([{ name: 'thyrox-worker-w1', stopped: true, removed: true, killedStaleProcess: false }])
  })
})
