/**
 * TASK-THYROX-0504 — el barrido (`xut`/`sweepRegistry`) cableado en el
 * arranque de `bin/cli`: `sessionRegistryAtLaunch.ts` ya no cuenta con
 * `listAllLiveSessions().length` (una sustituta emparentada, pero distinta
 * de lo que la referencia corre en este punto) sino con
 * `sweepSessionRegistryAtLaunch`, que reenvía a la MISMA `sweepRegistry`
 * que `chunk-bdv29443.js` invoca tras `KNt(E)` (`startSessionRegistration`).
 *
 * `sweepSessionRegistryAtLaunch` se prueba aquí con `RegistrySweepDeps`
 * inyectadas —no vía el subproceso real de `sessionRegistryAtLaunch.e2e
 * .test.ts`— porque `probeRegistrySweepPermitted` (el permiso real del
 * barrido) exige `isInteractive()`, y ninguno de los dos caminos de ese
 * arnés (`--chat` con stdin en pipe, `-p`) corre contra una TTY: en este
 * contenedor la deleción real nunca sería observable desde ese subproceso,
 * con o sin el cableado — no es un hueco de cobertura, es la propia
 * conservadurería del barrido (nunca borra sin permiso).
 */
import { describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { sweepSessionRegistryAtLaunch } from '../sessionRegistryAtLaunch.ts'
import type { RegistrySweepDeps } from '@thyrox/local-observability/uds/registrySweep.js'
import { SessionRegistryState } from '@thyrox/local-observability/uds/sessionRegistryState.js'

const DOMAIN = 'linux:m:ns'

let dir: string
function deps(dead: number[], alive: number[] = [], overrides: Partial<RegistrySweepDeps> = {}): RegistrySweepDeps {
  const state = new SessionRegistryState({ now: () => 0, sessionId: () => 's', stableAddress: () => false, probeRegistrySweep: async () => true })
  return {
    sessionsDir: () => dir,
    pid: 1,
    platform: () => 'linux',
    isInteractive: () => true,
    homedir: () => '/home/u',
    version: '2.0.0',
    now: () => 61000,
    isProcessGone: pid => dead.includes(pid),
    isProcessAlive: pid => alive.includes(pid),
    ownPidDomain: async () => DOMAIN,
    sleep: async () => {},
    log: () => {},
    logEvent: () => {},
    isEmbeddedEntrypoint: entrypoint => entrypoint === 'embedded',
    state: () => state,
    ...overrides,
  }
}

describe('sessionRegistryAtLaunch.ts:countLiveSessions usa el código fuente de sweepSessionRegistryAtLaunch', () => {
  test('el campo cablea sweepSessionRegistryAtLaunch(), no listAllLiveSessions().length', () => {
    const source = readFileSync(join(import.meta.dir, '..', 'sessionRegistryAtLaunch.ts'), 'utf8')
    expect(source).toContain('countLiveSessions: () => sweepSessionRegistryAtLaunch()')
    expect(source).not.toContain('countLiveSessions: async () => (await listAllLiveSessions()).length')
  })
})

describe('sweepSessionRegistryAtLaunch (TASK-THYROX-0504)', () => {
  test('un registro de un pid muerto sembrado antes de arrancar desaparece tras el barrido', async () => {
    dir = mkdtempSync(join(tmpdir(), 'sweep-at-launch-'))
    const deadPidFile = join(dir, '999999.json')
    writeFileSync(deadPidFile, JSON.stringify({ pid: 999999, sessionId: 'dead', startedAt: 0, kind: 'interactive', pidDomain: DOMAIN }))

    const live = await sweepSessionRegistryAtLaunch(deps([999999]))

    expect(live).toBe(0)
    expect(existsSync(deadPidFile)).toBe(false)
    rmSync(dir, { recursive: true, force: true })
  })

  test('cuenta las vivas y deja su registro intacto', async () => {
    dir = mkdtempSync(join(tmpdir(), 'sweep-at-launch-'))
    const livePidFile = join(dir, '42.json')
    writeFileSync(livePidFile, JSON.stringify({ pid: 42, sessionId: 'live', startedAt: 0, kind: 'interactive', pidDomain: DOMAIN }))

    const live = await sweepSessionRegistryAtLaunch(deps([], [42]))

    expect(live).toBe(1)
    expect(existsSync(livePidFile)).toBe(true)
    rmSync(dir, { recursive: true, force: true })
  })
})
