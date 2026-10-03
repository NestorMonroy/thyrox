/**
 * Un paso de la cuantización corrido en el contenedor del laboratorio, por
 * la primitiva `@thyrox/podman-execution` (ADR-THYROX-007)
 * (TASK-THYROX-0718): sin red, con límite de memoria y CPU, y con el
 * directorio de trabajo como único montaje. El almacenamiento no es de
 * Podman: el scratch lo aporta quien invoca y Podman sólo lo monta.
 *
 * La memoria se mide en el cgroup del contenedor (`container_measure`),
 * muestreada mientras corre: GNU Time sólo vería al cliente de podman.
 */
import type { JobOutput } from '@thyrox/podman-execution/containerRun.ts'
import { runExecution, type ExecutionAuthorization } from '@thyrox/podman-execution/executionAuthorization.ts'
import { runCommand, type PodmanExecutor } from '@thyrox/podman-execution/podmanExecutor.ts'
import { workerContainerName } from '@thyrox/podman-execution/workerContainerLifecycle.ts'

/** Dónde ve el contenedor el scratch del anfitrión. */
export const LAB_SCRATCH_MOUNT = '/scratch'

const MEMORY_SAMPLE_INTERVAL_MS = 1_000
const MEASURED_STATE = 'measured'
const BYTES_PER_MIB = 1024 ** 2
/** Hilos de torch y de llama.cpp: el perfil por defecto (128) no alcanza a un convertidor con 4 CPUs. */
const LAB_PIDS_LIMIT = 512

export interface LabLimits {
  readonly memoryBytes: number
  readonly cpus: number
}

export interface LabOwner {
  readonly id: string
  readonly pid: number
}

export interface LabStep {
  /** Identidad del worker en la primitiva; su contenedor es `workerContainerName(workerId)`. */
  readonly workerId: string
  readonly command: readonly string[]
}

export interface LabStepResult extends JobOutput {
  /** Pico de memoria del cgroup observado; ausente si ningún muestreo llegó a medir. */
  readonly peakMemoryBytes?: number
}

/** Lee el pico de memoria del cgroup de un contenedor vivo; `undefined` si no pudo medirlo. */
export type ContainerMemoryProbe = (containerName: string) => Promise<number | undefined>

/** La tarea dueña del laboratorio: la cita que ampara cada paso por defecto. */
export const DEFAULT_QUANTIZATION_TASK_CITATION = 'TASK-THYROX-0718'

/**
 * El laboratorio ejecuta cada paso por la primitiva de Podman autorizada
 * (`runExecution`): crear, arrancar, esperar, leer salidas y retirar, con el
 * dueño `lab` en sus etiquetas para que un barrido de huérfanos lo reconozca.
 * Cada paso compone su propia autorización —clase `quantization` y la tarea
 * que lo ampara—, así que la cita es declarable por el llamador. El rootfs es
 * escribible a propósito: el convertidor y sus dependencias escriben
 * temporales fuera del scratch.
 */
export class QuantizationLab {
  constructor(
    private readonly podman: PodmanExecutor,
    private readonly imageId: string,
    private readonly scratchDir: string,
    private readonly limits: LabLimits,
    private readonly probe: ContainerMemoryProbe,
    private readonly owner: LabOwner,
    /** Tarea que autoriza los pasos; sin declararla, la dueña del módulo. */
    private readonly taskCitation: string = DEFAULT_QUANTIZATION_TASK_CITATION,
  ) {}

  async run(step: LabStep): Promise<LabStepResult> {
    const containerName = workerContainerName(step.workerId)
    const peak = new PeakTracker()
    const sampler = setInterval(() => { void this.probe(containerName).then(value => peak.observe(value)) }, MEMORY_SAMPLE_INTERVAL_MS)
    try {
      const output = await runExecution(this.podman, this.authorizationOf(step))
      return { ...output, ...peak.asResult() }
    } finally {
      clearInterval(sampler)
    }
  }

  /** La autorización del paso: clase `quantization`, dueño `lab` y la tarea que la ampara. */
  private authorizationOf(step: LabStep): ExecutionAuthorization {
    return {
      executionId: step.workerId,
      reference: { kind: 'task', citation: this.taskCitation },
      owner: { kind: 'lab', id: this.owner.id, pid: this.owner.pid },
      kind: 'quantization',
      image: this.imageId,
      command: step.command,
      mounts: [{ source: this.scratchDir, destination: LAB_SCRATCH_MOUNT, mode: 'rw' }],
      resources: {
        cpus: this.limits.cpus,
        memoryMib: Math.floor(this.limits.memoryBytes / BYTES_PER_MIB),
        pidsLimit: LAB_PIDS_LIMIT,
      },
      network: 'none',
      readOnlyRootfs: false,
    }
  }
}

class PeakTracker {
  private peak: number | undefined

  observe(value: number | undefined): void {
    if (value !== undefined && (this.peak === undefined || value > this.peak)) this.peak = value
  }

  asResult(): { peakMemoryBytes?: number } {
    return this.peak === undefined ? {} : { peakMemoryBytes: this.peak }
  }
}

/** `container_measure read <name>` publica `measured <pico> <uso> <pids>`; otro estado no es una medida. */
export function parseContainerMeasure(stdout: string): number | undefined {
  const [state, peak] = stdout.trim().split(/\s+/)
  if (state !== MEASURED_STATE || peak === undefined) return undefined
  const value = Number(peak)
  return Number.isFinite(value) ? value : undefined
}

export function containerMeasureProbe(containerMeasureBin: string): ContainerMemoryProbe {
  return async name => parseContainerMeasure((await runCommand(containerMeasureBin, ['read', name])).stdout)
}

/** El ID inmutable de la imagen del laboratorio y su digest, para fijarla en la procedencia. */
export async function resolveLabImage(podman: PodmanExecutor, reference: string): Promise<{ id: string; digest: string }> {
  const result = await podman.run(['image', 'inspect', reference, '--format', '{{.Id}} {{.Digest}}'])
  const [id, digest] = result.stdout.trim().split(/\s+/)
  if (result.exitCode !== 0 || !id || !digest) throw new Error(`la imagen del laboratorio ${reference} no está: ${result.stderr.trim()}`)
  return { id, digest }
}
