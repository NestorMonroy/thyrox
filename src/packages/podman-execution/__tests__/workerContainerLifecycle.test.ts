import { describe, expect, test } from 'bun:test'

import type { PodmanCommandResult, PodmanExecutor } from '../podmanExecutor.js'
import {
  DEFAULT_STOP_TIMEOUT_SECONDS,
  InvalidWorkerContainerSpecError,
  OWNER_ID_LABEL_KEY,
  OWNER_KIND_LABEL_KEY,
  OWNER_PID_LABEL_KEY,
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
  type OrphanPredicate,
  type WorkerContainerLifecycleDeps,
  type WorkerContainerSpec,
} from '../workerContainerLifecycle.js'

const OK: PodmanCommandResult = { exitCode: 0, stdout: '', stderr: '' }
const OWNER_PID = 4242
const CONTAINER_PID = 9

/** Ejecutor de Podman de prueba: registra cada argv y resuelve por subcomando. */
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
    owner: { kind: 'daemon', id: 'd1', pid: OWNER_PID },
    resourceArgv: ['--cpus', '1'],
    ...overrides,
  }
}

function inspectOutput(status: string, fields: { kind?: string; id?: string; pid?: string; worker?: string } = {}): PodmanCommandResult {
  const stdout = [status, String(CONTAINER_PID), fields.kind ?? 'daemon', fields.id ?? 'd1',
    fields.pid ?? String(OWNER_PID), fields.worker ?? 'w1'].join('\t')
  return { exitCode: 0, stdout, stderr: '' }
}

/** Predicado de prueba: huérfano todo contenedor cuyo dueño es del tipo dado. */
function orphanWhenKind(kind: string): OrphanPredicate {
  return inspection => inspection.owner.kind === kind
}

function expectSpecRejected(spec: WorkerContainerSpec, field: string): void {
  try {
    validateWorkerContainerSpec(spec)
    throw new Error('debía rehusar')
  } catch (error) {
    expect(error).toBeInstanceOf(InvalidWorkerContainerSpecError)
    expect((error as InvalidWorkerContainerSpecError).field).toBe(field)
  }
}

describe('workerContainerName', () => {
  test('antepone el prefijo declarado al identificador del worker', () => {
    expect(workerContainerName('w1')).toBe(`${WORKER_CONTAINER_NAME_PREFIX}w1`)
  })
})

describe('validateWorkerContainerSpec — rehúsos', () => {
  test('un workerId vacío rehúsa nombrando el campo', () => {
    expectSpecRejected(baseSpec({ workerId: '' }), 'workerId')
  })

  test('un workerId con caracteres fuera del patrón seguro rehúsa', () => {
    expectSpecRejected(baseSpec({ workerId: 'w1 con espacio' }), 'workerId')
  })

  test('una imagen vacía rehúsa nombrando el campo', () => {
    expectSpecRejected(baseSpec({ image: '' }), 'image')
  })

  test('un tipo de dueño desconocido rehúsa nombrando el campo', () => {
    expectSpecRejected(baseSpec({ owner: { kind: 'otro' as 'pool', id: 'x', pid: 1 } }), 'owner.kind')
  })

  test('un identificador de dueño fuera del patrón seguro rehúsa', () => {
    expectSpecRejected(baseSpec({ owner: { kind: 'pool', id: 'a b', pid: 1 } }), 'owner.id')
  })

  test('un PID de dueño <= 0 rehúsa nombrando el campo', () => {
    expectSpecRejected(baseSpec({ owner: { kind: 'pool', id: 'p1', pid: 0 } }), 'owner.pid')
  })

  test('un spec válido no rehúsa, con dueño daemon o pool', () => {
    expect(() => validateWorkerContainerSpec(baseSpec())).not.toThrow()
    expect(() => validateWorkerContainerSpec(baseSpec({ owner: { kind: 'pool', id: 'p1', pid: 7 } }))).not.toThrow()
  })
})

