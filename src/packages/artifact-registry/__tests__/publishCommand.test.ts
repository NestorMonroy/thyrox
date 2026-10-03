import { describe, expect, test } from 'bun:test'

import { DOCKER_HUB_REGISTRY_URL } from '../dockerHubArtifactRegistry.js'
import { mediaTypeOf, publicationExitCode, publicationRecord, registryBaseUrl } from '../publishCommand.js'
import type { PublicationOutcome } from '../publishArtifact.js'

const PINNED = { repository: 'th3rox/lab', digest: 'sha256:' + 'c'.repeat(64) }

describe('publicationExitCode', () => {
  test('sólo verified es 0; un rehúso antes de empezar es 2; un límite del provider es 3', () => {
    const verified = { status: 'verified', pinned: PINNED, files: [], verification: { resolvedDigest: PINNED.digest, blobsVerified: [], measuredPeakBytes: 0 } } as PublicationOutcome
    expect(publicationExitCode(verified)).toBe(0)
    expect(publicationExitCode({ status: 'refused', reason: 'sin sitio' })).toBe(2)
    expect(publicationExitCode({ status: 'unverified', pinned: PINNED, result: { status: 'rate_limited', rateLimit: { kind: 'pull-rate', source: 'x' }, detail: '429' } } as PublicationOutcome)).toBe(3)
    expect(publicationExitCode({ status: 'unverified', pinned: PINNED, result: { status: 'job_failed', exitCode: 1, detail: '' } })).toBe(1)
  })
})

describe('registryBaseUrl', () => {
  test('Docker Hub resuelve a su API de distribución; otro host, a https', () => {
    expect(registryBaseUrl('docker.io')).toBe(DOCKER_HUB_REGISTRY_URL)
    expect(registryBaseUrl('ghcr.io')).toBe('https://ghcr.io')
  })
})

describe('mediaTypeOf', () => {
  test('cada archivo declara su tipo; lo desconocido es octet-stream', () => {
    expect(mediaTypeOf('model-Q4_K_M.gguf')).toBe('application/vnd.thyrox.gguf.v1')
    expect(mediaTypeOf('convert.log')).toBe('text/plain')
    expect(mediaTypeOf('blob.bin')).toBe('application/octet-stream')
  })
})

describe('publicationRecord', () => {
  test('el registro de un artefacto verificado fija la referencia por digest y declara la copia local caché', () => {
    const verified = { status: 'verified', pinned: PINNED, files: [], verification: { resolvedDigest: PINNED.digest, blobsVerified: [], measuredPeakBytes: 0 } } as PublicationOutcome
    expect(publicationRecord(verified, 'docker.io', 'v1', 't')).toMatchObject({ reference: `docker.io/th3rox/lab@${PINNED.digest}`, localCopy: 'cache' })
  })

  test('uno no verificado no declara la copia local como caché', () => {
    expect(publicationRecord({ status: 'refused', reason: 'x' }, 'docker.io', 'v1', 't')).not.toHaveProperty('localCopy')
  })
})
