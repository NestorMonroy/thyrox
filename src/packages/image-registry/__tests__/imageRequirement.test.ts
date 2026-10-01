/**
 * El requisito de imagen es parte declarada del trabajo (contratos 12 y 15 de
 * TASK-THYROX-0691): el ciclo de vida no se deduce del nombre ni de la
 * etiqueta, y una imagen permanente o de infraestructura se fija por digest.
 */
import { describe, expect, test } from 'bun:test'

import { LIFECYCLE_LABEL, OWNER_ID_LABEL, OWNER_KIND_LABEL, CACHE_KEY_LABEL } from '../imageLifecycle.ts'
import { buildLabels, InvalidImageRequirementError, validateImageRequirement } from '../imageRequirement.ts'

const DIGEST = `sha256:${'1'.repeat(64)}`
const BUILD = { context: '/ctx', tag: 'localhost/item-image:run-7' }

describe('requisito de imagen', () => {
  test('una imagen permanente sin digest rehúsa: la etiqueta no es identidad', () => {
    expect(() =>
      validateImageRequirement({ lifecycle: 'permanent', source: 'registry', reference: { registry: 'docker.io', repository: 'th3rox/q', tag: 'v1' } as never, estimatedDiskBytes: 1 }),
    ).toThrow(InvalidImageRequirementError)
  })

  test('una imagen de infraestructura también exige digest', () => {
    expect(() =>
      validateImageRequirement({ lifecycle: 'infrastructure', source: 'upstream', reference: { registry: 'docker.io', repository: 'library/redis', tag: '7.4' } as never, estimatedDiskBytes: 1 }),
    ).toThrow(/digest/)
  })

  test('una efímera exige dueño y una de caché su clave', () => {
    expect(() => validateImageRequirement({ lifecycle: 'ephemeral', source: 'local-build', build: BUILD, owner: { kind: 'task', id: ' ' }, estimatedDiskBytes: 1 })).toThrow(/owner/)
    expect(() => validateImageRequirement({ lifecycle: 'cache', source: 'local-build', build: BUILD, cacheKey: '', estimatedDiskBytes: 1 })).toThrow(/cacheKey/)
  })

  test('el disco estimado para resolverla es obligatorio y positivo', () => {
    expect(() => validateImageRequirement({ lifecycle: 'ephemeral', source: 'local-build', build: BUILD, owner: { kind: 'task', id: 'run-7' }, estimatedDiskBytes: 0 })).toThrow(/estimatedDiskBytes/)
  })

  test('las etiquetas de construcción declaran el ciclo de vida y el dueño o la clave', () => {
    expect(buildLabels({ lifecycle: 'ephemeral', source: 'local-build', build: BUILD, owner: { kind: 'task', id: 'run-7/3' }, estimatedDiskBytes: 1 })).toEqual({
      [LIFECYCLE_LABEL]: 'ephemeral',
      [OWNER_KIND_LABEL]: 'task',
      [OWNER_ID_LABEL]: 'run-7/3',
    })
    expect(buildLabels({ lifecycle: 'cache', source: 'local-build', build: BUILD, cacheKey: 'sha256-of-inputs', estimatedDiskBytes: 1 })).toEqual({
      [LIFECYCLE_LABEL]: 'cache',
      [CACHE_KEY_LABEL]: 'sha256-of-inputs',
    })
  })

  test('un requisito permanente válido pasa intacto', () => {
    const requirement = { lifecycle: 'permanent' as const, source: 'registry' as const, reference: { registry: 'docker.io', repository: 'th3rox/q', digest: DIGEST }, estimatedDiskBytes: 5 }
    expect(validateImageRequirement(requirement)).toBe(requirement)
  })
})
