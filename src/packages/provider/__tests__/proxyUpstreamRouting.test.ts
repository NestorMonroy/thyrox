/**
 * Enrutamiento modelo→upstream — contrato de la pasarela del ejecutable
 * 2.1.283 (`chunk-wg7ts4cy.js`: `D_`, `so`, `Nv`, `mj`, `So`; `GC` en
 * `chunk-4h0c4z04.js`).
 */
import { describe, expect, test } from 'bun:test'
import {
  catalogFamilyOf,
  modelEntryFor,
  printableModel,
  resolveUpstreamModel,
  routeModel,
  upstreamServesModel,
  type GatewayUpstream,
  type ModelCatalog,
} from '../src/proxy/upstreamRouting.js'

const catalog: ModelCatalog = {
  sonnet5: { firstParty: 'claude-sonnet-5', bedrock: 'us.anthropic.claude-sonnet-5', vertex: 'claude-sonnet-5@v' },
  haiku45: { firstParty: 'claude-haiku-4-5', bedrock: 'us.anthropic.claude-haiku-4-5', vertex: null },
}
const anthropic: GatewayUpstream = { name: 'direct', provider: 'anthropic' }
const bedrock: GatewayUpstream = { name: 'aws', provider: 'bedrock' }

describe('catalogFamilyOf (GC)', () => {
  test('encuentra la familia por cualquier id de proveedor, sin caja', () => {
    expect(catalogFamilyOf('US.ANTHROPIC.CLAUDE-SONNET-5', catalog)).toBe(catalog.sonnet5!)
  })
  test('un id fuera del catálogo da null', () => {
    expect(catalogFamilyOf('gpt-5', catalog)).toBeNull()
  })
})

describe('printableModel (So)', () => {
  test('quita lo no imprimible y trunca a 128 con puntos', () => {
    expect(printableModel('a\u0000bé')).toBe('ab')
    expect(printableModel('x'.repeat(130))).toBe(`${'x'.repeat(128)}...`)
  })
})

describe('upstreamServesModel (Nv)', () => {
  test('sin lista de modelos sirve todo', () => {
    expect(upstreamServesModel(anthropic, 'cualquiera', catalog)).toBe(true)
  })
  test('con lista casa por id o por familia', () => {
    const u = { ...anthropic, models: ['claude-sonnet-5'] }
    expect(upstreamServesModel(u, 'us.anthropic.claude-sonnet-5', catalog)).toBe(true)
    expect(upstreamServesModel(u, 'claude-haiku-4-5', catalog)).toBe(false)
  })
})

describe('modelEntryFor (mj)', () => {
  test('casa la entrada del operador por id o por familia', () => {
    const models = [{ id: 'claude-sonnet-5', upstream_model: {} }]
    expect(modelEntryFor('US.anthropic.claude-sonnet-5', models, catalog)).toBe(models[0]!)
  })
})

describe('resolveUpstreamModel (so)', () => {
  test('upstream que no lo sirve: listSkip con el nombre del upstream', () => {
    const u = { ...anthropic, models: ['claude-haiku-4-5'] }
    expect(resolveUpstreamModel('claude-sonnet-5', u, [], true, false, catalog)).toEqual({
      ok: false,
      listSkip: true,
      error: "model claude-sonnet-5 is not served by upstream 'direct'",
    })
  })
  test('el upstream_model del operador gana', () => {
    const models = [{ id: 'claude-sonnet-5', upstream_model: { aws: 'arn:perfil' } }]
    expect(resolveUpstreamModel('claude-sonnet-5', bedrock, models, true, false, catalog)).toEqual({
      ok: true,
      model: 'arn:perfil',
    })
  })
  test('builtin: anthropic usa firstParty, otro proveedor su columna', () => {
    expect(resolveUpstreamModel('claude-sonnet-5', anthropic, [], true, false, catalog)).toEqual({
      ok: true,
      model: 'claude-sonnet-5',
    })
    expect(resolveUpstreamModel('claude-sonnet-5', bedrock, [], true, false, catalog)).toEqual({
      ok: true,
      model: 'us.anthropic.claude-sonnet-5',
    })
  })
  test('builtin sin id en ese proveedor', () => {
    const vertex = { name: 'gcp', provider: 'vertex' }
    expect(resolveUpstreamModel('claude-haiku-4-5', vertex, [], true, false, catalog)).toEqual({
      ok: false,
      error: 'model claude-haiku-4-5 is not available on vertex',
    })
  })
  test('sin auto_include_builtin_models ni entrada: fuera de la lista del operador', () => {
    expect(resolveUpstreamModel('claude-sonnet-5', anthropic, [], false, false, catalog)).toEqual({
      ok: false,
      error: "model claude-sonnet-5 is not in the operator's model allowlist",
    })
  })
  test('entrada del operador sin upstream_model para un id ajeno al catálogo', () => {
    const models = [{ id: 'mi-modelo', upstream_model: {} }]
    expect(resolveUpstreamModel('mi-modelo', anthropic, models, true, false, catalog)).toEqual({
      ok: false,
      error: 'model mi-modelo has no upstream_model.direct configured',
    })
  })
  test('el modo público oculta los nombres internos', () => {
    const u = { ...anthropic, models: ['claude-haiku-4-5'] }
    expect(resolveUpstreamModel('claude-sonnet-5', u, [], true, true, catalog).error).toBe(
      'model claude-sonnet-5 is not available on this upstream',
    )
  })
})

describe('routeModel (D_)', () => {
  test('el primer upstream que resuelve gana, en orden de configuración', () => {
    const config = {
      upstreams: [{ ...anthropic, models: ['claude-haiku-4-5'] }, bedrock, anthropic],
      models: [],
      auto_include_builtin_models: true,
    }
    expect(routeModel(config, 'claude-sonnet-5', catalog)).toEqual({
      upstream: bedrock,
      model: 'us.anthropic.claude-sonnet-5',
    })
  })
  test('ninguno resuelve: undefined', () => {
    expect(
      routeModel({ upstreams: [anthropic], models: [], auto_include_builtin_models: false }, 'x', catalog),
    ).toBeUndefined()
  })
})
