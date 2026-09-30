import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { getConfigHomeDir } from '@thyrox/config/env/configHome.js'
import { getLocalObservability, installLocalObservability } from '@thyrox/local-observability'
import type { LocalObservability } from '@thyrox/local-observability'
import {
  buildFeatureBadMetadata,
  buildFeatureOkMetadata,
  buildRejectionEventMetadata,
  drainSpool,
  ingestEnvelope,
  startSpoolWatcher,
  writeSpoolEnvelope,
} from '../dispatchSpool.js'

const SPOOL = join(getConfigHomeDir(), 'daemon', 'dispatch')
const REJECTED = join(SPOOL, 'rejected')

function clearSpool(): void {
  try {
    rmSync(SPOOL, { recursive: true, force: true })
  } catch {}
  mkdirSync(SPOOL, { recursive: true, mode: 0o700 })
}

beforeEach(clearSpool)
afterEach(clearSpool)

/**
 * Instala un sink de observabilidad local que captura los eventos
 * emitidos por `logEvent` en vez de descartarlos, para probar la
 * telemetría de `Ie`/`m`/`_`/`bt` sin depender de qué error concreto del
 * sistema de archivos dispara cada rama.
 */
let previousObservability: LocalObservability | undefined
function captureEvents(): { name: string; metadata?: Record<string, unknown> }[] {
  const events: { name: string; metadata?: Record<string, unknown> }[] = []
  previousObservability = getLocalObservability()
  installLocalObservability({
    logger: {
      ...previousObservability.logger,
      event: (name, metadata) => { events.push({ name, metadata }) },
    },
  })
  return events
}

afterEach(() => {
  if (previousObservability) installLocalObservability(previousObservability)
  previousObservability = undefined
})

describe('writeSpoolEnvelope', () => {
  test('atomic write + valid filename', () => {
    const path = writeSpoolEnvelope({
      createdAt: Date.now(),
      op: 'dispatch',
      d: { short: 'abc', cwd: '/tmp' },
    })
    expect(existsSync(path)).toBe(true)
    expect(path.endsWith('.json')).toBe(true)
    const parsed = JSON.parse(readFileSync(path, 'utf8'))
    expect(parsed.op).toBe('dispatch')
    expect(parsed.d.short).toBe('abc')
  })
})

describe('ingestEnvelope', () => {
  test('valid envelope is delivered + file consumed', async () => {
    const path = writeSpoolEnvelope({ createdAt: Date.now(), op: 'spawn', d: { short: 'x' } })
    let delivered: unknown
    const reason = await ingestEnvelope(path, env => { delivered = env })
    expect(reason).toBe(null)
    expect(existsSync(path)).toBe(false)
    expect((delivered as { op: string }).op).toBe('spawn')
  })

  test('successful ingest reports tengu_feature_ok for daemon_bg_dispatch_ingest (chunk-d09a8ccq.js:_)', async () => {
    const events = captureEvents()
    const path = writeSpoolEnvelope({ createdAt: Date.now(), op: 'spawn', d: {} })
    await ingestEnvelope(path, () => {})
    expect(events).toContainEqual({
      name: 'tengu_feature_ok',
      metadata: { feature_name: 'daemon_bg_dispatch_ingest' },
    })
  })

  test('stale envelope (>24h) is rejected', async () => {
    const path = writeSpoolEnvelope({ createdAt: Date.now() - 86_400_001, op: 'spawn', d: {} })
    const reason = await ingestEnvelope(path, () => {})
    expect(reason).toBe('stale')
    expect(existsSync(path)).toBe(false)
  })

  test('stale envelope reports tengu_feature_bad(stale) alongside tengu_bg_dispatch_rejected (chunk-92tvramn.js:_t)', async () => {
    const events = captureEvents()
    const path = writeSpoolEnvelope({ createdAt: Date.now() - 86_400_001, op: 'spawn', d: {} })
    await ingestEnvelope(path, () => {})
    expect(events).toContainEqual({
      name: 'tengu_feature_bad',
      metadata: { feature_name: 'daemon_bg_dispatch_ingest', error_code: 'stale' },
    })
    expect(events).toContainEqual({
      name: 'tengu_bg_dispatch_rejected',
      metadata: { reason: 'stale' },
    })
  })

  test('bad json is rejected', async () => {
    const path = join(SPOOL, 'bad.json')
    writeFileSync(path, '{not json')
    const reason = await ingestEnvelope(path, () => {})
    expect(reason).toBe('bad-json')
  })

  test('schema-invalid (missing op) is rejected', async () => {
    const path = join(SPOOL, 'noop.json')
    writeFileSync(path, JSON.stringify({ createdAt: Date.now(), d: {} }))
    const reason = await ingestEnvelope(path, () => {})
    expect(reason).toBe('schema')
  })

  test('oversized payload (>256 KiB) is rejected', async () => {
    const path = join(SPOOL, 'big.json')
    const big = 'x'.repeat(300_000)
    writeFileSync(path, JSON.stringify({ createdAt: Date.now(), op: 'spawn', d: { big } }))
    const reason = await ingestEnvelope(path, () => {})
    expect(reason).toBe('oversized')
  })

  test('missing file returns null (race-safe)', async () => {
    const reason = await ingestEnvelope(join(SPOOL, 'gone.json'), () => {})
    expect(reason).toBe(null)
  })

  test('rejected files moved to rejected/ subdir', async () => {
    const path = join(SPOOL, 'badjson.json')
    writeFileSync(path, '{not json')
    await ingestEnvelope(path, () => {})
    expect(existsSync(REJECTED)).toBe(true)
  })

  test('deliver-throws marks deliver-failed + rejects', async () => {
    const path = writeSpoolEnvelope({ createdAt: Date.now(), op: 'spawn', d: {} })
    const reason = await ingestEnvelope(path, () => { throw new Error('boom') })
    expect(reason).toBe('deliver-failed')
  })

  // chunk-92tvramn.js:mt + chunk-92tvramn.js:kt/qe — una entrada no regular
  // (directorio, FIFO...) se borra directo, sin pasar por rejected/.
  test('non-regular entry (directory) is removed directly, not moved to rejected/', async () => {
    const events = captureEvents()
    const dirPath = join(SPOOL, 'a-directory')
    mkdirSync(dirPath)
    const reason = await ingestEnvelope(dirPath, () => {})
    expect(reason).toBe('not-a-file')
    expect(existsSync(dirPath)).toBe(false)
    expect(existsSync(REJECTED)).toBe(false)
    expect(events).toContainEqual({
      name: 'tengu_feature_bad',
      metadata: { feature_name: 'daemon_bg_dispatch_ingest', error_code: 'not_a_file' },
    })
  })
})

