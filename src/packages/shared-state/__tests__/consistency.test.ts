import { describe, expect, test } from 'bun:test'
import { SharedStateUnavailableError } from '../consistency.ts'

describe('SharedStateUnavailableError', () => {
  test('lleva la clase de consistencia, un nombre estable y hereda de Error', () => {
    const error = new SharedStateUnavailableError('requiresGlobalConsistency', 'redis caído')
    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('SharedStateUnavailableError')
    expect(error.consistency).toBe('requiresGlobalConsistency')
    expect(error.message).toBe('redis caído')
  })
})
