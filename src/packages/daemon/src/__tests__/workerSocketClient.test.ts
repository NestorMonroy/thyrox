/**
 * `workerSocketClient.ts` — daemon-side PTY client. Port of
 * chunk-ygx717jg.js `ae` (scoped — see the module's own docstring for
 * what's declared pending). Real Unix domain sockets, no mocks for the
 * wire itself: a small fixture host built on `internal/ptyFrame.ts`'s
 * encoders plays the PTY host side.
 */

import { describe, expect, test, afterEach } from 'bun:test'
import { createServer, type Server, type Socket } from 'node:net'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  PTY_RECONNECT_BACKOFF_MS,
  PTY_MAX_RECONNECT_ATTEMPTS,
  SIGNAL_EXIT_CODES,
  extractFirstNonEmptyLine,
  suffixMatchLen,
  createWorkerSocketClient,
  type WorkerSocketClient,
  type WorkerExitInfo,
} from '../workerSocketClient.js'
import { encodeCtrlFrame, encodeDataFrame } from '../internal/ptyFrame.js'

const ISOLATED_DIR = mkdtempSync(join(tmpdir(), 'ccb-workersocket-test-'))
let sockSeq = 0
function freshSockPath(): string {
  return join(ISOLATED_DIR, `ws-${process.pid}-${sockSeq++}.sock`)
}

let server: Server | undefined
let client: WorkerSocketClient | undefined

afterEach(() => {
  client?.dispose()
  client = undefined
  server?.close()
  server = undefined
})

async function until(pred: () => boolean, ms = 2000): Promise<void> {
  const deadline = Date.now() + ms
  while (Date.now() < deadline) {
    if (pred()) return
    await new Promise(r => setTimeout(r, 10))
  }
  throw new Error(`condition was not met within ${ms}ms`)
}

describe('workerSocketClient — ported constants', () => {
  test('PTY_RECONNECT_BACKOFF_MS matches chunk-ygx717jg.js Ie', () => {
    expect(PTY_RECONNECT_BACKOFF_MS).toEqual([50, 100, 250, 500, 1000, 2000])
  })

  test('PTY_MAX_RECONNECT_ATTEMPTS matches chunk-ygx717jg.js Oe', () => {
    expect(PTY_MAX_RECONNECT_ATTEMPTS).toBe(30)
  })

  test('SIGNAL_EXIT_CODES matches chunk-ygx717jg.js St', () => {
    expect(SIGNAL_EXIT_CODES.has(129)).toBe(true) // 128 + SIGHUP
    expect(SIGNAL_EXIT_CODES.has(143)).toBe(true) // 128 + SIGTERM
    expect(SIGNAL_EXIT_CODES.has(0)).toBe(false)
    expect(SIGNAL_EXIT_CODES.has(1)).toBe(false)
    expect(SIGNAL_EXIT_CODES.has(137)).toBe(false) // 128 + SIGKILL — NOT in the set
    expect(SIGNAL_EXIT_CODES.size).toBe(2)
  })
})

describe('workerSocketClient — extractFirstNonEmptyLine (xe)', () => {
  test('returns the first non-blank, trimmed line', () => {
    expect(extractFirstNonEmptyLine('\n\n  boom: segfault  \nmore\n')).toBe(
      'boom: segfault',
    )
  })

  test('undefined when every line is blank', () => {
    expect(extractFirstNonEmptyLine('\n  \n\t\n')).toBeUndefined()
  })

  test('caps at 2000 characters before splitting', () => {
    const text = `${' '.repeat(1999)}X\nY`
    // The cap lands mid-first-line; nothing before it is non-blank until
    // the very last captured character.
    expect(extractFirstNonEmptyLine(text)).toBe('X')
  })
})

describe('workerSocketClient — suffixMatchLen (lt)', () => {
  const needle = Buffer.from('\x1b_cc-daemon-detach\x1b\\')

  test('0 when no suffix of buf is a prefix of needle', () => {
    expect(suffixMatchLen(Buffer.from('hello world'), needle)).toBe(0)
  })

  test('the longest straddling suffix, not just any match', () => {
    const partial = needle.subarray(0, 5) // '\x1b_cc-'
    const buf = Buffer.concat([Buffer.from('prefix '), partial])
    expect(suffixMatchLen(buf, needle)).toBe(partial.length)
  })

  test('never returns needle.length — a FULL match is handled by the caller, not by this function', () => {
    expect(suffixMatchLen(needle, needle)).toBeLessThan(needle.length)
  })
})

