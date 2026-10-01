/**
 * El catálogo de familias de modelo (`ALL_MODEL_CONFIGS`) cubre las claves
 * que el ejecutable 2.1.283 declara en `CATALOG_ID_TO_KEY` (`U` en
 * `chunk-4h0c4z04.js`), y cada familia nueva lleva los ids por proveedor de
 * su `provider_ids`. Las cifras esperadas se leyeron de
 * `_references/claude-code-bin/2.1.283/bunfs-root/`; la prueba no lo lee en
 * tiempo de ejecución.
 */
import { describe, expect, test } from 'bun:test'
import { ALL_MODEL_CONFIGS } from '../src/model/configs.ts'

const CATALOG_ID_TO_KEY: Record<string, string> = {
  'claude-3-5-haiku': 'haiku35',
  'claude-haiku-4-5': 'haiku45',
  'claude-3-5-sonnet': 'sonnet35',
  'claude-3-7-sonnet': 'sonnet37',
  'claude-sonnet-4-0': 'sonnet40',
  'claude-sonnet-4-5': 'sonnet45',
  'claude-sonnet-4-6': 'sonnet46',
  'claude-sonnet-5': 'sonnet5',
  'claude-opus-4-0': 'opus40',
  'claude-opus-4-1': 'opus41',
  'claude-opus-4-5': 'opus45',
  'claude-opus-4-6': 'opus46',
  'claude-opus-4-7': 'opus47',
  'claude-opus-4-8': 'opus48',
  'claude-opus-5': 'opus5',
  'claude-opus-5-5': 'opus55',
  'claude-fable-5': 'fable5',
  'claude-fable-5-1': 'fable51',
}

const catalog = ALL_MODEL_CONFIGS as unknown as Record<string, Record<string, string> | undefined>

describe('ALL_MODEL_CONFIGS', () => {
  test('tiene una familia por cada clave del catálogo de 2.1.283', () => {
    const missing = Object.values(CATALOG_ID_TO_KEY).filter(key => catalog[key] === undefined)
    expect(missing).toEqual([])
  })

  test.each(['sonnet5', 'opus5', 'opus55', 'fable5', 'fable51'])('%s lleva los ids de su provider_ids', key => {
    const id = Object.entries(CATALOG_ID_TO_KEY).find(([, k]) => k === key)![0]
    expect(catalog[key]).toMatchObject({
      firstParty: id,
      bedrock: `us.anthropic.${id}`,
      vertex: id,
      foundry: id,
    })
  })
})
