/**
 * Un paso de la cuantización corrido en el contenedor del laboratorio
 * (TASK-THYROX-0718): sin red, con límite de memoria y CPU, y con el
 * directorio de trabajo como único montaje. El almacenamiento no es de
 * Podman: el scratch lo aporta quien invoca y Podman sólo lo monta.
 *
 * La memoria se mide en el cgroup del contenedor (`container_measure`),
 * muestreada mientras corre: GNU Time sólo vería al cliente de podman.
 */
import type { PodmanCommandResult, PodmanExecutor } from '@thyrox/podman-execution/podmanExecutor.ts'
import { runCommand } from '@thyrox/podman-execution/podmanExecutor.ts'

/** Dónde ve el contenedor el scratch del anfitrión. */
export const LAB_SCRATCH_MOUNT = '/scratch'

const MEMORY_SAMPLE_INTERVAL_MS = 1_000
const MEASURED_STATE = 'measured'

export interface LabLimits {
  readonly memoryBytes: number
  readonly cpus: number
}

export interface LabStep {
  readonly containerName: string
  readonly command: readonly string[]
}

export interface LabStepResult extends PodmanCommandResult {
  /** Pico de memoria del cgroup observado; ausente si ningún muestreo llegó a medir. */
  readonly peakMemoryBytes?: number
}

/** Lee el pico de memoria del cgroup de un contenedor vivo; `undefined` si no pudo medirlo. */
export type ContainerMemoryProbe = (containerName: string) => Promise<number | undefined>

export class QuantizationLab {
  constructor(
    private readonly podman: PodmanExecutor,
    private readonly imageId: string,
    private readonly scratchDir: string,
    private readonly limits: LabLimits,
    private readonly probe: ContainerMemoryProbe,
  ) {}

  async run(step: LabStep): Promise<LabStepResult> {
    const peak = new PeakTracker()
    const sampler = setInterval(() => { void this.probe(step.containerName).then(value => peak.observe(value)) }, MEMORY_SAMPLE_INTERVAL_MS)
    try {
      const result = await this.podman.run(this.runArgv(step))
      return { ...result, ...peak.asResult() }
    } finally {
      clearInterval(sampler)
    }
  }

  private runArgv(step: LabStep): string[] {
    return [
      'run', '--rm', '--name', step.containerName,
      '--network', 'none',
      '--memory', String(this.limits.memoryBytes),
      '--cpus', String(this.limits.cpus),
      '-v', `${this.scratchDir}:${LAB_SCRATCH_MOUNT}`,
      this.imageId,
      ...step.command,
    ]
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
