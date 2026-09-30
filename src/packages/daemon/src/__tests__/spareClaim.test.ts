/**
 * Protocolo de claim del spare pool — puerto de `chunk-ygx717jg.js`
 * `xt`/`Bt`/`Ft`/`Ut`/`P9n`/`O9n` (ant 4644.js). Cada bloque de tests
 * ejercita la pieza contra un socket Unix real en un tmpdir aislado: el
 * baile de trama/backoff/limpieza ES la lógica bajo prueba.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { createServer, type Server, type Socket } from 'node:net'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { installLocalObservability } from '@thyrox/local-observability'

import {
  CWD_PROBE_TIMEOUT_MS,
  DISPATCH_SWEEP_INTERVAL_MS,
  PREWARM_BURST_STEP_DELAY_MS,
  PREWARM_BURST_WINDOW_MS,
  SPARE_REFILL_MIN_GAP_MS,
  WORKER_RETIRE_AGE_LOW_MEM_MS,
  WORKER_RETIRE_AGE_MS,
  WORKER_RETIRE_HARD_AGE_MS,
  WORKER_RETIRE_MONITOR_ONLY_AGE_MS,
} from '../sparePool.js'
import {
  SPARE_CLAIM_AUTH_ENV,
  SPARE_CLAIM_RETRY_BACKOFF_MS,
  SPARE_CLAIM_SEND_BUDGET_MS,
  buildSpareClaimFrame,
  claimSpareWorker,
  resolveClaimAuth,
  sendSpareFrameOnce,
  sendSpareFrameWithRetry,
  startPpidWatchdog,
  sweepOrphanSpareSockets,
  terminateSpareSocket,
} from '../spareClaim.js'

const ISOLATED_DIR = mkdtempSync(join(tmpdir(), 'ccb-spare-claim-test-'))
let sockSeq = 0
function freshSockPath(): string {
  return join(ISOLATED_DIR, `spare-${process.pid}-${sockSeq++}.sock`)
}

const noOpLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  event: () => {},
}
afterEach(() => {
  installLocalObservability({ logger: noOpLogger })
})

describe('umbrales-y-estado-de-spare-pool (chunk-92tvramn.js DECL)', () => {
  test('valores fieles a la referencia', () => {
    expect(WORKER_RETIRE_AGE_MS).toBe(3_600_000)
    expect(WORKER_RETIRE_AGE_LOW_MEM_MS).toBe(60_000)
    expect(WORKER_RETIRE_MONITOR_ONLY_AGE_MS).toBe(28_800_000)
    expect(WORKER_RETIRE_HARD_AGE_MS).toBe(28_800_000)
    expect(DISPATCH_SWEEP_INTERVAL_MS).toBe(60_000)
    expect(PREWARM_BURST_STEP_DELAY_MS).toBe(2_000)
    expect(PREWARM_BURST_WINDOW_MS).toBe(300_000)
    expect(SPARE_REFILL_MIN_GAP_MS).toBe(2_000)
    expect(CWD_PROBE_TIMEOUT_MS).toBe(1_000)
  })
})

describe('resolveClaimAuth (xt)', () => {
  const original = process.env[SPARE_CLAIM_AUTH_ENV]
  afterEach(() => {
    if (original === undefined) delete process.env[SPARE_CLAIM_AUTH_ENV]
    else process.env[SPARE_CLAIM_AUTH_ENV] = original
  })

  test('lee el secreto y lo borra del entorno', () => {
    process.env[SPARE_CLAIM_AUTH_ENV] = 'sekret-123'
    expect(resolveClaimAuth()).toBe('sekret-123')
    expect(process.env[SPARE_CLAIM_AUTH_ENV]).toBeUndefined()
  })

  test('undefined cuando no hay env var', () => {
    delete process.env[SPARE_CLAIM_AUTH_ENV]
    expect(resolveClaimAuth()).toBeUndefined()
  })
})

describe('buildSpareClaimFrame (Bt)', () => {
  test('arma cwd/env/argv/sessionId/auth', () => {
    const frame = buildSpareClaimFrame({
      cwd: '/repo',
      sessionId: 'sess-1',
      env: { FOO: 'bar' },
      argv: ['ccb', '--bg-pty'],
      auth: 'auth-1',
    })
    expect(frame).toEqual({
      t: 'claim',
      cwd: '/repo',
      sessionId: 'sess-1',
      env: { FOO: 'bar' },
      argv: ['ccb', '--bg-pty'],
      auth: 'auth-1',
    })
  })
})

/** Decodifica UNA trama del layout de `internal/ptyFrame.ts` (4B len BE + 1B tag + JSON). */
function readOneCtrlFrame(sock: Socket): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let buf = Buffer.alloc(0)
    sock.on('data', (chunk: Buffer) => {
      buf = Buffer.concat([buf, chunk])
      if (buf.length < 5) return
      const len = buf.readUInt32BE(0)
      if (buf.length < 5 + len) return
      try {
        resolve(JSON.parse(buf.subarray(5, 5 + len).toString('utf8')))
      } catch (e) {
        reject(e)
      }
    })
    sock.on('error', reject)
  })
}

