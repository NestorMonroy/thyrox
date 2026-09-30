/**
 * Sonda de `test-podman-worker-manager-real.sh`: llama al PodmanWorkerManager
 * con sus dependencias reales —el binario de Podman, `bin/hardware-inventory`
 * y la sonda de PID de `daemonLock.ts`— y publica el resultado como líneas
 * `clave=valor` en stdout, para que la suite lo lea sin intérprete de JSON.
 *
 * Tres operaciones, una por invocación:
 *
 *   launch    --worker-id --image --daemon-pid [--accelerator] [--vram-mib]
 *             [--resource-arg …] -- <comando…>
 *   retire    --worker-id --daemon-pid
 *   reconcile --daemon-pid
 *
 * Códigos de salida: 0 la operación se materializó; el `exitCode` del error
 * si lo declara (2 para `UnsupportedAcceleratorError`); 1 cualquier otro
 * error, con su nombre y su etapa publicados.
 *
 * La admisión de VRAM es un doble que rehúsa: la suite no ejercita una GPU,
 * así que llegar a admitir VRAM ya es un fallo del caso CUDA, y el nombre del
 * error lo distingue del rechazo por hardware.
 */

import { parseArgs } from 'node:util'

import {
  PodmanWorkerManager,
  createPodmanExecutor,
  readHardwareVerdict,
  type VramAdmissionPort,
  type WorkerAccelerator,
  type WorkerLaunchRequest,
} from '../../src/packages/daemon/src/podman/podmanWorkerManager.js'
import { createWorkerContainerLifecycleDeps } from '../../src/packages/daemon/src/podman/workerContainerLifecycle.js'

const GENERIC_FAILURE_EXIT_CODE = 1

type ProbeOptions = {
  operation: string
  workerId?: string
  image?: string
  daemonPid: number
  accelerator: WorkerAccelerator
  vramMib?: number
  resourceArgv: string[]
  command: string[]
}

class ProbeUsageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProbeUsageError'
  }
}

class VramAdmissionNotExpectedError extends Error {
  constructor() {
    super('la sonda no reserva VRAM: el caso llegó a la admisión')
    this.name = 'VramAdmissionNotExpectedError'
  }
}

const refusingVramAdmission: VramAdmissionPort = {
  admit: () => Promise.reject(new VramAdmissionNotExpectedError()),
  release: () => Promise.resolve(),
}

function requireOption(value: string | undefined, name: string): string {
  if (!value) throw new ProbeUsageError(`falta --${name}`)
  return value
}

function parseAccelerator(raw: string | undefined): WorkerAccelerator {
  if (raw === undefined || raw === 'cpu') return 'cpu'
  if (raw === 'cuda') return 'cuda'
  throw new ProbeUsageError(`acelerador desconocido: ${raw}`)
}

function parseProbeOptions(argv: string[]): ProbeOptions {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      'worker-id': { type: 'string' },
      image: { type: 'string' },
      'daemon-pid': { type: 'string' },
      accelerator: { type: 'string' },
      'vram-mib': { type: 'string' },
      'resource-arg': { type: 'string', multiple: true },
    },
  })
  const [operation, ...command] = positionals
  return {
    operation: requireOption(operation, 'operación'),
    workerId: values['worker-id'],
    image: values.image,
    daemonPid: Number(requireOption(values['daemon-pid'], 'daemon-pid')),
    accelerator: parseAccelerator(values.accelerator),
    vramMib: values['vram-mib'] === undefined ? undefined : Number(values['vram-mib']),
    resourceArgv: values['resource-arg'] ?? [],
    command,
  }
}

function createManager(daemonPid: number): PodmanWorkerManager {
  return new PodmanWorkerManager({
    lifecycle: createWorkerContainerLifecycleDeps(createPodmanExecutor()),
    daemonPid,
    hardwareVerdict: readHardwareVerdict,
    vram: refusingVramAdmission,
  })
}

function publish(fields: Record<string, string | number | boolean>): void {
  for (const [key, value] of Object.entries(fields)) console.log(`${key}=${value}`)
}

function launchRequest(options: ProbeOptions): WorkerLaunchRequest {
  return {
    workerId: requireOption(options.workerId, 'worker-id'),
    image: requireOption(options.image, 'image'),
    resourceArgv: options.resourceArgv,
    command: options.command,
    accelerator: options.accelerator,
    vramMib: options.vramMib,
  }
}

async function launch(manager: PodmanWorkerManager, options: ProbeOptions): Promise<void> {
  const worker = await manager.launch(launchRequest(options))
  publish({ result: 'launched', worker_id: worker.workerId, container: worker.containerName, pid: worker.pid })
}

async function retire(manager: PodmanWorkerManager, options: ProbeOptions): Promise<void> {
  const retirement = await manager.retire(requireOption(options.workerId, 'worker-id'))
  publish({ result: 'retired', container: retirement.name, stopped: retirement.stopped, removed: retirement.removed })
}

async function reconcile(manager: PodmanWorkerManager): Promise<void> {
  const retirements = await manager.reconcileOrphans()
  publish({ result: 'reconciled', count: retirements.length })
  for (const retirement of retirements) publish({ retired: retirement.name })
}

async function runOperation(options: ProbeOptions): Promise<void> {
  const manager = createManager(options.daemonPid)
  if (options.operation === 'launch') return launch(manager, options)
  if (options.operation === 'retire') return retire(manager, options)
  if (options.operation === 'reconcile') return reconcile(manager)
  throw new ProbeUsageError(`operación desconocida: ${options.operation}`)
}

function errorExitCode(error: unknown): number {
  const declared = (error as { exitCode?: unknown }).exitCode
  return typeof declared === 'number' ? declared : GENERIC_FAILURE_EXIT_CODE
}

function publishError(error: unknown): void {
  const failure = error instanceof Error ? error : new Error(String(error))
  const stage = (failure as { stage?: unknown }).stage
  publish({ result: 'error', error: failure.name })
  if (typeof stage === 'string') publish({ stage })
  publish({ message: failure.message.replaceAll('\n', ' ') })
}

async function main(): Promise<number> {
  try {
    await runOperation(parseProbeOptions(process.argv.slice(2)))
    return 0
  } catch (error) {
    publishError(error)
    return errorExitCode(error)
  }
}

process.exit(await main())