describe('drainSpool', () => {
  test('processes all pending envelopes on boot', async () => {
    writeSpoolEnvelope({ createdAt: Date.now(), op: 'spawn', d: { id: 1 } })
    writeSpoolEnvelope({ createdAt: Date.now(), op: 'spawn', d: { id: 2 } })
    writeSpoolEnvelope({ createdAt: Date.now(), op: 'spawn', d: { id: 3 } })
    const ids: unknown[] = []
    await drainSpool(env => {
      ids.push((env.d as { id: number }).id)
    })
    expect(ids.sort()).toEqual([1, 2, 3])
  })

  test('skips .tmp files', async () => {
    writeFileSync(join(SPOOL, '12345.tmp'), '{}')
    writeSpoolEnvelope({ createdAt: Date.now(), op: 'spawn', d: {} })
    let count = 0
    await drainSpool(() => {
      count++
    })
    expect(count).toBe(1)
  })

  test('empty dir is a no-op', async () => {
    let count = 0
    await drainSpool(() => {
      count++
    })
    expect(count).toBe(0)
  })

  test('handles missing dir', async () => {
    rmSync(SPOOL, { recursive: true, force: true })
    let count = 0
    await drainSpool(() => {
      count++
    })
    expect(count).toBe(0)
  })
})

describe('startSpoolWatcher (chunk-92tvramn.js:bt+tr)', () => {
  test('starts cleanly, can be closed, and reports tengu_feature_ok(daemon_bg_watcher_start)', () => {
    const events = captureEvents()
    const watcher = startSpoolWatcher(() => {})
    expect(typeof watcher.close).toBe('function')
    watcher.close()
    expect(events).toContainEqual({
      name: 'tengu_feature_ok',
      metadata: { feature_name: 'daemon_bg_watcher_start' },
    })
  })
})

describe('buildRejectionEventMetadata (chunk-92tvramn.js:Ie, payload del evento)', () => {
  test('no trunca el reason (la referencia no lo hace; el código previo sí, a 100 chars)', () => {
    const long = 'x'.repeat(150)
    expect(buildRejectionEventMetadata(long)).toEqual({ reason: long })
    expect(buildRejectionEventMetadata(long).reason.length).toBe(150)
  })
})

describe('buildFeatureOkMetadata / buildFeatureBadMetadata (chunk-d09a8ccq.js:_/m)', () => {
  test('feature_name en el payload de éxito', () => {
    expect(buildFeatureOkMetadata('daemon_bg_dispatch_ingest')).toEqual({
      feature_name: 'daemon_bg_dispatch_ingest',
    })
  })

  test('feature_name + error_code en el payload de fallo', () => {
    expect(buildFeatureBadMetadata('daemon_bg_dispatch_ingest', 'not_a_file')).toEqual({
      feature_name: 'daemon_bg_dispatch_ingest',
      error_code: 'not_a_file',
    })
  })
})