describe('workerSocketClient — live wire behaviour', () => {
  test('hello capture, pre-live sentinel stripping, live flush, heartbeat, signalled exit', async () => {
    const sock = freshSockPath()
    let hostSocket: Socket | undefined
    server = createServer(s => {
      hostSocket = s
    })
    await new Promise<void>(resolve => server!.listen(sock, resolve))

    const dataChunks: Buffer[] = []
    const heartbeats: Array<{ ts: number; state?: string }> = []
    let exitInfo: WorkerExitInfo | undefined
    let helloSeen: { replPid: number; version: string } | undefined

    client = createWorkerSocketClient(sock, {
      workerPid: process.pid, // alive — irrelevant here, the host stays up
      onData: chunk => dataChunks.push(chunk),
      onExit: info => {
        exitInfo = info
      },
      onHeartbeat: info => heartbeats.push(info),
      onHello: info => {
        helloSeen = info
      },
    })

    await until(() => hostSocket !== undefined)
    hostSocket!.write(encodeCtrlFrame({ t: 'hello', replPid: 777, version: '1.2.3' }))
    await until(() => helloSeen !== undefined)
    expect(helloSeen).toEqual({ replPid: 777, version: '1.2.3' })
    expect(client.replPid()).toBe(777)
    expect(client.replVersion()).toBe('1.2.3')

    // Pre-live: a detach sentinel straddling two frames must be stripped
    // from what onData sees, never partially leaked.
    const sentinel = Buffer.from('\x1b_cc-daemon-detach\x1b\\')
    const beforeSentinel = Buffer.from('prompt> ')
    const afterSentinel = Buffer.from('still here')
    hostSocket!.write(encodeDataFrame(Buffer.concat([beforeSentinel, sentinel.subarray(0, 6)])))
    hostSocket!.write(encodeDataFrame(Buffer.concat([sentinel.subarray(6), afterSentinel])))
    hostSocket!.write(encodeCtrlFrame({ t: 'live' }))

    await until(() => dataChunks.length > 0)
    const flushed = Buffer.concat(dataChunks)
    expect(flushed.includes(sentinel)).toBe(false)
    expect(flushed.toString('utf8')).toBe('prompt> still here')

    hostSocket!.write(encodeCtrlFrame({ t: 'heartbeat', ts: 123, state: 'idle' }))
    await until(() => heartbeats.length > 0)
    expect(heartbeats[0]).toEqual({ ts: 123, state: 'idle' })

    // 143 = 128 + SIGTERM — SIGNAL_EXIT_CODES classifies it even without
    // an explicit `signal` field on the exit ctrl frame.
    hostSocket!.write(encodeCtrlFrame({ t: 'exit', code: 143 }))
    await until(() => exitInfo !== undefined)
    expect(exitInfo).toEqual({ exitCode: 143, signal: undefined, killedBySignal: true })
  })

  test('post-live data passes straight through, unbuffered, sentinel included', async () => {
    const sock = freshSockPath()
    let hostSocket: Socket | undefined
    server = createServer(s => {
      hostSocket = s
    })
    await new Promise<void>(resolve => server!.listen(sock, resolve))

    const dataChunks: Buffer[] = []
    client = createWorkerSocketClient(sock, {
      workerPid: process.pid,
      onData: chunk => dataChunks.push(chunk),
      onExit: () => {},
    })
    await until(() => hostSocket !== undefined)
    hostSocket!.write(encodeCtrlFrame({ t: 'live' }))
    await until(() => dataChunks.length === 0) // nothing buffered to flush — sanity
    const sentinel = Buffer.from('\x1b_cc-daemon-detach\x1b\\')
    hostSocket!.write(encodeDataFrame(sentinel))
    await until(() => dataChunks.length > 0)
    expect(Buffer.concat(dataChunks).equals(sentinel)).toBe(true)
  })

  test('worker pid gone → reconnect attempts stop and exit fires without touching the process', async () => {
    const sock = freshSockPath() // nothing listens here — every connect fails
    let killed = false
    let exitInfo: WorkerExitInfo | undefined
    client = createWorkerSocketClient(sock, {
      workerPid: 999999, // never checked against a real signal — isWorkerAlive is faked
      isWorkerAlive: () => false,
      killWorkerGroup: () => {
        killed = true
      },
      onData: () => {},
      onExit: info => {
        exitInfo = info
      },
    })
    await until(() => exitInfo !== undefined)
    expect(exitInfo).toEqual({ exitCode: -1, signal: undefined, killedBySignal: false })
    expect(killed).toBe(false)
  })
})

describe('workerSocketClient — hang escalation', () => {
  test('attempts exhausted + pid still alive → SIGKILL escalation, then exit', async () => {
    const sock = freshSockPath() // nothing listens here — every connect fails
    let killedPid: number | undefined
    let exitInfo: WorkerExitInfo | undefined
    client = createWorkerSocketClient(sock, {
      workerPid: 4321,
      isWorkerAlive: () => true, // the "worker" never dies — only the socket is unreachable
      killWorkerGroup: pid => {
        killedPid = pid
      },
      reconnectBackoffMs: [1, 1], // test-only — see the option's own docstring
      maxReconnectAttempts: 2,
      onData: () => {},
      onExit: info => {
        exitInfo = info
      },
    })
    await until(() => exitInfo !== undefined)
    expect(killedPid).toBe(4321)
    expect(exitInfo).toEqual({ exitCode: -1, signal: 'SIGKILL', killedBySignal: true })
  })
})
