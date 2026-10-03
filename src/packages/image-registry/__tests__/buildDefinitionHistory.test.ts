/**
 * Una definición de imagen que se publica no declara como ARG ninguna variable
 * de entorno de build (TASK-THYROX-0747, contrato de historial limpio).
 *
 * Un ARG declarado y con valor queda grabado en el historial de cada RUN, y
 * `assertImageFreeOf` rechaza esa imagen al promoverla. El proxy no necesita
 * el ARG: `podman build` lo reenvía a cada RUN por `--http-proxy` sin grabarlo.
 * Esta prueba mide la definición antes de construir; el historial de la
 * imagen construida lo mide el gate de promoción.
 */
import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { BUILD_ENVIRONMENT_KEYS } from '../promotion.ts'

const SOURCE_ROOT = join(import.meta.dir, '..', '..')
const PUBLISHED_DEFINITIONS = ['model-artifacts/quantizer-image/Containerfile']

function declaredBuildEnvironmentArgs(containerfile: string): string[] {
  const declared = containerfile
    .split('\n')
    .map(line => /^\s*ARG\s+([A-Za-z_][A-Za-z0-9_]*)/.exec(line)?.[1])
    .filter((name): name is string => name !== undefined)
  return declared.filter(name => BUILD_ENVIRONMENT_KEYS.includes(name))
}

describe('a published image definition declares no build-environment ARG', () => {
  for (const definition of PUBLISHED_DEFINITIONS) {
    test(definition, () => {
      expect(declaredBuildEnvironmentArgs(readFileSync(join(SOURCE_ROOT, definition), 'utf8'))).toEqual([])
    })
  }

  test('the detector sees a declared proxy ARG (control)', () => {
    expect(declaredBuildEnvironmentArgs('FROM x\nARG HTTPS_PROXY\nARG https_proxy\nARG PROXY_CA\n')).toEqual(['HTTPS_PROXY', 'https_proxy'])
  })
})
