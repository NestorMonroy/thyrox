/**
 * El adaptador de admisión contra el `bin/resource_admission` real, con su
 * registro aislado y un `disk-headroom` falso que publica el techo: el
 * contrato que se prueba es el de la CLI, no el de un doble del adaptador.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { createDiskAdmission } from '../diskAdmission.js'

const THYROX_ROOT = resolve(import.meta.dir, '../../../..')
const MIB = 1024 * 1024
const ENV_KEYS = ['THYROX_DISK_ADMISSION_LEDGER', 'THYROX_DISK_ADMISSION_FLOOR_MB', 'THYROX_DISK_ADMISSION_HEADROOM'] as const

let workdir: string
let saved: Record<string, string | undefined>
beforeEach(() => {
  workdir = mkdtempSync(join(tmpdir(), 'disk-admission-'))
  saved = Object.fromEntries(ENV_KEYS.map(key => [key, process.env[key]]))
  const headroom = join(workdir, 'disk-headroom')
  writeFileSync(headroom, `#!/usr/bin/env bash\n[[ " $* " == *' --ceiling-bytes '* ]] && printf '%s\\n' '${10 * MIB}'\nexit 3\n`)
  chmodSync(headroom, 0o755)
  process.env.THYROX_DISK_ADMISSION_LEDGER = join(workdir, 'disk.json')
  process.env.THYROX_DISK_ADMISSION_FLOOR_MB = '2'
  process.env.THYROX_DISK_ADMISSION_HEADROOM = headroom
})
afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key]
    else process.env[key] = saved[key]
  }
  rmSync(workdir, { recursive: true, force: true })
})

describe('createDiskAdmission', () => {
  test('lo que cabe bajo el techo menos el piso se admite y queda reservado a nombre del PID', async () => {
    const admission = createDiskAdmission({ thyroxRoot: THYROX_ROOT, path: workdir, ownerPid: process.pid })
    expect(await admission.admit(4 * MIB)).toBe('admitted')
    expect(JSON.parse(readFileSync(join(workdir, 'disk.json'), 'utf8'))).toMatchObject({ [String(process.pid)]: 4 * MIB })
    await admission.release()
  }, 30_000)

  test('lo que no cabe con el piso se rehúsa en el acto, sin reducir el margen', async () => {
    const admission = createDiskAdmission({ thyroxRoot: THYROX_ROOT, path: workdir, ownerPid: process.pid })
    expect(await admission.admit(9 * MIB)).toBe('refused')
  }, 30_000)
})
