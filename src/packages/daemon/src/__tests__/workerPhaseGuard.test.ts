/**
 * `WorkerVm#transitionTo` — toda asignación a `this.phase` (salvo el valor
 * inicial del constructor) pasa por la guarda de `isLegalPhaseTransition`.
 * `ant chunk-ygx717jg.js`, clase `g7`, método `transitionTo`.
 */

import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { WorkerVm } from '../workerVm.js'
import { getLocalObservability, installLocalObservability } from '@thyrox/local-observability'

const originalObservability = getLocalObservability()

function captureEvents(): {
  events: Array<{ name: string; metadata?: Record<string, unknown> }>
  restore: () => void
} {
  const events: Array<{ name: string; metadata?: Record<string, unknown> }> = []
  installLocalObservability({
    logger: {
      ...originalObservability.logger,
      event: (name, metadata) => {
        events.push({ name, metadata })
      },
    },
  })
  return { events, restore: () => installLocalObservability(originalObservability) }
}

// `spawn()` persiste meta.json bajo `<configHome>/jobs/<short>/` (ant
// `writeWorkerRecord`, `bgWorkerRegistry.ts`). Cada test apunta
// THYROX_CONFIG_DIR a un directorio propio de `mkdtemp` y lo restaura al
// terminar — nada de `/tmp` fijo, y `process.env` vuelve a su valor previo.
let savedConfigDir: string | undefined
let tmpRoot: string

beforeEach(() => {
  savedConfigDir = process.env.THYROX_CONFIG_DIR
  tmpRoot = mkdtempSync(join(tmpdir(), 'thyrox-worker-phase-guard-'))
  process.env.THYROX_CONFIG_DIR = tmpRoot
})

afterEach(() => {
  if (savedConfigDir === undefined) delete process.env.THYROX_CONFIG_DIR
  else process.env.THYROX_CONFIG_DIR = savedConfigDir
  rmSync(tmpRoot, { recursive: true, force: true })
})

function makeVm(short: string): WorkerVm {
  mkdirSync(join(tmpRoot, 'jobs', short), { recursive: true })
  return new WorkerVm({
    short,
    cwd: process.cwd(),
    env: process.env,
    ptySocket: '',
    cmd: ['true'],
    cliVersion: '0.0.0-test',
  })
}

describe('WorkerVm#spawn: transición legal spawning -> running', () => {
  test('spawn() con un comando real deja la fase en running', () => {
    const { restore } = captureEvents()
    try {
      const vm = makeVm('phg00001')
      expect(vm.getPhase().kind).toBe('spawning')
      vm.spawn()
      expect(vm.getPhase().kind).toBe('running')
    } finally {
      restore()
    }
  })
})

describe('WorkerVm#kill tras settle: transición ilegal retired -> retiring', () => {
  test('kill() después de forceSettle no muta la fase ni manda señal, y avisa', () => {
    const { events, restore } = captureEvents()
    try {
      const vm = makeVm('phg00002')
      vm.spawn()
      vm.forceSettle('killed')
      expect(vm.getPhase()).toEqual({ kind: 'retired', outcome: 'killed' })

      vm.kill('reap')

      // Control de anulación (mental, no de código): sin la guarda,
      // kill() reasignaría this.phase = {kind:'retiring',...} sin mirar
      // que ya estaba retired — este assert caería.
      expect(vm.getPhase()).toEqual({ kind: 'retired', outcome: 'killed' })
      const illegal = events.filter(e => e.name === 'tengu_bg_phase_illegal')
      expect(illegal.length).toBe(1)
      expect(illegal[0]?.metadata).toEqual({})
    } finally {
      restore()
    }
  })
})

describe('WorkerVm#forceSettle dos veces: la segunda es ilegal (retired -> retired)', () => {
  test('el segundo settle no sobreescribe el outcome del primero', () => {
    const { events, restore } = captureEvents()
    try {
      const vm = makeVm('phg00003')
      vm.spawn()
      vm.forceSettle('done')
      vm.forceSettle('killed')
      expect(vm.getPhase()).toEqual({ kind: 'retired', outcome: 'done' })
      const illegal = events.filter(e => e.name === 'tengu_bg_phase_illegal')
      expect(illegal.length).toBe(1)
    } finally {
      restore()
    }
  })
})

describe('WorkerVm#kill: transición legal running -> retiring', () => {
  test('kill(grace) desde running muta la fase y emite tengu_bg_retired', () => {
    const { events, restore } = captureEvents()
    try {
      const vm = makeVm('phg00004')
      vm.spawn()
      vm.kill('grace')
      expect(vm.getPhase()).toEqual({ kind: 'retiring', reason: 'grace' })
      const retired = events.filter(e => e.name === 'tengu_bg_retired')
      expect(retired.length).toBe(1)
    } finally {
      restore()
    }
  })
})
