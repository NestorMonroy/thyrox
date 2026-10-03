/**
 * Entrypoint del proceso `--bg-spare` — puerto de `chunk-ygx717jg.js` `AVo`
 * y de las piezas que consume: `Kjt` (recepción autenticada del claim,
 * `chunk-zwc237dd.js`), `v0` (comparación del secreto, `chunk-t0sp7zte.js`),
 * `_cn`/`c` (partición del entorno del claim, `chunk-fyjk3yda.js`) y la
 * parte de `Yjt` que aplica el claim al proceso. Cada caso corre contra un
 * socket Unix real en un directorio temporal aislado; el proceso real no se
 * toca: la salida, stderr, el ppid y las señales llegan por un host falso.
 */
import { afterAll, describe, expect, test } from 'bun:test'
import { EventEmitter } from 'node:events'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { connect } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { installLocalObservability } from '@thyrox/local-observability'

import {
  SPARE_CLAIM_MAX_BYTES,
  applySpareClaim,
  isClaimAuthValid,
  partitionClaimEnv,
  receiveSpareClaim,
  reportDroppedClaimEnv,
  runBgSpare,
  type SpareClaimFrame,
  type SpareProcessHost,
} from '../spareClaim.js'

const ISOLATED_DIR = mkdtempSync(join(tmpdir(), 'bg-spare-entrypoint-test-'))
const EXIT_MISSING_PATH = 2
const EXIT_FAILURE = 1
const EXIT_CLEAN = 0
const FAST_PPID_POLL_MS = 10
let socketSeq = 0

afterAll(() => {
  rmSync(ISOLATED_DIR, { recursive: true, force: true })
})

function freshSocketPath(): string {
  return join(ISOLATED_DIR, `claim-${process.pid}-${socketSeq++}.sock`)
}

/** Escribe una línea al socket de claim y espera a que el otro lado cierre. */
function sendLine(socketPath: string, line: string): Promise<'closed'> {
  return new Promise((resolve, reject) => {
    const sock = connect(socketPath)
    sock.on('error', reject)
    sock.on('close', () => resolve('closed'))
    sock.once('connect', () => sock.end(line))
  })
}

