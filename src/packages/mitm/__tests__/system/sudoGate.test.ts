// Portado de omniroute: tests/unit/mitm-sudo-gate-822.test.ts y
// mitm-privileged-steps-sudo-gate.test.ts (MIT), sobre bun:test. La referencia
// saltaba las ramas que su máquina no tenía; aquí la plataforma, el usuario y
// el `sudo` del PATH se fijan por caso, para que cada rama se ejercite siempre.
import { afterEach, test } from 'bun:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { canRunSudoWithoutPassword, isSudoPasswordRequired } from '../../src/dns/dnsConfig.ts'
import { runPrivilegedMitmStep } from '../../src/privilegedMitmStep.ts'
import {
  canRunPrivilegedMitmSteps,
  isMitmSudoPasswordRequired,
  normalizeMitmSudoPasswordInput,
  resolveMitmSudoPassword,
} from '../../src/sudoGate.ts'

const cleanups: Array<() => void> = []
afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()!()
})

function withPlatform(platform: NodeJS.Platform): void {
  const original = os.platform
  ;(os as { platform: () => NodeJS.Platform }).platform = () => platform
  cleanups.push(() => {
    ;(os as { platform: () => NodeJS.Platform }).platform = original
  })
}

function withUid(uid: number): void {
  const original = process.getuid
  process.getuid = () => uid
  cleanups.push(() => {
    process.getuid = original
  })
}

// Un PATH con sólo `sh` y un `sudo` falso cuyo `-n true` sale con `exitCode`;
// sin `exitCode`, un PATH donde `sudo` no existe.
function withFakeSudo(exitCode?: number): void {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'thyrox-sudo-'))
  fs.symlinkSync('/bin/sh', path.join(dir, 'sh'))
  if (exitCode !== undefined) {
    fs.writeFileSync(path.join(dir, 'sudo'), `#!/bin/sh\nexit ${exitCode}\n`, { mode: 0o755 })
  }
  const previous = process.env.PATH
  process.env.PATH = dir
  cleanups.push(() => {
    process.env.PATH = previous
    fs.rmSync(dir, { recursive: true, force: true })
  })
}

test('normalizeMitmSudoPasswordInput treats whitespace and null as missing', () => {
  assert.equal(normalizeMitmSudoPasswordInput('  '), '')
  assert.equal(normalizeMitmSudoPasswordInput(null), '')
  assert.equal(normalizeMitmSudoPasswordInput(undefined), '')
  assert.equal(normalizeMitmSudoPasswordInput(' pw '), 'pw')
})

test('resolveMitmSudoPassword prefers the body and falls back to the cache', () => {
  assert.equal(resolveMitmSudoPassword(' body ', 'cached'), 'body')
  assert.equal(resolveMitmSudoPassword('   ', ' cached '), 'cached')
  assert.equal(resolveMitmSudoPassword(undefined, null), '')
})

test('a non-root user whose sudo asks for a password needs one', () => {
  withPlatform('linux')
  withUid(1000)
  withFakeSudo(1)
  assert.equal(canRunSudoWithoutPassword(), false)
  assert.equal(isSudoPasswordRequired(), true)
  assert.equal(isMitmSudoPasswordRequired(''), true)
  assert.equal(isMitmSudoPasswordRequired('   '), true)
  assert.equal(canRunPrivilegedMitmSteps(''), false)
})

test('a given password, NOPASSWD sudo or no sudo at all lift the gate', () => {
  withPlatform('linux')
  withUid(1000)
  withFakeSudo(1)
  assert.equal(isMitmSudoPasswordRequired('pw'), false)
  cleanups.pop()!()
  withFakeSudo(0)
  assert.equal(isMitmSudoPasswordRequired(''), false)
  cleanups.pop()!()
  withFakeSudo()
  assert.equal(isSudoPasswordRequired(), false)
  assert.equal(isMitmSudoPasswordRequired(''), false)
})

test('Windows and root never need a sudo password', () => {
  withUid(1000)
  withFakeSudo(1)
  withPlatform('win32')
  assert.equal(isMitmSudoPasswordRequired(''), false)
  cleanups.pop()!()
  withPlatform('linux')
  withUid(0)
  assert.equal(isMitmSudoPasswordRequired(''), false)
  assert.equal(canRunPrivilegedMitmSteps(''), true)
})

test('runPrivilegedMitmStep skips the step when the gate is closed [#7938]', async () => {
  withPlatform('linux')
  withUid(1000)
  withFakeSudo(1)
  let ran = 0
  await runPrivilegedMitmStep('', 'skipping DNS', async () => {
    ran++
  })
  assert.equal(ran, 0)
  await runPrivilegedMitmStep('pw', 'skipping DNS', async () => {
    ran++
  })
  assert.equal(ran, 1)
})