describe('sendSpareFrameOnce (Ft)', () => {
  let server: Server
  let sockPath: string

  beforeEach(() => {
    sockPath = freshSockPath()
  })
  afterEach(() => {
    server?.close()
  })

  test('conecta una vez, escribe la trama y cierra', async () => {
    const received = new Promise<unknown>((resolve) => {
      server = createServer((sock) => {
        readOneCtrlFrame(sock).then(resolve)
      })
    })
    await new Promise<void>((resolve) => server.listen(sockPath, resolve))

    await sendSpareFrameOnce(sockPath, buildSpareClaimFrame({ cwd: '/x', sessionId: 's' }))
    expect(await received).toEqual({ t: 'claim', cwd: '/x', sessionId: 's' })
  })

  test('rechaza cuando el socket no existe', async () => {
    await expect(sendSpareFrameOnce(join(ISOLATED_DIR, 'nope.sock'), buildSpareClaimFrame({}))).rejects.toBeDefined()
  })
})

describe('sendSpareFrameWithRetry (Ut)', () => {
  let server: Server | undefined
  let sockPath: string

  beforeEach(() => {
    sockPath = freshSockPath()
    server = undefined
  })
  afterEach(() => {
    server?.close()
  })

  test('reintenta ENOENT hasta que el socket aparece, dentro del presupuesto', async () => {
    const received = new Promise<unknown>((resolve) => {
      server = createServer((sock) => {
        readOneCtrlFrame(sock).then(resolve)
      })
    })
    setTimeout(() => {
      server!.listen(sockPath)
    }, 120)

    await sendSpareFrameWithRetry(sockPath, buildSpareClaimFrame({ sessionId: 'late' }), 2000)
    expect(await received).toEqual({ t: 'claim', sessionId: 'late' })
  })

  test('agota el presupuesto y lanza si el socket nunca aparece', async () => {
    await expect(
      sendSpareFrameWithRetry(join(ISOLATED_DIR, 'never.sock'), buildSpareClaimFrame({}), 150),
    ).rejects.toThrow(/timeout/)
  })
})

describe('control de anulación: SPARE_CLAIM_RETRY_BACKOFF_MS / SPARE_CLAIM_SEND_BUDGET_MS existen y se usan', () => {
  test('la tabla de backoff es la de la referencia (it)', () => {
    expect(SPARE_CLAIM_RETRY_BACKOFF_MS).toEqual([50, 100, 150, 200, 250, 300, 400, 500, 500, 500])
  })
  test('el presupuesto por defecto es 5s', () => {
    expect(SPARE_CLAIM_SEND_BUDGET_MS).toBe(5000)
  })
})

describe('terminateSpareSocket (mitad de limpieza de P9n)', () => {
  test('manda una trama kill SIGTERM', async () => {
    const sockPath = freshSockPath()
    const received = new Promise<unknown>((resolve) => {
      const server = createServer((sock) => {
        readOneCtrlFrame(sock).then((f) => {
          resolve(f)
          server.close()
        })
      })
      server.listen(sockPath)
    })
    // Espera a que el listener esté atado antes de conectar.
    await new Promise((r) => setTimeout(r, 50))
    terminateSpareSocket(sockPath)
    expect(await received).toEqual({ t: 'kill', sig: 'SIGTERM' })
  })

  test('no lanza cuando el socket no existe (fire-and-forget)', () => {
    expect(() => terminateSpareSocket(join(ISOLATED_DIR, 'ghost.sock'))).not.toThrow()
  })
})