describe('createWorkerContainerArgv', () => {
  test('compone nombre, las tres etiquetas del dueño, la del worker, límites e imagen', () => {
    expect(createWorkerContainerArgv(baseSpec())).toEqual([
      'create',
      '--name', `${WORKER_CONTAINER_NAME_PREFIX}w1`,
      '--label', `${OWNER_KIND_LABEL_KEY}=daemon`,
      '--label', `${OWNER_ID_LABEL_KEY}=d1`,
      '--label', `${OWNER_PID_LABEL_KEY}=${OWNER_PID}`,
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

describe('inspect / stop / remove / list — argv', () => {
  test('inspect pide status, pid, las tres etiquetas del dueño y la del worker en una sola llamada', () => {
    const joined = inspectWorkerContainerArgv('thyrox-worker-w1').join(' ')
    expect(inspectWorkerContainerArgv('thyrox-worker-w1')[0]).toBe('inspect')
    for (const fragment of ['.State.Status', '.State.Pid', OWNER_KIND_LABEL_KEY, OWNER_ID_LABEL_KEY,
      OWNER_PID_LABEL_KEY, WORKER_ID_LABEL_KEY, 'thyrox-worker-w1']) {
      expect(joined).toContain(fragment)
    }
  })

  test('stop lleva el plazo declarado', () => {
    expect(stopWorkerContainerArgv('thyrox-worker-w1', 7)).toEqual(['stop', '--time', '7', 'thyrox-worker-w1'])
  })

  test('remove siempre fuerza el retiro', () => {
    expect(removeWorkerContainerArgv('thyrox-worker-w1')).toEqual(['rm', '--force', 'thyrox-worker-w1'])
  })

  test('list filtra por el prefijo de nombre declarado', () => {
    expect(listWorkerContainerNamesArgv()).toContain(`name=^${WORKER_CONTAINER_NAME_PREFIX}`)
  })
})

describe('parseWorkerContainerInspection', () => {
  test('un contenedor ausente (exit != 0) no está presente', () => {
    expect(parseWorkerContainerInspection({ exitCode: 1, stdout: '', stderr: 'no such container' })).toEqual({
      present: false,
    })
  })

  test('un contenedor presente reporta status, pid, dueño y worker', () => {
    expect(parseWorkerContainerInspection(inspectOutput('running', { kind: 'pool', id: 'p1', pid: '77' }))).toEqual({
      present: true,
      status: 'running',
      pid: CONTAINER_PID,
      owner: { kind: 'pool', id: 'p1', pid: 77 },
      workerId: 'w1',
    })
  })

  test('etiquetas ausentes ("<no value>") o un tipo de dueño desconocido se leen como null', () => {
    const result: PodmanCommandResult = {
      exitCode: 0, stdout: 'exited\t0\totro\t<no value>\t<no value>\t<no value>', stderr: '',
    }
    expect(parseWorkerContainerInspection(result)).toEqual({
      present: true, status: 'exited', pid: 0, owner: { kind: null, id: null, pid: null }, workerId: null,
    })
  })
})

describe('isWorkerContainerProcessAlive — la vivacidad se mide sobre el PID, no sobre el status', () => {
  const running = parseWorkerContainerInspection(inspectOutput('running'))

  test('running + pid vivo => vivo', () => {
    expect(isWorkerContainerProcessAlive(running, pid => pid === CONTAINER_PID)).toBe(true)
  })

  test('TASK-THYROX-0605: running reportado pero el PID ya no existe => NO vivo', () => {
    expect(isWorkerContainerProcessAlive(running, () => false)).toBe(false)
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
    const result = await createWorkerContainer(fakeDeps(podman), baseSpec())
    expect(result.exitCode).toBe(0)
    expect(podman.calls).toEqual([createWorkerContainerArgv(baseSpec()), ['start', `${WORKER_CONTAINER_NAME_PREFIX}w1`]])
  })

  test('no arranca el contenedor si el create falla', async () => {
    const podman = createFakePodmanExecutor({ create: { exitCode: 125, stdout: '', stderr: 'boom' } })
    const result = await createWorkerContainer(fakeDeps(podman), baseSpec())
    expect(result.exitCode).toBe(125)
    expect(podman.calls).toHaveLength(1)
  })
})

describe('inspectWorkerContainer / stopWorkerContainer / removeWorkerContainer', () => {
  test('inspectWorkerContainer invoca el argv exacto sobre el nombre dado', async () => {
    const podman = createFakePodmanExecutor({ inspect: inspectOutput('running') })
    const inspection = await inspectWorkerContainer(fakeDeps(podman), 'thyrox-worker-w1')
    expect(inspection).toEqual(parseWorkerContainerInspection(inspectOutput('running')))
    expect(podman.calls).toEqual([inspectWorkerContainerArgv('thyrox-worker-w1')])
  })

  test('stopWorkerContainer respeta el plazo declarado', async () => {
    const podman = createFakePodmanExecutor()
    await stopWorkerContainer(fakeDeps(podman), 'thyrox-worker-w1', 5)
    expect(podman.calls).toEqual([['stop', '--time', '5', 'thyrox-worker-w1']])
  })

  test('removeWorkerContainer siempre fuerza el retiro', async () => {
    const podman = createFakePodmanExecutor()
    await removeWorkerContainer(fakeDeps(podman), 'thyrox-worker-w1')
    expect(podman.calls).toEqual([['rm', '--force', 'thyrox-worker-w1']])
  })
})

describe('retireWorkerContainer — ningún contenedor ni proceso sobrevive a su worker', () => {
  test('un contenedor ausente no invoca stop ni remove', async () => {
    const podman = createFakePodmanExecutor({ inspect: { exitCode: 1, stdout: '', stderr: 'no such container' } })
    const outcome = await retireWorkerContainer(fakeDeps(podman), 'thyrox-worker-w1')
    expect(outcome).toEqual({ name: 'thyrox-worker-w1', stopped: false, removed: false, killedStaleProcess: false })
    expect(podman.calls).toHaveLength(1)
  })

  test('caso normal: stop y remove salen 0, y el PID ya no vive tras el retiro', async () => {
    const podman = createFakePodmanExecutor({ inspect: inspectOutput('running') })
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
    const podman = createFakePodmanExecutor({ inspect: inspectOutput('running') })
    await retireWorkerContainer(fakeDeps(podman), 'thyrox-worker-w1')
    expect(podman.calls[1]).toEqual(stopWorkerContainerArgv('thyrox-worker-w1', DEFAULT_STOP_TIMEOUT_SECONDS))
  })

  test('TASK-THYROX-0605: si el PID sigue vivo tras stop+rm, se le manda SIGKILL directo', async () => {
    const podman = createFakePodmanExecutor({ inspect: inspectOutput('running') })
    const deps = fakeDeps(podman, [CONTAINER_PID])
    const outcome = await retireWorkerContainer(deps, 'thyrox-worker-w1')
    expect(outcome.killedStaleProcess).toBe(true)
    expect(deps.killedPids).toEqual([{ pid: CONTAINER_PID, signal: 'SIGKILL' }])
  })
})

describe('findOrphanedWorkerContainers / retireOrphanedWorkerContainers — el dueño decide', () => {
  test('el predicado del dueño decide: lo que marca huérfano se devuelve con su dueño', async () => {
    const podman = createFakePodmanExecutor({
      ps: { exitCode: 0, stdout: 'thyrox-worker-w1\n', stderr: '' },
      inspect: inspectOutput('running', { kind: 'pool', id: 'p1', pid: '77' }),
    })
    const orphans = await findOrphanedWorkerContainers(fakeDeps(podman), orphanWhenKind('pool'))
    expect(orphans).toEqual([{ name: 'thyrox-worker-w1', workerId: 'w1', owner: { kind: 'pool', id: 'p1', pid: 77 } }])
  })

  test('lo que el predicado no marca no es huérfano, aunque su dueño haya muerto', async () => {
    const podman = createFakePodmanExecutor({
      ps: { exitCode: 0, stdout: 'thyrox-worker-w1\n', stderr: '' },
      inspect: inspectOutput('running', { kind: 'pool' }),
    })
    expect(await findOrphanedWorkerContainers(fakeDeps(podman, []), orphanWhenKind('daemon'))).toEqual([])
  })

  test('un contenedor que desaparece entre listar e inspeccionar no se consulta al predicado', async () => {
    let consulted = false
    const podman = createFakePodmanExecutor({
      ps: { exitCode: 0, stdout: 'thyrox-worker-w1\n', stderr: '' },
      inspect: { exitCode: 1, stdout: '', stderr: 'no such container' },
    })
    const orphans = await findOrphanedWorkerContainers(fakeDeps(podman), () => ((consulted = true), true))
    expect(orphans).toEqual([])
    expect(consulted).toBe(false)
  })

  test('una lista vacía no produce huérfanos ni inspecciona nada', async () => {
    const podman = createFakePodmanExecutor({ ps: { exitCode: 0, stdout: '', stderr: '' } })
    expect(await findOrphanedWorkerContainers(fakeDeps(podman), () => true)).toEqual([])
    expect(podman.calls).toEqual([listWorkerContainerNamesArgv()])
  })

  test('retireOrphanedWorkerContainers retira cada huérfano que el predicado marca', async () => {
    const podman = createFakePodmanExecutor({
      ps: { exitCode: 0, stdout: 'thyrox-worker-w1\n', stderr: '' },
      inspect: inspectOutput('running'),
    })
    const retirements = await retireOrphanedWorkerContainers(fakeDeps(podman, []), () => true)
    expect(retirements).toEqual([{ name: 'thyrox-worker-w1', stopped: true, removed: true, killedStaleProcess: false }])
  })
})

describe('lab owner', () => {
  test('a lab is a valid container owner', () => {
    expect(() => validateWorkerContainerSpec({
      workerId: 'quantize1', image: 'localhost/lab', owner: { kind: 'lab', id: 'q1', pid: 9 }, resourceArgv: [],
    })).not.toThrow()
  })
})

describe('dueño model-coordinator y etiquetas propias del dueño', () => {
  test('el coordinador de model scheduling es un dueño válido y se inspecciona como tal', () => {
    expect(() => validateWorkerContainerSpec(baseSpec({ owner: { kind: 'model-coordinator', id: 'host', pid: 7 } }))).not.toThrow()
    expect(parseWorkerContainerInspection(inspectOutput('running', { kind: 'model-coordinator' }))).toMatchObject({ owner: { kind: 'model-coordinator' } })
  })

  test('las etiquetas propias se emiten como --label, ordenadas por clave', () => {
    const argv = createWorkerContainerArgv(baseSpec({ labels: { 'thyrox.model.unit': 'u1', 'thyrox.model.generation': '3' } }))
    const labels = argv.flatMap((token, index) => (token === '--label' ? [argv[index + 1]] : []))
    expect(labels).toContain('thyrox.model.generation=3')
    expect(labels).toContain('thyrox.model.unit=u1')
    expect(labels.indexOf('thyrox.model.generation=3')).toBeLessThan(labels.indexOf('thyrox.model.unit=u1'))
    expect(argv.indexOf('thyrox-worker:latest')).toBeGreaterThan(argv.lastIndexOf('--label'))
  })

  test('una etiqueta propia no puede reescribir el dueño ni el worker', () => {
    for (const key of [OWNER_KIND_LABEL_KEY, OWNER_ID_LABEL_KEY, OWNER_PID_LABEL_KEY, WORKER_ID_LABEL_KEY]) {
      expectSpecRejected(baseSpec({ labels: { [key]: 'otro' } }), `labels.${key}`)
    }
  })

  test('una clave de etiqueta con espacios o vacía se rehúsa', () => {
    expectSpecRejected(baseSpec({ labels: { 'a b': 'x' } }), 'labels.a b')
    expectSpecRejected(baseSpec({ labels: { '': 'x' } }), 'labels.')
  })
})
