/**
 * La verificación del consumidor en el adapter OCI: lo que quedó en el almacén
 * tiene que ser exactamente el digest fijado; si el registro sirvió otro, se
 * rehúsa en vez de ejecutar una imagen que nadie fijó.
 */
import { describe, expect, test } from 'bun:test'

import { ImageTransferError } from '@thyrox/podman-execution/imageTransfer.ts'

import { canonicalReference, pin } from '../imageReference.ts'
import { createOciRegistry } from '../ociRegistry.ts'
import { createFakePodmanRegistry } from '../testing/fakePodmanRegistry.ts'

const PINNED = pin({ registry: 'registry.example.com', repository: 'lab/quantizer' }, `sha256:${'e'.repeat(64)}`)
const SERVED = `sha256:${'f'.repeat(64)}`

describe('verificación del digest al consumir', () => {
  test('un almacén con otro digest que el fijado rehúsa nombrando los dos', async () => {
    const podman = createFakePodmanRegistry()
    podman.remote.set(canonicalReference(PINNED), SERVED)
    const registry = createOciRegistry({ provider: 'generic-oci', registry: 'registry.example.com', podman })
    const attempt = registry.reader.pull(PINNED)
    await expect(attempt).rejects.toBeInstanceOf(ImageTransferError)
    await expect(attempt).rejects.toThrow(new RegExp(`${PINNED.digest}.*${SERVED}`))
  })

  test('el consumidor anónimo no pasa authfile', async () => {
    const podman = createFakePodmanRegistry()
    podman.remote.set(canonicalReference(PINNED), PINNED.digest)
    await createOciRegistry({ provider: 'generic-oci', registry: 'registry.example.com', podman }).reader.pull(PINNED)
    expect(podman.calls.flat()).not.toContain('--authfile')
  })
})
