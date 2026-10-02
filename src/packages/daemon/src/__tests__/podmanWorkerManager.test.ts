import { describe, expect, test } from 'bun:test'
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  PodmanWorkerManager,
  UnsupportedAcceleratorError,
  VramAdmissionTimeoutError,
  VramOwnerBusyError,
  WorkerAlreadyManagedError,
  WorkerLaunchError,
  createPodmanExecutor,
  parseHardwareVerdict,
  readHardwareVerdict,
  type HardwareVerdict,
  type PodmanWorkerManagerDeps,
  type VramAdmissionPort,
  type WorkerLaunchRequest,
} from '../podman/podmanWorkerManager.js'
import {
  createWorkerContainerArgv,
  daemonContainerOwner,
  workerContainerName,
  type PodmanCommandResult,
  type PodmanExecutor,
} from '../podman/workerContainerLifecycle.js'
import {
  EXECUTION_ID_LABEL_KEY,
  EXECUTION_KIND_LABEL_KEY,
  EXECUTION_REFERENCE_LABEL_KEY,
  InvalidExecutionAuthorizationError,
} from '@thyrox/podman-execution/executionAuthorization.ts'
import { workerResourceLimitArgv, type WorkerResourceProfile } from '@thyrox/podman-execution/workerResourceProfile.ts'

const OK: PodmanCommandResult = { exitCode: 0, stdout: '', stderr: '' }
const DAEMON_PID = 4100
const CONTAINER_PID = 4242

/** Podman de prueba: registra cada argv y responde por subcomando; `inspect` refleja el contenedor vivo. */
function fakePodman(
  responses: Partial<Record<string, PodmanCommandResult>> = {},
): PodmanExecutor & { readonly calls: string[][] } {
  const calls: string[][] = []
  return {
    calls,
    async run(args: readonly string[]): Promise<PodmanCommandResult> {
      calls.push([...args])
      const answer = responses[args[0]]
      if (answer) return answer
      if (args[0] === 'inspect') {
        if (args.includes('json')) {
          return {
            exitCode: 0,
            stdout: JSON.stringify([{ State: { Pid: CONTAINER_PID, CgroupPath: '/user.slice/thyrox.slice/w1' } }]),
            stderr: '',
          }
        }
        return { exitCode: 0, stdout: `running\t${CONTAINER_PID}\tdaemon\t${DAEMON_PID}\t${DAEMON_PID}\tw1`, stderr: '' }
      }
      return OK
    },
  }
}

/** Registro de VRAM de prueba: cuenta admisiones y liberaciones por dueño. */
function fakeVram(answer: 'admitted' | 'timeout' = 'admitted'): VramAdmissionPort & {
  readonly admitted: { needMib: number; ownerPid: number }[]
  readonly released: number[]
} {
  const admitted: { needMib: number; ownerPid: number }[] = []
  const released: number[] = []
  return {
    admitted,
    released,
    async admit(needMib, ownerPid) {
      admitted.push({ needMib, ownerPid })
      return answer
    },
    async release(ownerPid) {
      released.push(ownerPid)
    },
  }
}

function deps(
  podman: PodmanExecutor,
  options: {
    verdict?: HardwareVerdict
    vram?: VramAdmissionPort
    gpuDevices?: readonly string[]
    alive?: readonly number[]
  } = {},
): PodmanWorkerManagerDeps & { readonly killed: number[] } {
  const killed: number[] = []
  const alive = options.alive ?? [CONTAINER_PID, DAEMON_PID]
  return {
    lifecycle: {
      podman,
      isProcessAlive: pid => alive.includes(pid),
      killProcess: pid => {
        killed.push(pid)
      },
    },
    daemonPid: DAEMON_PID,
    hardwareVerdict: async () => options.verdict ?? 'none',
    vram: options.vram ?? fakeVram(),
    gpuDevices: options.gpuDevices,
    killed,
  }
}

/** El perfil que el daemon decide en estas pruebas: dos CPUs, 2 GiB y 64 procesos. */
const CPU_PROFILE: WorkerResourceProfile = {
  cpus: 2,
  memoryMib: 2048,
  pidsLimit: 64,
  network: 'none',
  readOnlyRootfs: true,
  mounts: [],
}

function cpuRequest(overrides: Partial<WorkerLaunchRequest> = {}): WorkerLaunchRequest {
  return {
    workerId: 'w1',
    image: 'localhost/thyrox-worker:test',
    profile: CPU_PROFILE,
    command: ['/bin/worker'],
    accelerator: 'cpu',
    ...overrides,
  }
}

function cudaRequest(overrides: Partial<WorkerLaunchRequest> = {}): WorkerLaunchRequest {
  return cpuRequest({ accelerator: 'cuda', vramMib: 2048, ...overrides })
}

