/**
 * Los hogares del reconciliador (TASK-THYROX-0729): la caché de artefactos y
 * el índice de ubicaciones caen bajo `.thyrox/models/` de la raíz salvo
 * declaración, y una declaración vacía no cuenta.
 */
import { describe, expect, test } from 'bun:test'

import { MODEL_ARTIFACT_CACHE_DIR_VAR, MODEL_ARTIFACT_LOCATIONS_VAR, localArtifactHome } from '@thyrox/model-artifacts/localModelHome.ts'

describe('localArtifactHome', () => {
  test('sin declarar, caen bajo .thyrox/models de la raíz', () => {
    expect(localArtifactHome({}, '/clone/')).toEqual({
      artifactCache: '/clone/.thyrox/models/artifacts',
      artifactLocations: '/clone/.thyrox/models/artifact-locations.json',
    })
  })

  test('la declaración gana; una vacía cae al default', () => {
    const home = localArtifactHome({ [MODEL_ARTIFACT_CACHE_DIR_VAR]: '/cache', [MODEL_ARTIFACT_LOCATIONS_VAR]: ' ' }, '/clone')
    expect([home.artifactCache, home.artifactLocations]).toEqual(['/cache', '/clone/.thyrox/models/artifact-locations.json'])
  })

  test('las claves son las del contrato', () => {
    expect([MODEL_ARTIFACT_CACHE_DIR_VAR, MODEL_ARTIFACT_LOCATIONS_VAR]).toEqual(['THYROX_MODEL_ARTIFACT_CACHE_DIR', 'THYROX_MODEL_ARTIFACT_LOCATIONS'])
  })
})
