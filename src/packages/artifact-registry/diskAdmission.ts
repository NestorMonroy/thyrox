/**
 * Admisión de disco del laboratorio para una verificación (TASK-THYROX-0728),
 * delegada en `bin/resource_admission`, que mide, decide y RESERVA bajo
 * lock. El margen de seguridad es su piso (`THYROX_DISK_ADMISSION_FLOOR_MB`):
 * este módulo pide el pico del método real y nunca lo reduce.
 *
 * `--timeout 0` hace que una falta de sitio rehúse en el acto en vez de
 * esperar a que otro libere: una publicación no espera en silencio.
 */
import { spawn } from 'node:child_process'
import { join } from 'node:path'

import type { AdmissionVerdict } from './publishArtifact.js'

export interface DiskAdmission {
  admit(needBytes: number): Promise<AdmissionVerdict>
  release(): Promise<void>
}

export interface DiskAdmissionOptions {
  readonly thyroxRoot: string
  /** Ruta cuyo sistema de archivos se mide: donde el trabajo materializa. */
  readonly path: string
  readonly owner: string
}

/** Códigos de `resource_admission disk-admit`: 0 admitido, 3 sin sitio al vencer el plazo, 2 sin medir. */
const ADMISSION_VERDICTS: Readonly<Record<number, AdmissionVerdict>> = { 0: 'admitted', 3: 'refused' }

function run(command: string, args: readonly string[]): Promise<number> {
  return new Promise(resolve => {
    const child = spawn(command, args, { stdio: ['ignore', 'inherit', 'inherit'] })
    child.on('error', () => resolve(-1))
    child.on('close', code => resolve(code ?? -1))
  })
}

export function createDiskAdmission(options: DiskAdmissionOptions): DiskAdmission {
  const admissionBin = join(options.thyroxRoot, 'bin', 'resource_admission')
  return {
    async admit(needBytes) {
      const exitCode = await run('bash', [admissionBin, 'disk-admit', '--need-bytes', String(needBytes), '--owner', options.owner, '--path', options.path, '--timeout', '0'])
      return ADMISSION_VERDICTS[exitCode] ?? 'unmeasured'
    },
    async release() {
      await run('bash', [admissionBin, 'disk-release', '--owner', options.owner])
    },
  }
}