describe('launch — ruta CPU', () => {
  test('crea, arranca y confirma la vida por el PID, sin tocar la VRAM', async () => {
    const podman = fakePodman()
    const vram = fakeVram()
    const manager = new PodmanWorkerManager(deps(podman, { vram }))
    const worker = await manager.launch(cpuRequest())
    expect(worker).toEqual({ workerId: 'w1', containerName: workerContainerName('w1'), accelerator: 'cpu', pid: CONTAINER_PID })
    expect(podman.calls.map(call => call[0])).toEqual(['create', 'start', 'inspect'])
    expect(podman.calls[0]).toEqual(createWorkerContainerArgv({
      workerId: 'w1',
      image: 'localhost/thyrox-worker:test',
      owner: daemonContainerOwner(DAEMON_PID),
      labels: {
        [EXECUTION_ID_LABEL_KEY]: 'w1',
        [EXECUTION_KIND_LABEL_KEY]: 'infrastructure',
        [EXECUTION_REFERENCE_LABEL_KEY]: 'infrastructure:daemon',
      },
      resourceArgv: workerResourceLimitArgv(CPU_PROFILE),
      command: ['/bin/worker'],
    }))
    expect(vram.admitted).toEqual([])
    expect(manager.managedWorkers()).toEqual([worker])
  })

  test('rehúsa un segundo lanzamiento del mismo worker sin hablar con Podman', async () => {
    const podman = fakePodman()
    const manager = new PodmanWorkerManager(deps(podman))
    await manager.launch(cpuRequest())
    const callsBefore = podman.calls.length
    await expect(manager.launch(cpuRequest())).rejects.toBeInstanceOf(WorkerAlreadyManagedError)
    expect(podman.calls.length).toBe(callsBefore)
  })

  test('un executionId inválido rehúsa antes de llamar a Podman', async () => {
    const podman = fakePodman()
    const manager = new PodmanWorkerManager(deps(podman))
    await expect(manager.launch(cpuRequest({ workerId: '../x' }))).rejects.toBeInstanceOf(InvalidExecutionAuthorizationError)
    expect(podman.calls).toEqual([])
  })

  test('si el create falla nombra la etapa y retira lo que haya quedado', async () => {
    const podman = fakePodman({ create: { exitCode: 125, stdout: '', stderr: 'no such image' } })
    const manager = new PodmanWorkerManager(deps(podman))
    const failure = await manager.launch(cpuRequest()).catch(error => error)
    expect(failure).toBeInstanceOf(WorkerLaunchError)
    expect(failure.stage).toBe('create')
    expect(failure.message).toContain('no such image')
    expect(podman.calls.map(call => call[0])).not.toContain('start')
    expect(manager.managedWorkers()).toEqual([])
  })

  test('si el start falla retira el contenedor creado', async () => {
    const podman = fakePodman({ start: { exitCode: 126, stdout: '', stderr: 'oci runtime error' } })
    const manager = new PodmanWorkerManager(deps(podman))
    const failure = await manager.launch(cpuRequest()).catch(error => error)
    expect(failure.stage).toBe('start')
    expect(podman.calls.map(call => call[0])).toContain('rm')
    expect(manager.managedWorkers()).toEqual([])
  })

  test('un contenedor «running» con el PID muerto no cuenta como lanzado', async () => {
    const podman = fakePodman()
    const manager = new PodmanWorkerManager(deps(podman, { alive: [DAEMON_PID] }))
    const failure = await manager.launch(cpuRequest()).catch(error => error)
    expect(failure).toBeInstanceOf(WorkerLaunchError)
    expect(failure.stage).toBe('liveness')
    expect(podman.calls.map(call => call[0])).toContain('rm')
    expect(manager.managedWorkers()).toEqual([])
  })
})

