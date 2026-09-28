/**
 * `envExpansion.ts` es el reenvío de la fuente: la expansión vive en
 * `@thyrox/config/utils/envExpansion` y este módulo la reexporta, así que la
 * función que ve un consumidor de `mcp-runtime` es la misma, no un envoltorio.
 */
import { describe, expect, test } from 'bun:test'
import { expandEnvVarsInString as fromConfig } from '@thyrox/config/utils/envExpansion.js'
import { expandEnvVarsInString } from '../envExpansion.js'

describe('envExpansion', () => {
  test('reexporta la función de config', () => {
    expect(expandEnvVarsInString).toBe(fromConfig)
  })
})
