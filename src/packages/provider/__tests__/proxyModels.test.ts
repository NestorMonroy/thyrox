/**
 * `GET /v1/models` del proxy local: los modelos que el operador declara y,
 * con `auto_include_builtin_models`, las familias del catálogo que algún
 * upstream puede servir, en el orden del ejecutable 2.1.283 (`Ih`/`qv`,
 * `chunk-wg7ts4cy.js`, leído como referencia).
 */
import { describe, expect, test } from 'bun:test'
import { AccessManager, createConfigApiKeyProvider } from '../src/proxy/access.ts'
import { FillFirstSelector } from '../src/proxy/credentialSelectors.ts'
import { BUILTIN_MODEL_ORDER, listGatewayModels } from '../src/proxy/modelsList.ts'
import { createProxyHandler } from '../src/proxy/server.ts'
import type { GatewayRoutingConfig, ModelCatalog } from '../src/proxy/upstreamRouting.ts'

const catalog: ModelCatalog = {
  haiku45: { firstParty: 'claude-haiku-4-5', bedrock: 'us.anthropic.claude-haiku-4-5' },
  sonnet45: { firstParty: 'claude-sonnet-4-5', bedrock: null },
  opus46: { firstParty: 'claude-opus-4-6', bedrock: 'us.anthropic.claude-opus-4-6' },
  sonnet5: { firstParty: 'claude-sonnet-5', bedrock: 'us.anthropic.claude-sonnet-5' },
}
const ids = (models: { id: string }[]) => models.map(m => m.id)

describe('listGatewayModels (Ih)', () => {
  test('los modelos declarados van primero, con su etiqueta y su descripción', () => {
    const list = listGatewayModels(
      [{ id: 'mx', label: 'Modelo X', description: 'el de pruebas', upstream_model: {} }, { id: 'my', upstream_model: {} }],
      [],
      false,
      catalog,
    )
    expect(list).toEqual([
      { type: 'model', id: 'mx', display_name: 'Modelo X', description: 'el de pruebas' },
      { type: 'model', id: 'my', display_name: 'my' },
    ])
  })

  test('con upstream anthropic, las familias del catálogo siguen el orden del ejecutable', () => {
    const list = listGatewayModels([], [{ name: 'a', provider: 'anthropic' }], true, catalog)
    expect(ids(list)).toEqual(['claude-opus-4-6', 'claude-sonnet-4-5', 'claude-haiku-4-5', 'claude-sonnet-5'])
  })

  test('un upstream anthropic anuncia todas las familias aunque declare su propia lista', () => {
    const list = listGatewayModels([], [{ name: 'a', provider: 'anthropic', models: ['claude-sonnet-5'] }], true, catalog)
    expect(ids(list)).toEqual(['claude-opus-4-6', 'claude-sonnet-4-5', 'claude-haiku-4-5', 'claude-sonnet-5'])
  })

  test('una familia que el proveedor no sirve (null) no se anuncia', () => {
    const list = listGatewayModels([], [{ name: 'b', provider: 'bedrock' }], true, catalog)
    expect(ids(list)).not.toContain('claude-sonnet-4-5')
    expect(ids(list)).toContain('claude-haiku-4-5')
  })

  test('la lista de modelos de un upstream acota lo que se anuncia', () => {
    const list = listGatewayModels([], [{ name: 'b', provider: 'bedrock', models: ['claude-sonnet-5'] }], true, catalog)
    expect(ids(list)).toEqual(['claude-sonnet-5'])
  })

  test('un modelo declarado con el id de una familia no se repite', () => {
    const list = listGatewayModels([{ id: 'claude-sonnet-5', label: 'propio', upstream_model: {} }], [{ name: 'a', provider: 'anthropic' }], true, catalog)
    expect(ids(list).filter(id => id === 'claude-sonnet-5')).toHaveLength(1)
    expect(list[0]?.display_name).toBe('propio')
  })

  test('sin auto_include no se añade ninguna familia', () => {
    expect(listGatewayModels([], [{ name: 'a', provider: 'anthropic' }], false, catalog)).toEqual([])
  })

  test('el orden empieza por opus46, sonnet45, haiku45 y sigue por el resto invertido', () => {
    expect(BUILTIN_MODEL_ORDER.slice(0, 4)).toEqual(['opus46', 'sonnet45', 'haiku45', 'fable51'])
    expect(BUILTIN_MODEL_ORDER.at(-1)).toBe('sonnet46')
  })
})

describe('GET /v1/models', () => {
  const KEY = 'sk-local-test'
  const routing: GatewayRoutingConfig = {
    upstreams: [{ name: 'a', provider: 'anthropic' }],
    models: [{ id: 'mx', upstream_model: { a: 'mx-a' } }],
    auto_include_builtin_models: false,
  }
  const handler = createProxyHandler({
    access: new AccessManager([createConfigApiKeyProvider([KEY])!]),
    routing,
    credentials: {},
    selector: new FillFirstSelector(),
    forward: async () => new Response('no debería reenviarse', { status: 500 }),
  })

  test('responde la lista con la forma paginada de la API', async () => {
    const response = await handler(new Request('http://127.0.0.1/v1/models', { headers: { 'x-api-key': KEY } }))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      data: [{ type: 'model', id: 'mx', display_name: 'mx' }],
      has_more: false,
      first_id: null,
      last_id: null,
    })
  })

  test('exige la clave local', async () => {
    const response = await handler(new Request('http://127.0.0.1/v1/models'))
    expect(response.status).toBe(401)
  })
})
