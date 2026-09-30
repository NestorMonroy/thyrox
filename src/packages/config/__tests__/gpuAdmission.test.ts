/**
 * La cara .ts de la admisión por VRAM.
 *
 * La implementación es UNA: `src/session/gpu_monitor.py` (registro, medida,
 * decisión y reserva bajo `shared_lock`). El shell la usa por `bin/gpu_monitor`
 * y esta cara también: lanza el mismo envoltorio y traduce su código de
 * salida. Por eso el caso que importa es el cruzado: una admisión desde
 * Python y otra desde TS sobre el mismo registro no pueden tomar la misma
 * VRAM libre.
 */
import { describe, expect, test } from 'bun:test'
import { chmodSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'

import { admitVram, releaseVram } from '../gpuAdmission.ts'

const ROOT = join(import.meta.dir, '../../../..')
const GPU = join(ROOT, 'bin/gpu_monitor')

/** Un nvidia-smi falso: 5000 MiB libres y ningún proceso en la GPU. */
function fakeGpu(): { dir: string; smi: string; ledger: string } {
  const dir = mkdtempSync(join(tmpdir(), 'gpu-admission-'))
  const smi = join(dir, 'nvidia-smi')
  writeFileSync(smi, [
    '#!/usr/bin/env bash',
    'case "$*" in',
    '  *--query-compute-apps*) : ;;',
    '  *utilization.gpu*) echo "0, 0" ;;',
    '  *memory.free*) echo "0, 5000" ;;',
    'esac',
    '',
  ].join('\n'))
  chmodSync(smi, 0o755)
  return { dir, smi, ledger: join(dir, 'vram.json') }
}

/** Un dueño vivo mientras dura el caso: su reserva sigue contando. */
function liveOwner(): { pid: number; stop: () => void } {
  const child = spawn('sleep', ['30'], { stdio: 'ignore' })
  return { pid: child.pid as number, stop: () => child.kill() }
}

function pythonAdmit(need: number, ledger: string, owner: number, smi: string): Promise<number> {
  return new Promise(resolve => {
    const child = spawn('bash', [GPU, 'admit', String(need), '--ledger', ledger, '--owner', String(owner),
      '--nvidia-smi', smi, '--timeout', '1', '--interval', '0.1'], { stdio: 'ignore' })
    child.on('close', code => resolve(code ?? -1))
  })
}

describe('admitVram', () => {
  test('Python y TS a la vez, 3000 cada uno con 5000 libres: entra uno solo', async () => {
    const { smi, ledger } = fakeGpu()
    const a = liveOwner()
    const b = liveOwner()
    try {
      const [py, ts] = await Promise.all([
        pythonAdmit(3000, ledger, a.pid, smi),
        admitVram({ needMib: 3000, ledger, ownerPid: b.pid, nvidiaSmi: smi, timeoutS: 1, intervalS: 0.1 }),
      ])
      const admitted = [py === 0, ts === 'admitted'].filter(Boolean).length
      expect(admitted).toBe(1)
      expect(Object.keys(JSON.parse(readFileSync(ledger, 'utf8'))).length).toBe(1)
    } finally {
      a.stop()
      b.stop()
    }
  })

  test('la reserva de TS la ve Python, y soltarla le deja sitio', async () => {
    const { smi, ledger } = fakeGpu()
    const a = liveOwner()
    const b = liveOwner()
    try {
      expect(await admitVram({ needMib: 3000, ledger, ownerPid: a.pid, nvidiaSmi: smi, timeoutS: 1, intervalS: 0.1 }))
        .toBe('admitted')
      expect(await pythonAdmit(3000, ledger, b.pid, smi)).toBe(3)
      await releaseVram({ ledger, ownerPid: a.pid })
      expect(await pythonAdmit(3000, ledger, b.pid, smi)).toBe(0)
    } finally {
      a.stop()
      b.stop()
    }
  })

  test('sin sitio, vence el plazo: timeout, no admitido', async () => {
    const { smi, ledger } = fakeGpu()
    expect(await admitVram({ needMib: 6000, ledger, ownerPid: process.pid, nvidiaSmi: smi, timeoutS: 0.3, intervalS: 0.1 }))
      .toBe('timeout')
    expect(existsSync(ledger) ? Object.keys(JSON.parse(readFileSync(ledger, 'utf8'))).length : 0).toBe(0)
  })

  test('si la herramienta no corre, es un error y no un «no admitido»', async () => {
    const { smi, ledger } = fakeGpu()
    const empty = mkdtempSync(join(tmpdir(), 'no-thyrox-'))
    await expect(admitVram({ needMib: 1, ledger, ownerPid: process.pid, nvidiaSmi: smi, thyroxRoot: empty }))
      .rejects.toThrow(/gpu_monitor/)
  })
})
