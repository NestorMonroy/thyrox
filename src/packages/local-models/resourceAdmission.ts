/**
 * La admisión de disco y RAM de un laboratorio, por el registro común de
 * `resource_admission` (TASK-THYROX-0709): reservar es comprobar y apartar en
 * un solo paso bajo lock, restando lo que otros reservaron y un piso de
 * seguridad. Con `--timeout 0` se decide en el acto: un laboratorio que no
 * cabe rehúsa antes de descargar, no espera ni corre sin reserva.
 */
import { runCommand } from '@thyrox/podman-execution/podmanExecutor.ts'

const EXIT_ADMITTED = 0
const EXIT_UNMEASURED = 2
const IMMEDIATE_DECISION = '0'
const BYTES_PER_KIB = 1024

export type AdmissionOutcome =
  | { readonly admitted: true }
  | { readonly admitted: false; readonly unmeasured: boolean; readonly detail: string }

export interface ResourceAdmission {
  admitDisk(needBytes: number, path: string): Promise<AdmissionOutcome>
  admitMemory(needBytes: number, containerName: string): Promise<AdmissionOutcome>
  releaseAll(): Promise<void>
}

export class ResourceAdmissionCli implements ResourceAdmission {
  constructor(private readonly admissionBin: string, private readonly ownerPid: number) {}

  admitDisk(needBytes: number, path: string): Promise<AdmissionOutcome> {
    return this.admit(['disk-admit', '--need-bytes', String(needBytes), '--owner', this.owner(), '--path', path, '--timeout', IMMEDIATE_DECISION])
  }

  admitMemory(needBytes: number, containerName: string): Promise<AdmissionOutcome> {
    const needKib = String(Math.ceil(needBytes / BYTES_PER_KIB))
    return this.admit(['admit-ram', needKib, '--owner', this.owner(), '--container', containerName,
      '--memory-limit-kb', needKib, '--timeout', IMMEDIATE_DECISION])
  }

  async releaseAll(): Promise<void> {
    await runCommand(this.admissionBin, ['disk-release', '--owner', this.owner()])
    await runCommand(this.admissionBin, ['release', '--owner', this.owner()])
  }

  private owner(): string {
    return String(this.ownerPid)
  }

  private async admit(argv: readonly string[]): Promise<AdmissionOutcome> {
    const result = await runCommand(this.admissionBin, argv)
    if (result.exitCode === EXIT_ADMITTED) return { admitted: true }
    return { admitted: false, unmeasured: result.exitCode === EXIT_UNMEASURED, detail: result.stderr.trim() }
  }
}