describe('launch — ruta CUDA', () => {
  test('sin GPU utilizable rehúsa con el veredicto, sin reservar ni crear', async () => {
    const podman = fakePodman()
    const vram = fakeVram()
    const manager = new PodmanWorkerManager(deps(podman, { verdict: 'none', vram, gpuDevices: ['nvidia.com/gpu=x'] }))
    const failure = await manager.launch(cudaRequest()).catch(error => error)
    expect(failure).toBeInstanceOf(UnsupportedAcceleratorError)
    expect(failure.exitCode).toBe(2)
    expect(failure.message).toContain('none')
    expect(vram.admitted).toEqual([])
    expect(podman.calls).toEqual([])
  })

  test('con GPU pero sin argv de dispositivo medido rehúsa: no se inventa la bandera', async () => {
    const podman = fakePodman()
    const manager = new PodmanWorkerManager(deps(podman, { verdict: 'nvidia-usable' }))
    const failure = await manager.launch(cudaRequest()).catch(error => error)
    expect(failure).toBeInstanceOf(UnsupportedAcceleratorError)
    expect(failure.message).toContain('gpuDevices')
    expect(podman.calls).toEqual([])
  })

  test('exige vramMib entero positivo', async () => {
    const podman = fakePodman()
    const manager = new PodmanWorkerManager(deps(podman, { verdict: 'nvidia-usable', gpuDevices: ['nvidia.com/gpu=x'] }))
    await expect(manager.launch(cudaRequest({ vramMib: 0 }))).rejects.toBeInstanceOf(InvalidExecutionAuthorizationError)
    expect(podman.calls).toEqual([])
  })

  test('reserva la VRAM a nombre del daemon, añade el dispositivo y la suelta al retirar', async () => {
    const podman = fakePodman()
    const vram = fakeVram()
    const manager = new PodmanWorkerManager(deps(podman, { verdict: 'nvidia-usable', vram, gpuDevices: ['nvidia.com/gpu=gpu0'] }))
    await manager.launch(cudaRequest())
    expect(vram.admitted).toEqual([{ needMib: 2048, ownerPid: DAEMON_PID }])
    expect(podman.calls[0]).toContain('nvidia.com/gpu=gpu0')
    await manager.retire('w1')
    expect(vram.released).toEqual([DAEMON_PID])
    expect(manager.managedWorkers()).toEqual([])
  })

  test('un plazo de admisión vencido no crea nada', async () => {
    const podman = fakePodman()
    const manager = new PodmanWorkerManager(deps(podman, {
      verdict: 'nvidia-usable', vram: fakeVram('timeout'), gpuDevices: ['nvidia.com/gpu=x'],
    }))
    await expect(manager.launch(cudaRequest())).rejects.toBeInstanceOf(VramAdmissionTimeoutError)
    expect(podman.calls).toEqual([])
  })

  test('un lanzamiento fallido suelta la VRAM que reservó', async () => {
    const podman = fakePodman({ start: { exitCode: 126, stdout: '', stderr: 'boom' } })
    const vram = fakeVram()
    const manager = new PodmanWorkerManager(deps(podman, { verdict: 'nvidia-usable', vram, gpuDevices: ['nvidia.com/gpu=x'] }))
    await expect(manager.launch(cudaRequest())).rejects.toBeInstanceOf(WorkerLaunchError)
    expect(vram.released).toEqual([DAEMON_PID])
  })

  test('un segundo worker CUDA rehúsa: el registro reserva por dueño y soltar uno soltaría los dos', async () => {
    const podman = fakePodman()
    const vram = fakeVram()
    const manager = new PodmanWorkerManager(deps(podman, { verdict: 'nvidia-usable', vram, gpuDevices: ['nvidia.com/gpu=x'] }))
    await manager.launch(cudaRequest())
    await expect(manager.launch(cudaRequest({ workerId: 'w2' }))).rejects.toBeInstanceOf(VramOwnerBusyError)
    expect(vram.admitted).toHaveLength(1)
  })
})

describe('la autorización de cada lanzamiento', () => {
  test('compone la autorización de infraestructura del daemon con su clase y su referencia', async () => {
    const podman = fakePodman()
    const manager = new PodmanWorkerManager(deps(podman))
    await manager.launch(cpuRequest())
    const create = podman.calls[0]!.join(' ')
    expect(create).toContain(`--label ${EXECUTION_KIND_LABEL_KEY}=infrastructure`)
    expect(create).toContain(`--label ${EXECUTION_REFERENCE_LABEL_KEY}=infrastructure:daemon`)
    expect(create).toContain(`--label ${EXECUTION_ID_LABEL_KEY}=w1`)
  })

  test('la vida se confirma con la inspección de la unidad materializada', async () => {
    const podman = fakePodman()
    const manager = new PodmanWorkerManager(deps(podman))
    await manager.launch(cpuRequest())
    expect(podman.calls[2]).toEqual(['inspect', '--format', 'json', workerContainerName('w1')])
  })
})

describe('retire / retireAll / reconcileOrphans', () => {
  test('retire detiene y borra el contenedor y olvida el worker', async () => {
    const podman = fakePodman()
    const manager = new PodmanWorkerManager(deps(podman))
    await manager.launch(cpuRequest())
    const retirement = await manager.retire('w1')
    expect(retirement).toMatchObject({ name: workerContainerName('w1'), stopped: true, removed: true })
    expect(podman.calls.map(call => call[0]).slice(-2)).toEqual(['stop', 'rm'])
    expect(manager.managedWorkers()).toEqual([])
  })

  test('retireAll retira cada worker gestionado', async () => {
    const podman = fakePodman()
    const manager = new PodmanWorkerManager(deps(podman))
    await manager.launch(cpuRequest())
    await manager.launch(cpuRequest({ workerId: 'w2' }))
    const retirements = await manager.retireAll()
    expect(retirements.map(r => r.name).sort()).toEqual([workerContainerName('w1'), workerContainerName('w2')])
    expect(manager.managedWorkers()).toEqual([])
  })

  test('reconcileOrphans retira los contenedores cuyo daemon murió', async () => {
    const orphanName = workerContainerName('old')
    const podman = fakePodman({
      ps: { exitCode: 0, stdout: `${orphanName}\n`, stderr: '' },
      inspect: { exitCode: 0, stdout: `running\t77\tdaemon\t9999\t9999\told`, stderr: '' },
    })
    const manager = new PodmanWorkerManager(deps(podman, { alive: [DAEMON_PID] }))
    const retirements = await manager.reconcileOrphans()
    expect(retirements.map(r => r.name)).toEqual([orphanName])
  })
})

