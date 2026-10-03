/**
 * Contrato de la identidad del proyecto: la declaración fija el nombre
 * canónico y los nombres legacy; la evidencia histórica conserva el nombre con
 * que se escribió y la normalización viaja como metadata.
 */
import { describe, expect, test } from 'bun:test'

import { observedProjectOf, PROJECT_IDENTITY, projectIdentityMetadata } from '../projectIdentity.ts'

describe('PROJECT_IDENTITY', () => {
  test('declara el ecosistema, el proyecto canónico y los nombres legacy', () => {
    expect(PROJECT_IDENTITY.ecosystem).toBe('kaupamex')
    expect(PROJECT_IDENTITY.canonicalProject).toBe('kaupamex-ai')
    expect(PROJECT_IDENTITY.legacyProjects).toEqual(['thyrox'])
  })

  test('es inmutable', () => {
    expect(Object.isFrozen(PROJECT_IDENTITY)).toBe(true)
    expect(Object.isFrozen(PROJECT_IDENTITY.legacyProjects)).toBe(true)
  })
})

describe('observedProjectOf', () => {
  test.each([
    ['thyrox-ollama failed to start', 'thyrox'],
    ['see TASK-THYROX-0710 for the cause', 'thyrox'],
    ['models live in .thyrox/models/', 'thyrox'],
    ['THYROX_INFRA_OLLAMA_PORT was not declared', 'thyrox'],
    ['kaupamex-ai-model-quantizer was published', 'kaupamex-ai'],
  ])('reconoce el nombre que usó la fuente: %s', (text, expected) => {
    expect(observedProjectOf(text)).toBe(expected)
  })

  test('devuelve el primero que aparece cuando la fuente nombra los dos', () => {
    expect(observedProjectOf('thyrox was renamed to kaupamex-ai')).toBe('thyrox')
    expect(observedProjectOf('kaupamex-ai, formerly thyrox')).toBe('kaupamex-ai')
  })

  test('no confunde una palabra que sólo contiene el nombre', () => {
    expect(observedProjectOf('pythyroxine and thyroxinemia')).toBeNull()
  })

  test('devuelve null cuando la fuente no nombra ningún proyecto', () => {
    expect(observedProjectOf('postgres is down')).toBeNull()
  })
})

describe('projectIdentityMetadata', () => {
  test('describe la identidad canónica y el nombre observado', () => {
    expect(projectIdentityMetadata('thyrox')).toEqual({
      ecosystem: 'kaupamex',
      canonical_project: 'kaupamex-ai',
      legacy_projects: ['thyrox'],
      observed_project: 'thyrox',
    })
  })

  test('conserva un nombre observado ausente como null', () => {
    expect(projectIdentityMetadata(null).observed_project).toBeNull()
  })
})
