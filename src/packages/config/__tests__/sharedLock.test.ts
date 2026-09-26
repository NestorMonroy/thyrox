/**
 * La cara .ts del lock de estado compartido.
 *
 * El lock es un protocolo en disco que thyrox escribe desde .py
 * (`src/session/shared_lock.py`), .sh (`bin/shared_lock`) y .ts. Aquí el
 * mecanismo es `proper-lockfile` —el mismo que empaqueta el ejecutable
 * 2.1.282, ver `.claude/workbench/lock-port-20260926T202249/`— y esta cara
 * le añade el dueño al lado del lock, con el inodo del directorio.
 *
 * Los casos cruzados son el punto: un lock tomado desde una lengua tiene que
 * verse tomado desde las otras dos.
 */
import { describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { lockPath, ownerPath, readOwner, withSharedLock } from '../sharedLock.ts'

const ROOT = join(import.meta.dir, '../../../..')
const PYTHON_HOLDER = `
import sys, time
from session import shared_lock as sl
with sl.held(sys.argv[1], run_id="python", stale_s=5, update_s=1):
    print("tomado", flush=True)
    time.sleep(3)
`

function fresh(): string {
  return join(mkdtempSync(join(tmpdir(), 'shared-lock-')), 'setups.jsonl')
}

describe('withSharedLock', () => {
  test('el lock queda vacío, el dueño al lado con su inodo, y se retira al salir', async () => {
    const target = fresh()
    const seen = await withSharedLock(target, { runId: 'ts-1', stepId: 'step-160' }, async () => {
      const owner = JSON.parse(readFileSync(ownerPath(target), 'utf8'))
      return {
        empty: readdirSync(lockPath(target)).length,
        owner: [owner.pid, owner.run_id, owner.step_id],
        inode: owner.lock_ino === statSync(lockPath(target)).ino,
      }
    })
    expect(seen).toEqual({ empty: 0, owner: [process.pid, 'ts-1', 'step-160'], inode: true })
    expect(existsSync(lockPath(target))).toBe(false)
    expect(existsSync(ownerPath(target))).toBe(false)
  })

  test('tomado desde .py: .ts recibe ELOCKED y lee al dueño de python', async () => {
    const target = fresh()
    const holder = Bun.spawn(['python3', '-c', PYTHON_HOLDER, target], {
      cwd: ROOT, env: { ...process.env, PYTHONPATH: join(ROOT, 'src') }, stdout: 'pipe',
    })
    const reader = holder.stdout.getReader()
    await reader.read()
    let code = ''
    try {
      await withSharedLock(target, { runId: 'ts-2' }, async () => undefined)
    } catch (error) {
      code = (error as { code?: string }).code ?? ''
    }
    expect(code).toBe('ELOCKED')
    expect(readOwner(target)?.pid).toBe(holder.pid)
    await holder.exited
  })

  test('tomado desde .ts: bin/shared_lock sale 3 sin correr el comando', async () => {
    const target = fresh()
    const marker = `${target}.corrio`
    const code = await withSharedLock(target, { runId: 'ts-3' }, async () =>
      Bun.spawnSync(['bash', join(ROOT, 'bin/shared_lock'), 'run', target, '--', 'touch', marker]).exitCode)
    expect(code).toBe(3)
    expect(existsSync(marker)).toBe(false)
  })
})