describe('parseHardwareVerdict', () => {
  test('lee la línea verdict de hardware-inventory', () => {
    expect(parseHardwareVerdict('signal\tlibcuda\tabsent\t-\nverdict\tnone\tmissing=pci_nvidia\n')).toBe('none')
    expect(parseHardwareVerdict('verdict\tnvidia-usable\t\n')).toBe('nvidia-usable')
    expect(parseHardwareVerdict('verdict\tpartial\tmissing=libcuda\n')).toBe('partial')
  })

  test('sin veredicto reconocible lanza: no poder medir no es «none»', () => {
    expect(() => parseHardwareVerdict('signal\tx\tabsent\t-\n')).toThrow()
    expect(() => parseHardwareVerdict('verdict\tquizas\t\n')).toThrow()
  })
})

describe('createPodmanExecutor', () => {
  test('lanza el binario declarado en THYROX_TOOLCHAIN_PODMAN_BIN y devuelve su salida', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'podman-exec-'))
    const bin = join(dir, 'podman')
    writeFileSync(bin, '#!/bin/sh\necho "args:$*"\necho oops >&2\nexit 3\n')
    chmodSync(bin, 0o755)
    const previous = process.env.THYROX_TOOLCHAIN_PODMAN_BIN
    process.env.THYROX_TOOLCHAIN_PODMAN_BIN = bin
    try {
      const result = await createPodmanExecutor().run(['ps', '--all'])
      expect(result).toEqual({ exitCode: 3, stdout: 'args:ps --all\n', stderr: 'oops\n' })
    } finally {
      if (previous === undefined) delete process.env.THYROX_TOOLCHAIN_PODMAN_BIN
      else process.env.THYROX_TOOLCHAIN_PODMAN_BIN = previous
    }
  })
})

/** Corre `readHardwareVerdict` contra un `bin/hardware-inventory` falso bajo un THYROX_ROOT temporal. */
async function withFakeInventory<T>(script: string, body: () => Promise<T>): Promise<T> {
  const root = mkdtempSync(join(tmpdir(), 'hardware-inventory-'))
  mkdirSync(join(root, 'bin'))
  writeFileSync(join(root, 'bin/hardware-inventory'), `#!/usr/bin/env bash\n${script}\n`)
  const previous = process.env.THYROX_ROOT
  process.env.THYROX_ROOT = root
  try {
    return await body()
  } finally {
    if (previous === undefined) delete process.env.THYROX_ROOT
    else process.env.THYROX_ROOT = previous
    rmSync(root, { recursive: true, force: true })
  }
}

describe('readHardwareVerdict — contrato de salida de hardware-inventory', () => {
  test('exit 0 con verdict nvidia-usable es un veredicto medido', async () => {
    const verdict = await withFakeInventory("printf 'verdict\\tnvidia-usable\\t\\n'; exit 0", readHardwareVerdict)
    expect(verdict).toBe('nvidia-usable')
  })

  test('exit 1 con verdict none es un veredicto medido, no un error', async () => {
    const verdict = await withFakeInventory(
      "printf 'signal\\tlibcuda\\tabsent\\t-\\nverdict\\tnone\\tmissing=pci_nvidia\\n'; exit 1", readHardwareVerdict)
    expect(verdict).toBe('none')
  })

  test('exit 3 con verdict partial es un veredicto medido', async () => {
    const verdict = await withFakeInventory(
      "printf 'verdict\\tpartial\\tmissing=libcuda\\n'; exit 3", readHardwareVerdict)
    expect(verdict).toBe('partial')
  })

  test('exit 2 lanza con su stderr: no poder medir no es «none»', async () => {
    const outcome = withFakeInventory("echo 'sin /sys legible' >&2; exit 2", readHardwareVerdict)
    await expect(outcome).rejects.toThrow('sin /sys legible')
  })

  test('una línea verdict que contradice su código de salida lanza', async () => {
    const outcome = withFakeInventory("printf 'verdict\\tnvidia-usable\\t\\n'; exit 1", readHardwareVerdict)
    await expect(outcome).rejects.toThrow('contradice')
  })
})
