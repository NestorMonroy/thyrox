import { describe, expect, test } from 'bun:test'

import {
  InvalidArtifactManifestError,
  artifactModelName,
  parseArtifactManifest,
  serializeArtifactManifest,
  type ArtifactManifest,
} from '../artifactManifest.js'

const HEX64 = (seed: string): string => seed.repeat(64).slice(0, 64)

function manifest(): ArtifactManifest {
  return {
    repository: 'Qwen/Qwen2.5-0.5B-Instruct',
    source: 'hf',
    revision: '7ae557604adf67be50417f59c2c2f167def9a775',
    sourceFiles: [
      { path: 'model.safetensors', sha256: HEX64('a') },
      { path: 'config.json', sha256: HEX64('b') },
    ],
    converter: { name: 'convert_hf_to_gguf.py', image: 'ghcr.io/ggml-org/llama.cpp:full', imageDigest: `sha256:${HEX64('c')}` },
    quantization: 'q4_k_m',
    gguf: { sha256: HEX64('d'), bytes: 397807712 },
    validation: { perplexity: 12.5, tokensPerSecond: 88.2, loaded: true },
    createdAt: '2026-09-30T23:00:00.000Z',
  }
}

function withoutPath(value: unknown, path: readonly string[]): unknown {
  const copy = structuredClone(value) as Record<string, unknown>
  let cursor: Record<string, unknown> = copy
  for (const key of path.slice(0, -1)) cursor = cursor[key] as Record<string, unknown>
  delete cursor[path[path.length - 1] ?? '']
  return copy
}

describe('serializeArtifactManifest', () => {
  test('ida y vuelta conserva el manifiesto', () => {
    expect(parseArtifactManifest(serializeArtifactManifest(manifest()))).toEqual(manifest())
  })

  test('JSON canónico: claves ordenadas en todos los niveles, independiente del orden de escritura', () => {
    const text = serializeArtifactManifest(manifest())
    const topKeys = Object.keys(JSON.parse(text) as object)
    expect(topKeys).toEqual([...topKeys].sort())
    expect(text.indexOf('"bytes"')).toBeLessThan(text.indexOf('"sha256":"dddd'))
    const reordered = Object.fromEntries(Object.entries(manifest()).reverse()) as unknown as ArtifactManifest
    expect(serializeArtifactManifest(reordered)).toBe(text)
  })

  test('no serializa un manifiesto inválido', () => {
    expect(() => serializeArtifactManifest({ ...manifest(), quantization: 'q9_z' })).toThrow()
  })
})

describe('parseArtifactManifest — un campo que falta es un error con nombre', () => {
  const required: readonly (readonly string[])[] = [
    ['repository'], ['source'], ['revision'], ['sourceFiles'], ['converter', 'imageDigest'], ['converter', 'image'],
    ['converter', 'name'], ['quantization'], ['gguf', 'sha256'], ['gguf', 'bytes'], ['validation', 'perplexity'],
    ['validation', 'tokensPerSecond'], ['validation', 'loaded'], ['createdAt'],
  ]
  for (const path of required) {
    test(`falta ${path.join('.')}`, () => {
      const text = JSON.stringify(withoutPath(manifest(), path))
      expect(() => parseArtifactManifest(text)).toThrow(InvalidArtifactManifestError)
      expect(() => parseArtifactManifest(text)).toThrow(path.join('.'))
    })
  }
})

describe('parseArtifactManifest — rehúsa valores con forma equivocada', () => {
  const cases: readonly [string, (m: Record<string, unknown>) => void][] = [
    ['gguf.sha256', m => { (m.gguf as Record<string, unknown>).sha256 = 'xyz' }],
    ['gguf.bytes', m => { (m.gguf as Record<string, unknown>).bytes = -1 }],
    ['converter.imageDigest', m => { (m.converter as Record<string, unknown>).imageDigest = HEX64('c') }],
    ['sourceFiles[0].sha256', m => { ((m.sourceFiles as Record<string, unknown>[])[0] ?? {}).sha256 = 'no' }],
    ['sourceFiles', m => { m.sourceFiles = [] }],
    ['quantization', m => { m.quantization = 'q9_z' }],
    ['createdAt', m => { m.createdAt = 'ayer' }],
    ['validation.loaded', m => { (m.validation as Record<string, unknown>).loaded = 'yes' }],
    ['validation.perplexity', m => { (m.validation as Record<string, unknown>).perplexity = Number.NaN }],
  ]
  for (const [field, mutate] of cases) {
    test(field, () => {
      const value = structuredClone(manifest()) as unknown as Record<string, unknown>
      mutate(value)
      expect(() => parseArtifactManifest(JSON.stringify(value))).toThrow(field)
    })
  }

  test('un texto que no es JSON', () => {
    expect(() => parseArtifactManifest('{')).toThrow(InvalidArtifactManifestError)
  })
})

describe('artifactModelName', () => {
  test('el manifiesto deriva el nombre del contrato', () => {
    expect(artifactModelName(manifest())).toBe('thyrox-qwen--qwen2.5-0.5b-instruct:q4_k_m-hf-7ae557604adf')
  })
})