describe('claimSpareWorker (P9n)', () => {
  test('ok:true cuando el envío tiene éxito', async () => {
    const sockPath = freshSockPath()
    const server = createServer((sock) => {
      readOneCtrlFrame(sock).catch(() => {})
    })
    await new Promise<void>((resolve) => server.listen(sockPath, resolve))

    const r = await claimSpareWorker({ short: 'abc12345', ptySocket: sockPath, cwd: '/x', sessionId: 's' })
    expect(r).toEqual({ ok: true })
    server.close()
  })

  test('ok:false clasificado (timeout de presupuesto → "error") + limpieza SIGTERM cuando el envío falla', async () => {
    // ant 4644.js P9n: un `Ut` que agota el presupuesto lanza un Error
    // llano ("send-claim timeout"), sin `.code` — clasifica como "error",
    // no "enoent" (ese código sólo llega si Ut relanza el ENOENT crudo
    // tras agotar la TABLA de backoff, no el presupuesto).
    const events: Array<{ name: string; metadata: Record<string, unknown> }> = []
    installLocalObservability({
      logger: {
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        event: (name, metadata) => events.push({ name, metadata: metadata as Record<string, unknown> }),
      },
    })

    const r = await claimSpareWorker(
      { short: 'dead0001', ptySocket: join(ISOLATED_DIR, 'never2.sock'), cwd: '/x', sessionId: 's' },
      { budgetMs: 150 },
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('error')
    expect(events).toEqual([
      { name: 'tengu_bg_sendclaim_failed', metadata: { reason: 'error', short: 'dead0001' } },
    ])
  })

  test('ok:false clasificado "enoent" cuando la tabla de backoff se agota sin presupuesto de por medio', async () => {
    // Presupuesto generoso (10s) para que el límite real sea la TABLA
    // (10 intentos, suma de backoff ~2.95s) y no el reloj: el error que
    // llega al clasificador es el ENOENT crudo del último intento.
    const r = await claimSpareWorker(
      { short: 'dead0002', ptySocket: join(ISOLATED_DIR, 'never3.sock'), cwd: '/x', sessionId: 's' },
      { budgetMs: 10_000 },
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('enoent')
  }, 10_000)
})

describe('startPpidWatchdog (mitad de AVo)', () => {
  test('dispara onOrphan cuando el ppid cambia', async () => {
    let orphaned = false
    let ppid = 111
    const stop = startPpidWatchdog(() => { orphaned = true }, 10, () => ppid)
    await new Promise((r) => setTimeout(r, 25))
    expect(orphaned).toBe(false)
    ppid = 999
    await new Promise((r) => setTimeout(r, 25))
    expect(orphaned).toBe(true)
    stop()
  })

  test('stop() detiene la vigilancia', async () => {
    let orphaned = false
    let ppid = 111
    const stop = startPpidWatchdog(() => { orphaned = true }, 10, () => ppid)
    stop()
    ppid = 999
    await new Promise((r) => setTimeout(r, 30))
    expect(orphaned).toBe(false)
  })
})

describe('sweepOrphanSpareSockets (O9n)', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'ccb-spare-sweep-'))
  })
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  test('borra archivos huérfanos .err/.late/.claim.sock sin su .pty.sock, cuenta sólo repuestos muertos', async () => {
    const { readdirSync } = await import('node:fs')
    const live = join(dir, 'live12345.pty.sock')
    writeFileSync(live, '')
    const orphanErr = join(dir, 'gone99999.pty.sock.err')
    const orphanClaim = join(dir, 'gone99999.claim.sock')
    writeFileSync(orphanErr, '')
    writeFileSync(orphanClaim, '')

    const reaped = await sweepOrphanSpareSockets(dir, new Set([live]))
    // `live` es un .pty.sock activo: no cuenta como huérfano aunque el
    // archivo exista sin un servidor real escuchando detrás.
    expect(reaped).toBe(0)
    const remaining = readdirSync(dir)
    expect(remaining).toContain('live12345.pty.sock')
    expect(remaining).not.toContain('gone99999.pty.sock.err')
    expect(remaining).not.toContain('gone99999.claim.sock')
  })

  test('manda SIGTERM a un .pty.sock huérfano y lo cuenta', async () => {
    const sockPath = join(dir, 'orphan55555.pty.sock')
    const received = new Promise<unknown>((resolve) => {
      const server = createServer((sock) => {
        readOneCtrlFrame(sock).then((f) => {
          resolve(f)
          server.close()
        })
      })
      server.listen(sockPath)
    })
    await new Promise((r) => setTimeout(r, 50))

    const reaped = await sweepOrphanSpareSockets(dir, new Set())
    expect(reaped).toBe(1)
    expect(await received).toEqual({ t: 'kill', sig: 'SIGTERM' })
  })

  test('en windows no barre nada (plataforma inyectada)', async () => {
    const sockPath = join(dir, 'orphan-win.pty.sock')
    writeFileSync(sockPath, '')
    const reaped = await sweepOrphanSpareSockets(dir, new Set(), () => 'win32')
    expect(reaped).toBe(0)
    const { readdirSync } = await import('node:fs')
    expect(readdirSync(dir)).toContain('orphan-win.pty.sock')
  })
})
