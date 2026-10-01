/**
 * La configuración del store: la URL como único contrato de conexión, la
 * negativa a degradar y la forma del esquema vectorial. Sin servidor: todo
 * rechazo ocurre antes de abrir una conexión.
 */
import { describe, expect, test } from 'bun:test'

import {
  EmbeddingDimensionError,
  resolveSemanticSearchDatabaseUrl,
  SEMANTIC_SEARCH_DATABASE_URL_VAR,
  SemanticSearchConfigError,
  validateEmbedding,
  validateEmbeddingShape,
  validateSchemaConfig,
  validateStoreUrl,
} from '../config.ts'

describe('resolveSemanticSearchDatabaseUrl', () => {
  test('lee la URL de la variable declarada', () => {
    expect(resolveSemanticSearchDatabaseUrl({ [SEMANTIC_SEARCH_DATABASE_URL_VAR]: ' postgres://u@db.example/x ' }))
      .toBe('postgres://u@db.example/x')
  })

  test('sin la variable rehúsa nombrándola: no hay base por defecto', () => {
    expect(() => resolveSemanticSearchDatabaseUrl({})).toThrow(SEMANTIC_SEARCH_DATABASE_URL_VAR)
    expect(() => resolveSemanticSearchDatabaseUrl({ [SEMANTIC_SEARCH_DATABASE_URL_VAR]: '  ' })).toThrow(SemanticSearchConfigError)
  })
})

describe('validateStoreUrl', () => {
  test('acepta postgres:// y postgresql://', () => {
    expect(validateStoreUrl('postgres://u@h/db')).toBe('postgres://u@h/db')
    expect(validateStoreUrl('postgresql://u@h/db')).toBe('postgresql://u@h/db')
  })

  test('sqlite: y file: rehúsan: no cae a SQLite', () => {
    expect(() => validateStoreUrl('sqlite:///x.db')).toThrow(/PostgreSQL/)
    expect(() => validateStoreUrl('file:x.db')).toThrow(SemanticSearchConfigError)
  })

  test('el rechazo no filtra la contraseña', () => {
    expect(() => validateStoreUrl('mysql://user:secret@h/db')).toThrow(SemanticSearchConfigError)
    expect(() => validateStoreUrl('mysql://user:secret@h/db')).not.toThrow(/secret/)
  })
})

describe('validateSchemaConfig', () => {
  test('acepta un esquema con nombre de identificador simple', () => {
    expect(validateSchemaConfig({ name: 'semantic' })).toEqual({ name: 'semantic' })
  })

  test('rechaza un nombre que no es un identificador simple', () => {
    expect(() => validateSchemaConfig({ name: 'a; DROP' })).toThrow(SemanticSearchConfigError)
  })
})

describe('validateEmbeddingShape', () => {
  test('acepta una dimensión positiva con representación conocida', () => {
    const shape = { dimensions: 1536, representation: 'halfvec' as const }
    expect(validateEmbeddingShape(shape)).toEqual(shape)
  })

  test('rechaza una dimensión no entera o no positiva', () => {
    expect(() => validateEmbeddingShape({ dimensions: 0, representation: 'vector' })).toThrow(/dimensions/)
    expect(() => validateEmbeddingShape({ dimensions: 2.5, representation: 'vector' })).toThrow(/dimensions/)
  })

  test('rechaza una representación desconocida', () => {
    const shape = { dimensions: 3, representation: 'sparsevec' } as unknown as Parameters<typeof validateEmbeddingShape>[0]
    expect(() => validateEmbeddingShape(shape)).toThrow(/sparsevec/)
  })
})

describe('validateEmbedding', () => {
  test('un vector de otra dimensión se rechaza nombrando las dos', () => {
    expect(() => validateEmbedding([1, 2], 3)).toThrow(EmbeddingDimensionError)
    expect(() => validateEmbedding([1, 2], 3)).toThrow(/2.*3|3.*2/)
  })

  test('un componente no finito se rechaza', () => {
    expect(() => validateEmbedding([1, Number.NaN, 3], 3)).toThrow(/finite/)
  })

  test('un vector de la dimensión declarada pasa', () => {
    expect(() => validateEmbedding([1, 2, 3], 3)).not.toThrow()
  })
})
