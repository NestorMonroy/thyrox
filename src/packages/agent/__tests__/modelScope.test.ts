/**
 * El alcance del modelo de respaldo de 2.1.283 (`chunk-5t3x93y6.js`): `vV`
 * clasifica un modelo pedido en `eap`, `catalog_flag`, `gb_listed` u `other`,
 * combinando `ahe`, `Be`+`$h`+`MNe`+`Tle`+`$5` (`chunk-ps9bsv64.js`,
 * `chunk-k8zfq8xg.js`, `chunk-t6pwageh.js`, `chunk-s7awe3vb.js`) e `izn`.
 */
import { afterEach, describe, expect, test } from 'bun:test'

import { resetCapabilityLookupsForTests, setServedCapabilityLookup } from '../modelCapabilities.ts'
import {
  classifyModelScope,
  defaultFableModelMatches,
  fable5MitigationsActive,
  hasEapSuffix,
  isFableFamily,
  isListedModel,
  listedModelIdsFromEnv,
  modelIdsEquivalent,
} from '../modelScope.ts'

const FABLE_ENV = 'ANTHROPIC_DEFAULT_FABLE_MODEL'
const LISTED_ENV = 'THYROX_CODE_MODEL_SCOPE_LISTED_MODELS'

afterEach(() => {
  delete process.env[FABLE_ENV]
  delete process.env[LISTED_ENV]
  resetCapabilityLookupsForTests()
})

describe('hasEapSuffix (ahe)', () => {
  test('el sufijo -eap, con o sin corchete de contexto, sin distinguir mayúsculas', () => {
    expect(hasEapSuffix('claude-sonnet-5-eap')).toBe(true)
    expect(hasEapSuffix('claude-sonnet-5-EAP[1m]')).toBe(true)
    expect(hasEapSuffix('claude-sonnet-5-eapx')).toBe(false)
    expect(hasEapSuffix('claude-sonnet-5')).toBe(false)
  })
})

describe('isFableFamily (MNe)', () => {
  test('sólo el prefijo canónico de la familia fable', () => {
    expect(isFableFamily('claude-fable-5')).toBe(true)
    expect(isFableFamily('claude-fable-5-1')).toBe(true)
    expect(isFableFamily('claude-opus-5')).toBe(false)
  })
})

describe('fable5MitigationsActive (Tle)', () => {
  test('sin consulta servida, cae al catálogo y después a claude-mythos-5', () => {
    expect(fable5MitigationsActive('claude-fable-5-1', 'claude-fable-5-1')).toBe(true)
    expect(fable5MitigationsActive('claude-opus-5', 'claude-opus-5')).toBe(false)
    expect(fable5MitigationsActive('claude-mythos-5', 'claude-mythos-5')).toBe(true)
  })

  test('la consulta servida afirma incluso donde el catálogo no lo hace', () => {
    setServedCapabilityLookup(() => true)
    expect(fable5MitigationsActive('claude-opus-5', 'claude-opus-5')).toBe(true)
  })

  test('la anulación explícita del entorno gana sobre el respaldo de claude-mythos-5', () => {
    process.env.THYROX_CODE_MODEL_CAPABILITIES = 'claude-mythos-5=-fable_5_mitigations'
    expect(fable5MitigationsActive('claude-mythos-5', 'claude-mythos-5')).toBe(false)
    delete process.env.THYROX_CODE_MODEL_CAPABILITIES
  })
})

describe('defaultFableModelMatches ($5) — ANTHROPIC_DEFAULT_FABLE_MODEL', () => {
  test('sin la variable no coincide nunca', () => {
    expect(defaultFableModelMatches('claude-opus-5')).toBe(false)
  })

  test('coincide por nombre, ignorando el sufijo [1m] en cualquiera de los dos', () => {
    process.env[FABLE_ENV] = 'claude-opus-5'
    expect(defaultFableModelMatches('claude-opus-5[1m]')).toBe(true)
    expect(defaultFableModelMatches('claude-opus-5-5')).toBe(false)
    process.env[FABLE_ENV] = 'claude-opus-5[1m]'
    expect(defaultFableModelMatches('claude-opus-5')).toBe(true)
  })
})

describe('modelIdsEquivalent ($x)', () => {
  test('ignora mayúsculas y el sufijo [1m]', () => {
    expect(modelIdsEquivalent('claude-OPUS-5[1M]', 'claude-opus-5')).toBe(true)
    expect(modelIdsEquivalent('claude-opus-5', 'claude-opus-5-5')).toBe(false)
  })
})

describe('listedModelIdsFromEnv (X) — THYROX_CODE_MODEL_SCOPE_LISTED_MODELS', () => {
  test('sin la variable, lista vacía', () => {
    expect(listedModelIdsFromEnv()).toEqual([])
  })

  test('separados por coma, recorta espacios y descarta vacíos', () => {
    process.env[LISTED_ENV] = ' claude-preview-a ,claude-preview-b,, '
    expect(listedModelIdsFromEnv()).toEqual(['claude-preview-a', 'claude-preview-b'])
  })
})

describe('isListedModel (izn)', () => {
  test('coincide contra la lista del entorno, sin distinguir mayúsculas ni [1m]', () => {
    process.env[LISTED_ENV] = 'claude-preview-a'
    expect(isListedModel('claude-PREVIEW-A[1m]')).toBe(true)
    expect(isListedModel('claude-preview-b')).toBe(false)
  })
})

describe('classifyModelScope (vV)', () => {
  test('el sufijo -eap manda sobre todo lo demás', () => {
    process.env[LISTED_ENV] = 'claude-sonnet-5-eap'
    expect(classifyModelScope('claude-sonnet-5-eap')).toBe('eap')
  })

  test('catalog_flag: refusal_fallback en el catálogo, sin ser fable ni tener mitigación activa ni el modelo por defecto', () => {
    expect(classifyModelScope('claude-opus-5')).toBe('catalog_flag')
  })

  test('la familia fable impide catalog_flag aunque refusal_fallback llegue por la consulta servida, no por el catálogo', () => {
    setServedCapabilityLookup(capability => (capability === 'refusal_fallback' ? true : undefined))
    expect(classifyModelScope('claude-fable-9')).toBe('other')
  })

  test('una familia fable con refusal_fallback no cae en catalog_flag', () => {
    expect(classifyModelScope('claude-fable-5-1')).toBe('other')
    process.env[LISTED_ENV] = 'claude-fable-5-1'
    expect(classifyModelScope('claude-fable-5-1')).toBe('gb_listed')
  })

  test('el modelo fijado por ANTHROPIC_DEFAULT_FABLE_MODEL tampoco cae en catalog_flag', () => {
    process.env[FABLE_ENV] = 'claude-opus-5'
    expect(classifyModelScope('claude-opus-5')).toBe('other')
  })

  test('la mitigación de Fable 5 activa (claude-mythos-5, sin ser fable) impide catalog_flag', () => {
    setServedCapabilityLookup(capability => (capability === 'refusal_fallback' ? true : undefined))
    expect(classifyModelScope('claude-mythos-5')).toBe('other')
  })

  test('gb_listed cuando el catálogo no afirma refusal_fallback pero el entorno lista el modelo', () => {
    process.env[LISTED_ENV] = 'claude-preview-unlisted-elsewhere'
    expect(classifyModelScope('claude-preview-unlisted-elsewhere')).toBe('gb_listed')
  })

  test('other cuando ninguna condición aplica', () => {
    expect(classifyModelScope('claude-desconocido-9')).toBe('other')
  })
})
