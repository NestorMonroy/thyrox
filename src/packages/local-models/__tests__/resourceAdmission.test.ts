/**
 * El adaptador de `resource_admission` como holgura de RAM del coordinador de
 * modelos (H-THYROX-448): lee `headroom-ram` en kB y lo da en bytes; si la
 * autoridad no pudo medir, no inventa un cero.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { ResourceAdmissionCli } from '../resourceAdmission.ts'

const dirs: string[] = []
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }) })

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