/** Escribe sin cerrar: sólo resuelve 'closed' si es el servidor quien corta la conexión. */
function writeWithoutEnd(socketPath: string, payload: string): Promise<'closed'> {
  return new Promise((resolve, reject) => {
    const sock = connect(socketPath)
    sock.on('error', reject)
    sock.on('close', () => resolve('closed'))
    sock.once('connect', () => sock.write(payload))
  })
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

class ExitCalled extends Error {
  constructor(readonly code: number) {
    super(`exit ${code}`)
  }
}

interface FakeHost extends SpareProcessHost {
  exitCodes: number[]
  stderr: string[]
  ppid: number
  events: EventEmitter
}

/** Host falso: `throwOnExit` corta el flujo principal como lo haría `process.exit`. */
function fakeHost(throwOnExit: boolean): FakeHost {
  const host: FakeHost = {
    exitCodes: [],
    stderr: [],
    ppid: 100,
    events: new EventEmitter(),
    ppidPollMs: FAST_PPID_POLL_MS,
    exit(code: number): never {
      host.exitCodes.push(code)
      if (throwOnExit) throw new ExitCalled(code)
      return undefined as never
    },
    writeStderr(text: string) {
      host.stderr.push(text)
    },
    getPpid: () => host.ppid,
  }
  return host
}

describe('isClaimAuthValid (v0)', () => {
  test('acepta sólo el mismo secreto, de la misma longitud y no vacío', () => {
    expect(isClaimAuthValid('abc123', 'abc123')).toBe(true)
    expect(isClaimAuthValid('abc124', 'abc123')).toBe(false)
    expect(isClaimAuthValid('abc', 'abc123')).toBe(false)
    expect(isClaimAuthValid('', 'abc123')).toBe(false)
    expect(isClaimAuthValid(undefined, 'abc123')).toBe(false)
    expect(isClaimAuthValid(42, 'abc123')).toBe(false)
  })
})

describe('receiveSpareClaim (Kjt)', () => {
  test('con secreto: resuelve la trama cuya auth coincide y avisa al quedar escuchando', async () => {
    const path = freshSocketPath()
    let listening = false
    const pending = receiveSpareClaim(path, { expectedAuth: 's3cret', onListening: () => { listening = true } })
    await sleep(20)
    expect(listening).toBe(true)
    await sendLine(path, `${JSON.stringify({ t: 'claim', cwd: '/w', auth: 's3cret' })}\n`)
    const frame = await pending
    expect(frame.cwd).toBe('/w')
  })

  test('con secreto: una trama con auth equivocada se descarta y sigue escuchando', async () => {
    const path = freshSocketPath()
    const pending = receiveSpareClaim(path, { expectedAuth: 's3cret' })
    await sleep(20)
    await sendLine(path, `${JSON.stringify({ t: 'claim', cwd: '/bad', auth: 'wrong!' })}\n`)
    await sendLine(path, 'no-es-json\n')
    await sendLine(path, `${JSON.stringify({ t: 'claim', cwd: '/good', auth: 's3cret' })}\n`)
    expect((await pending).cwd).toBe('/good')
  })

  test('con secreto: una trama sin salto de línea por encima del tope se corta', async () => {
    const path = freshSocketPath()
    const pending = receiveSpareClaim(path, { expectedAuth: 's3cret' })
    await sleep(20)
    expect(await writeWithoutEnd(path, 'x'.repeat(SPARE_CLAIM_MAX_BYTES + 1))).toBe('closed')
    await sendLine(path, `${JSON.stringify({ t: 'claim', cwd: '/after', auth: 's3cret' })}\n`)
    expect((await pending).cwd).toBe('/after')
  }, 20_000)

  test('sin secreto: una línea que no es JSON rechaza', async () => {
    const path = freshSocketPath()
    const pending = receiveSpareClaim(path, {})
    await sleep(20)
    void sendLine(path, 'no-es-json\n').catch(() => {})
    await expect(pending).rejects.toThrow()
  })

  test('rechaza si no puede escuchar en la ruta', async () => {
    await expect(receiveSpareClaim(join(ISOLATED_DIR, 'no-dir', 'x.sock'), {})).rejects.toThrow()
  })
})

describe('partitionClaimEnv (_cn)', () => {
  test('separa nombres inválidos, valores no-string y valores con NUL', () => {
    const { kept, dropped } = partitionClaimEnv({
      GOOD: 'ok',
      '': 'empty-name',
      'A=B': 'x',
      CTRL_NAME: 'fine',
      NUM: 3,
      NUL: 'a\u0000b',
    })
    expect(kept).toEqual({ GOOD: 'ok', CTRL_NAME: 'fine' })
    expect(dropped).toEqual([
      { name: '', problem: 'invalid-name' },
      { name: 'A=B', problem: 'invalid-name' },
      { name: 'NUM', problem: 'non-string-value' },
      { name: 'NUL', problem: 'nul-in-value' },
    ])
  })
})

describe('applySpareClaim (mitad de Yjt)', () => {
  test('cambia de cwd, reemplaza credenciales, aplica el entorno y rearma argv', () => {
    const chdirs: string[] = []
    const target = {
      env: { ANTHROPIC_API_KEY: 'old', THYROX_CODE_OAUTH_TOKEN: 'old', ANTHROPIC_AUTH_TOKEN: 'old', KEEP: 'k' } as NodeJS.ProcessEnv,
      argv: ['bun', 'cli.tsx', '--bg-spare', '/s.sock'],
      chdir: (dir: string) => { chdirs.push(dir) },
    }
    const frame: SpareClaimFrame = { t: 'claim', cwd: '/repo', env: { ANTHROPIC_API_KEY: 'new', FOO: 'bar' }, argv: ['-p', 'hola'] }
    const dropped = applySpareClaim(frame, target)
    expect(dropped).toEqual([])
    expect(chdirs).toEqual(['/repo'])
    expect(target.env).toEqual({ KEEP: 'k', ANTHROPIC_API_KEY: 'new', FOO: 'bar' })
    expect(target.argv).toEqual(['bun', 'cli.tsx', '-p', 'hola'])
  })

  test('devuelve lo descartado y no lo aplica', () => {
    const target = { env: {} as NodeJS.ProcessEnv, argv: ['bun', 'cli.tsx'], chdir: () => {} }
    const frame = { t: 'claim', env: { 'A=B': 'x', OK: 'y' } } as unknown as SpareClaimFrame
    expect(applySpareClaim(frame, target)).toEqual([{ name: 'A=B', problem: 'invalid-name' }])
    expect(target.env).toEqual({ OK: 'y' })
  })
})

describe('reportDroppedClaimEnv (Yjt `_`)', () => {
  test('sin descartes no emite nada; con descartes emite el conteo por motivo', () => {
    const events: { name: string; metadata: Record<string, unknown> }[] = []
    installLocalObservability({
      logger: {
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        event: (name, metadata) => events.push({ name, metadata: metadata as Record<string, unknown> }),
      },
    })
    reportDroppedClaimEnv([])
    expect(events).toEqual([])
    reportDroppedClaimEnv([
      { name: 'A=B', problem: 'invalid-name' },
      { name: 'NUL', problem: 'nul-in-value' },
      { name: 'X', problem: 'nul-in-value' },
    ])
    expect(events).toEqual([
      {
        name: 'tengu_bg_claim_env_dropped',
        metadata: { dropped: '3', nul_in_value: '2', invalid_name: '1', non_string_value: '0' },
      },
    ])
  })
})

describe('runBgSpare (AVo)', () => {
  test('sin ruta del socket de claim: stderr y exit 2', async () => {
    const host = fakeHost(true)
    await expect(runBgSpare([], async () => {}, host)).rejects.toBeInstanceOf(ExitCalled)
    expect(host.exitCodes).toEqual([EXIT_MISSING_PATH])
    expect(host.stderr.join('')).toContain('missing claim sock path')
  })

  test('claim recibido: corre el post-claim con la trama y suelta señales y vigilancia', async () => {
    const path = freshSocketPath()
    const host = fakeHost(true)
    const received: SpareClaimFrame[] = []
    const run = runBgSpare([path], async frame => { received.push(frame) }, host)
    await sleep(20)
    expect(host.events.listenerCount('SIGTERM')).toBe(1)
    expect(host.events.listenerCount('uncaughtException')).toBe(1)
    await sendLine(path, `${JSON.stringify({ t: 'claim', cwd: '/w' })}\n`)
    await run
    expect(received.map(f => f.cwd)).toEqual(['/w'])
    expect(host.events.listenerCount('SIGTERM')).toBe(0)
    expect(host.events.listenerCount('SIGHUP')).toBe(0)
    expect(host.events.listenerCount('SIGINT')).toBe(0)
    expect(host.events.listenerCount('uncaughtException')).toBe(0)
    host.ppid = 999
    await sleep(FAST_PPID_POLL_MS * 4)
    expect(host.exitCodes).toEqual([])
  })

  test('fallo al recibir el claim: borra el socket, stderr y exit 1', async () => {
    const host = fakeHost(true)
    const path = join(ISOLATED_DIR, 'missing-dir', 'claim.sock')
    await expect(runBgSpare([path], async () => {}, host)).rejects.toBeInstanceOf(ExitCalled)
    expect(host.exitCodes).toEqual([EXIT_FAILURE])
    expect(host.stderr.join('')).toContain('claim recv failed')
  })

  test('fallo del post-claim: stderr y se relanza', async () => {
    const path = freshSocketPath()
    const host = fakeHost(true)
    const outcome = runBgSpare([path], async () => { throw new Error('boom') }, host).then(
      () => undefined,
      (e: unknown) => e,
    )
    await sleep(20)
    await sendLine(path, `${JSON.stringify({ t: 'claim' })}\n`)
    expect(((await outcome) as Error).message).toBe('boom')
    expect(host.stderr.join('')).toContain('post-claim init failed: boom')
  })

  test('una señal antes del claim borra el socket y sale 0', async () => {
    const path = freshSocketPath()
    const host = fakeHost(false)
    void runBgSpare([path], async () => {}, host)
    await sleep(20)
    expect(existsSync(path)).toBe(true)
    host.events.emit('SIGTERM')
    expect(host.exitCodes).toEqual([EXIT_CLEAN])
    expect(existsSync(path)).toBe(false)
  })

  test('una excepción no capturada borra el socket, la reporta y sale 1', async () => {
    const path = freshSocketPath()
    const host = fakeHost(false)
    void runBgSpare([path], async () => {}, host)
    await sleep(20)
    host.events.emit('uncaughtException', new Error('kaboom'))
    expect(host.exitCodes).toEqual([EXIT_FAILURE])
    expect(host.stderr.join('')).toContain('uncaughtException: kaboom')
    expect(existsSync(path)).toBe(false)
  })

  test('si el padre muere antes del claim, borra el socket y sale 0', async () => {
    const path = freshSocketPath()
    const host = fakeHost(false)
    void runBgSpare([path], async () => {}, host)
    await sleep(20)
    host.ppid = 1
    await sleep(FAST_PPID_POLL_MS * 4)
    expect(host.exitCodes[0]).toBe(EXIT_CLEAN)
    expect(existsSync(path)).toBe(false)
  })
})
