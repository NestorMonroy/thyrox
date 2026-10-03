/**
 * El ciclo de vida de una residencia (ADR-007 1.13.0).
 *
 * Qué haría fallar a esta suite: saltar de `materializing` a `resident` sin
 * pasar por la carga, aceptar una transición de una generación vieja, o que
 * `plan` sustituya una residencia que todavía existe.
 */
import { describe, expect, test } from 'bun:test'

import { resolvedArtifact } from '@thyrox/model-artifacts/testing/resolvedArtifactFixture.ts'

import { InvalidResidencyTransitionError, ResidencyRegistry, StaleGenerationError } from '../residency.ts'

const KEY = 'residency/qwen/gpu0'
const ARTIFACT = resolvedArtifact()

describe('ResidencyRegistry', () => {
  test('plan abre planned en la generación del lease, sin peticiones', () => {
    const registry = new ResidencyRegistry()
    expect(registry.plan(KEY, 3, ARTIFACT)).toEqual({ residencyKey: KEY, generation: 3, artifact: ARTIFACT, state: 'planned', activeRequests: 0 })
  })

  test('recorre planned → materializing → loading → resident y guarda los cambios', () => {
    const registry = new ResidencyRegistry()
    registry.plan(KEY, 1, ARTIFACT)
    registry.transition(KEY, 1, 'materializing', { grantId: 'grant-1' })
    registry.transition(KEY, 1, 'loading', { unitId: 'unit-1' })
    const resident = registry.transition(KEY, 1, 'resident')
    expect(resident).toMatchObject({ state: 'resident', grantId: 'grant-1', unitId: 'unit-1' })
  })

  test('un contenedor arrancado no salta a resident sin cargar', () => {
    const registry = new ResidencyRegistry()
    registry.plan(KEY, 1, ARTIFACT)
    registry.transition(KEY, 1, 'materializing')
    expect(() => registry.transition(KEY, 1, 'resident')).toThrow(InvalidResidencyTransitionError)
  })

  test('una generación vieja no mueve la residencia aunque su emisor viva (M19)', () => {
    const registry = new ResidencyRegistry()
    registry.plan(KEY, 2, ARTIFACT)
    expect(() => registry.transition(KEY, 1, 'materializing')).toThrow(StaleGenerationError)
    expect(registry.get(KEY)?.state).toBe('planned')
  })

  test('plan no sustituye una residencia viva; sí una absent, con generación nueva', () => {
    const registry = new ResidencyRegistry()
    registry.plan(KEY, 1, ARTIFACT)
    expect(() => registry.plan(KEY, 2, ARTIFACT)).toThrow(InvalidResidencyTransitionError)
    registry.transition(KEY, 1, 'absent')
    expect(registry.plan(KEY, 2, ARTIFACT)).toMatchObject({ state: 'planned', generation: 2 })
  })

  test('una residencia desconocida no se mueve', () => {
    expect(() => new ResidencyRegistry().transition(KEY, 1, 'materializing')).toThrow()
  })
})
