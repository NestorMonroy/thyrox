import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import {
  clearGrowthBookConfigOverrides,
  setGrowthBookConfigOverride,
} from '@thyrox/config/feature-flags'

import { formatCommandUnavailableMessage } from '../daemonCli.js'
import { daemonMain, getDaemonBgDispatchFlags, resolveDaemonBgExecution } from '../main.js'

// Porte del gating de `wa` (`chunk-92tvramn.js`, referencia 2.1.283):
// `rn.has(k)&&!(k==="remote-control"?s7e("remoteControl"):pV())` →
// `rDe("daemon "+k)`. En el binario `pV()` es un stub que siempre da
// false, así que la conducta observable es: `list`/`scheduled` se
// rehúsan siempre, `hub` se degrada a `status`, y `remote-control`
// depende de su propio gate.

describe('formatCommandUnavailableMessage (rDe)', () => {
  test('texto por defecto de rDe', () => {
    expect(formatCommandUnavailableMessage('daemon list')).toBe(
      "'daemon list' is not available in this environment.",
    )
  })
})

describe('getDaemonBgDispatchFlags', () => {
  beforeEach(() => clearGrowthBookConfigOverrides())
  afterEach(() => clearGrowthBookConfigOverrides())

  test('pV es siempre falso; remote-control sigue su gate', () => {
    expect(getDaemonBgDispatchFlags()).toEqual({ remoteControlAvailable: false, remoteControlFeatureEnabled: false })
    setGrowthBookConfigOverride('tengu_radiant_heron', true)
    expect(getDaemonBgDispatchFlags()).toEqual({ remoteControlAvailable: false, remoteControlFeatureEnabled: true })
  })
})

function captureStderr(): { lines: string[]; restore: () => void } {
  const lines: string[] = []
  const original = process.stderr.write.bind(process.stderr)
  process.stderr.write = ((chunk: string | Uint8Array) => {
    lines.push(String(chunk))
    return true
  }) as typeof process.stderr.write
  return { lines, restore: () => (process.stderr.write = original) }
}

describe('daemonMain bg — gating de subcomandos', () => {
  let previousExitCode: typeof process.exitCode
  beforeEach(() => {
    previousExitCode = process.exitCode
    process.exitCode = 0
    clearGrowthBookConfigOverrides()
  })
  afterEach(() => {
    process.exitCode = previousExitCode
    clearGrowthBookConfigOverrides()
  })

  test('bg list se rehúsa con el mensaje de rDe y exit 1', async () => {
    const stderr = captureStderr()
    try {
      await daemonMain(['bg', 'list'])
    } finally {
      stderr.restore()
    }
    expect(stderr.lines).toEqual(["'daemon list' is not available in this environment.\n"])
    expect(process.exitCode).toBe(1)
  })

  test('bg scheduled se rehúsa igual', async () => {
    const stderr = captureStderr()
    try {
      await daemonMain(['bg', 'scheduled'])
    } finally {
      stderr.restore()
    }
    expect(stderr.lines).toEqual(["'daemon scheduled' is not available in this environment.\n"])
  })

  test('bg remote-control con su gate cerrado se rehúsa', async () => {
    const stderr = captureStderr()
    try {
      await daemonMain(['bg', 'remote-control'])
    } finally {
      stderr.restore()
    }
    expect(stderr.lines).toEqual(["'daemon remote-control' is not available in this environment.\n"])
  })

  test('bg remote-control con el gate abierto pasa el gating (y cae en desconocido: no portado)', async () => {
    setGrowthBookConfigOverride('tengu_radiant_heron', true)
    const stderr = captureStderr()
    try {
      await daemonMain(['bg', 'remote-control'])
    } finally {
      stderr.restore()
    }
    expect(stderr.lines).toEqual(['Unknown daemon bg subcommand: remote-control\n'])
  })
})

describe('resolveDaemonBgExecution (on + wa)', () => {
  beforeEach(() => clearGrowthBookConfigOverrides())

  test('sin subcomando en TTY, hub se degrada a status y corre', () => {
    expect(resolveDaemonBgExecution([], true)).toEqual({ action: 'run', sub: 'status' })
  })

  test('sin subcomando fuera de TTY corre run', () => {
    expect(resolveDaemonBgExecution([], false)).toEqual({ action: 'run', sub: 'run' })
  })

  test('status no está gateado', () => {
    expect(resolveDaemonBgExecution(['status'], false)).toEqual({ action: 'run', sub: 'status' })
  })

  test('list se rehúsa', () => {
    expect(resolveDaemonBgExecution(['list'], false)).toEqual({ action: 'refuse', sub: 'list' })
  })
})
