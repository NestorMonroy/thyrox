import { describe, expect, test } from 'bun:test'

import { canonicalReference, InvalidImageReferenceError, isPinned, parseImageReference, pin, taggedReference } from '../imageReference.ts'

const DIGEST = `sha256:${'d'.repeat(64)}`

describe('referencia OCI', () => {
  test('separa registro, repositorio, etiqueta y digest', () => {
    expect(parseImageReference(`registry.example.com:5000/lab/quantizer:v1@${DIGEST}`)).toEqual({
      registry: 'registry.example.com:5000',
      repository: 'lab/quantizer',
      tag: 'v1',
      digest: DIGEST,
    })
    expect(parseImageReference('localhost/quantizer')).toEqual({ registry: 'localhost', repository: 'quantizer' })
  })

  test('una referencia sin registro explícito rehúsa: no se supone docker.io', () => {
    expect(() => parseImageReference('ubuntu:24.04')).toThrow(InvalidImageReferenceError)
    expect(() => parseImageReference('th3rox/quantizer:v1')).toThrow(/registro/)
  })

  test('la forma canónica es registro/repositorio@digest, sin etiqueta', () => {
    const pinned = pin(parseImageReference('docker.io/th3rox/quantizer:v1'), DIGEST)
    expect(isPinned(pinned)).toBe(true)
    expect(canonicalReference(pinned)).toBe(`docker.io/th3rox/quantizer@${DIGEST}`)
    expect(taggedReference(pinned)).toBe('docker.io/th3rox/quantizer:v1')
  })

  test('un digest ilegible rehúsa', () => {
    expect(() => parseImageReference('docker.io/a/b@sha256:xyz')).toThrow(/digest/)
    expect(() => pin({ registry: 'docker.io', repository: 'a/b' }, 'latest')).toThrow(InvalidImageReferenceError)
  })
})
