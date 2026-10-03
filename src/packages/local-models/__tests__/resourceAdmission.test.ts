/**
 * El adaptador de `resource_admission` como holgura de RAM del coordinador de
 * modelos (H-THYROX-448): lee `headroom-ram` en kB y lo da en bytes; si la
 * autoridad no pudo medir, no inventa un cero.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { PodmanExecutor } from '@thyrox/podman-execution/podmanExecutor.ts'

import { ResourceAdmissionCli, unitResourceAdmission } from '../resourceAdmission.ts'

const dirs: string[] = []
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }) })

/** Un doble que registra su argv en `log` y responde a cualquier orden con `body`. */
function recordingAdmission(body: string): { bin: string; log: string } {
  const dir = mkdtempSync(join(tmpdir(), 'resource-admission-'))
  dirs.push(dir)
  const bin = join(dir, 'resource_admission')
  const log = join(dir, 'argv')
  writeFileSync(bin, `#!/usr/bin/env bash\nprintf '%s\\n' "$*" >> '${log}'\n${body}\n`)
  chmodSync(bin, 0o755)
  return { bin, log }
}

/** Un `resource_admission` doble que responde a `headroom-ram` con `body`. */
function fakeAdmission(body: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'resource-admission-'))
  dirs.push(dir)
  const bin = join(dir, 'resource_admission')
  writeFileSync(bin, `#!/usr/bin/env bash\n[[ "$1" == headroom-ram ]] || exit 9\n${body}\n`)
  chmodSync(bin, 0o755)
  return bin
}

describe('ResourceAdmissionCli como holgura de RAM', () => {
  test('availableBytes lee headroom-ram en kB y lo da en bytes', async () => {
    expect(await new ResourceAdmissionCli(fakeAdmission('echo 7158764'), process.pid).availableBytes()).toBe(7_158_764 * 1024)
  })

  test('si la autoridad no pudo medir (exit 2) no hay cifra', async () => {
    expect(await new ResourceAdmissionCli(fakeAdmission('echo nada >&2; exit 2'), process.pid).availableBytes()).toBeUndefined()
  })
})

describe('ResourceAdmissionCli mide en la frontera de la unidad (H-THYROX-471)', () => {
  test('headroom-ram y admit-ram llevan la ubicación derivada como --target-cgroup', async () => {
    const { bin, log } = recordingAdmission('echo 1024')
    const admission = new ResourceAdmissionCli(bin, process.pid, async () => '/units_parent')
    await admission.availableBytes()
    await admission.admitMemory(2048, 'unit-x')
    const lines = readFileSync(log, 'utf8').trim().split('\n')
    expect(lines[0]).toBe('headroom-ram --target-cgroup /units_parent')
    expect(lines[1]).toContain('admit-ram 2 ')
    expect(lines[1]).toContain('--target-cgroup /units_parent')
  })

  test('una ubicación que no se pudo derivar no se mide en la sesión: no hay cifra ni admisión', async () => {
    const { bin, log } = recordingAdmission('echo 1024')
    const admission = new ResourceAdmissionCli(bin, process.pid, async () => { throw new Error('dos padres') })
    expect(await admission.availableBytes()).toBeUndefined()
    const outcome = await admission.admitMemory(2048, 'unit-x')
    expect(outcome).toEqual({ admitted: false, unmeasured: true, detail: 'ubicación de la unidad no derivable: dos padres' })
    expect(existsSync(log)).toBe(false)
  })
})


describe('unitResourceAdmission', () => {
  test('el coordinador y los laboratorios miden donde el runtime informa sus unidades', async () => {
    const root = mkdtempSync(join(tmpdir(), 'unit-admission-'))
    dirs.push(root)
    mkdirSync(join(root, 'bin'))
    const log = join(root, 'argv')
    writeFileSync(join(root, 'bin', 'resource_admission'), `#!/usr/bin/env bash\nprintf '%s\\n' "$*" >> '${log}'\necho 1\n`)
    chmodSync(join(root, 'bin', 'resource_admission'), 0o755)
    const podman = {
      run: async (args: readonly string[]) => args[0] === 'ps'
        ? { exitCode: 0, stdout: 'u\n', stderr: '' }
        : { exitCode: 0, stdout: JSON.stringify([{ Id: 'u', State: { Running: true, CgroupPath: '/observed_parent/libpod-u' }, Config: { Labels: {} } }]), stderr: '' },
    } as unknown as PodmanExecutor
    await unitResourceAdmission(root, podman).availableBytes()
    expect(readFileSync(log, 'utf8').trim()).toBe('headroom-ram --target-cgroup /observed_parent')
  })
})
