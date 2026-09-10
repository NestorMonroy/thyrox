import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import {
  BackendArtifactStore,
  FileSessionMetadataStore,
  FileTranscriptStore,
  LocalFileStorageBackend,
  NotFoundError,
  StorageBaseError,
} from '../index.js'

describe('index.ts — barrel del paquete storage', () => {
  let dir: string
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true })
  })

  test('LocalFileStorageBackend + BackendArtifactStore componen end-to-end', async () => {
    dir = mkdtempSync(join(tmpdir(), 'storage-index-test-'))
    const backend = new LocalFileStorageBackend()
    const artifacts = new BackendArtifactStore(backend)

    const path = join(dir, 'a.txt')
    await artifacts.writeArtifact(path, 'contenido')
    expect(await artifacts.readArtifact(path)).toEqual(
      Buffer.from('contenido'),
    )
  })

  test('LocalFileStorageBackend + FileSessionMetadataStore componen end-to-end', async () => {
    dir = mkdtempSync(join(tmpdir(), 'storage-index-test-'))
    const backend = new LocalFileStorageBackend()
    const store = new FileSessionMetadataStore(backend, dir)

    await store.writeSessionMetadata('sess-1', { model: 'x' })
    expect(await store.readSessionMetadata('sess-1')).toEqual({ model: 'x' })
    expect(await store.readSessionMetadata('no-existe')).toBeNull()
  })

  test('LocalFileStorageBackend + FileTranscriptStore componen end-to-end', async () => {
    dir = mkdtempSync(join(tmpdir(), 'storage-index-test-'))
    const backend = new LocalFileStorageBackend()
    const store = new FileTranscriptStore(backend, dir)

    await store.appendSessionEvent('sess-1', '{"type":"a"}\n')
    await store.appendSessionEvent('sess-1', '{"type":"b"}\n')
    expect(await store.readSessionEvents('sess-1')).toEqual([
      '{"type":"a"}',
      '{"type":"b"}',
    ])
  })

  test('la familia de errores tipados se reexporta con su jerarquia y codigo', () => {
    const err = new NotFoundError('no esta')
    expect(err).toBeInstanceOf(StorageBaseError)
    expect(err.code).toBe('STORAGE_NOT_FOUND')
    expect(err.name).toBe('StorageNotFoundError')
  })
})
