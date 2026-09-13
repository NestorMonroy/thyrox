/**
 * Cobertura de `getConnectionContextOptions`, la función agregada a
 * `connections.ts` para leer `ContextOptions` desde `providerSpecificData`
 * de una conexión (T-8, seguimiento del porte de `claudeExtraUsage.ts`).
 *
 * NO cubre el resto de `connections.ts` -- ese archivo no tenía suite antes
 * de este cambio, y backfillearla entera no es parte de esta tarea (se paga
 * al tocar cada función, no en un barrido). `getConnectionContextOptions`
 * es pura -- no llama a `requireConfig()` -- así que no hace falta mockear
 * `@thyrox/config` para probarla.
 */
import { describe, expect, test } from 'bun:test'
import { getConnectionContextOptions, type ConnectionRecord } from '../src/connections.ts'

function connection(providerSpecificData?: unknown): ConnectionRecord {
  return {
    id: 'c1',
    name: 'Test',
    protocol: 'anthropic',
    endpoint: 'https://api.anthropic.com',
    auth: { type: 'api_key', key: 'sk-test' },
    enabled: true,
    models: [],
    createdAt: 0,
    providerSpecificData,
  }
}

describe('getConnectionContextOptions', () => {
  test('compressToolResults en false por defecto, sin providerSpecificData', () => {
    expect(getConnectionContextOptions(connection())).toEqual({ compressToolResults: false })
  })

  test('compressToolResults en true cuando la conexion lo activo', () => {
    expect(getConnectionContextOptions(connection({ compressToolResults: true }))).toEqual({
      compressToolResults: true,
    })
  })

  test('otras claves de providerSpecificData no afectan el resultado', () => {
    expect(
      getConnectionContextOptions(connection({ compressToolResults: true, blockExtraUsage: false })),
    ).toEqual({ compressToolResults: true })
  })
})
