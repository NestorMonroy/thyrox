import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { bootstrapDeps } from '../bootstrapCommand.ts'
import { DURABLE_VOLUMES_DIR_ENV, durableVolumeLedgerPath, fileDurableVolumeLedger } from '../durableVolumeLedger.ts'

let directory: string | undefined
afterEach(() => {
  if (directory !== undefined) rmSync(directory, { recursive: true, force: true })
  directory = undefined
})

describe('fileDurableVolumeLedger (H-THYROX-464)', () => {
  test('registra una vez y conserva la fecha original', async () => {
    directory = mkdtempSync(join(tmpdir(), 'durable-volumes-'))
    const ledger = fileDurableVolumeLedger(join(directory, 'ledger.json'))
    expect(await ledger.createdAt('thyrox-postgres-data')).toBeUndefined()
    await ledger.record('thyrox-postgres-data', '2026-10-01T00:00:00.000Z')
    await ledger.record('thyrox-postgres-data', '2026-10-03T10:04:25.000Z')
    expect(await ledger.createdAt('thyrox-postgres-data')).toBe('2026-10-01T00:00:00.000Z')
  })

  test('sobrevive a otra instancia: vive en un archivo, no en Podman', async () => {
    directory = mkdtempSync(join(tmpdir(), 'durable-volumes-'))
    const path = join(directory, 'nested', 'ledger.json')
    await fileDurableVolumeLedger(path).record('v', '2026-10-01T00:00:00.000Z')
    expect(await fileDurableVolumeLedger(path).createdAt('v')).toBe('2026-10-01T00:00:00.000Z')
    expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual({ volumes: { v: { createdAt: '2026-10-01T00:00:00.000Z' } } })
    expect(statSync(path).mode & 0o777).toBe(0o600)
  })

  test('un registro ilegible se rehúsa en vez de leerse como vacío', async () => {
    directory = mkdtempSync(join(tmpdir(), 'durable-volumes-'))
    const path = join(directory, 'ledger.json')
    await Bun.write(path, 'no es json')
    await expect(fileDurableVolumeLedger(path).createdAt('v')).rejects.toThrow(/ledger/)
  })

  test('la ruta sale de THYROX_DURABLE_VOLUMES_DIR si se declara', () => {
    expect(durableVolumeLedgerPath({ [DURABLE_VOLUMES_DIR_ENV]: '/srv/volumes' })).toBe('/srv/volumes/ledger.json')
  })
})

describe('bootstrapDeps', () => {
  test('lleva el libro de volúmenes durables del hogar declarado', async () => {
    directory = mkdtempSync(join(tmpdir(), 'durable-volumes-'))
    const deps = bootstrapDeps({ [DURABLE_VOLUMES_DIR_ENV]: directory })
    await deps.durableVolumes?.record('v', '2026-10-01T00:00:00.000Z')
    expect(JSON.parse(readFileSync(join(directory, 'ledger.json'), 'utf8')).volumes.v.createdAt).toBe('2026-10-01T00:00:00.000Z')
  })
})
