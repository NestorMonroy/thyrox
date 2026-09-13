import { describe, expect, test } from 'bun:test'
import { isSnipBoundaryMessage, projectSnippedView } from '../compaction/snipProjection.ts'
import type { Message } from '../messageShapes.ts'

const boundary: Message = { type: 'system', subtype: 'snip_boundary' }
const otherSystem: Message = { type: 'system', subtype: 'other' }
const user: Message = { type: 'user' }

describe('isSnipBoundaryMessage', () => {
  test('un system con subtype snip_boundary es la frontera', () => {
    expect(isSnipBoundaryMessage(boundary)).toBe(true)
  })
  test('un system con otro subtype no lo es', () => {
    expect(isSnipBoundaryMessage(otherSystem)).toBe(false)
  })
  test('un mensaje que no es system nunca lo es, aunque lleve el subtype', () => {
    expect(isSnipBoundaryMessage({ type: 'user', subtype: 'snip_boundary' } as Message)).toBe(false)
  })
})

describe('projectSnippedView', () => {
  test('sin frontera, devuelve todos los mensajes intactos', () => {
    const messages = [user, otherSystem]
    expect(projectSnippedView(messages)).toBe(messages)
  })

  test('con frontera, descarta todo lo anterior a ella (la frontera queda incluida)', () => {
    const before = user
    const after = otherSystem
    const result = projectSnippedView([before, boundary, after])
    expect(result).toEqual([boundary, after])
  })

  test('control de anulación: si isSnipBoundaryMessage siempre diera false, projectSnippedView jamás recortaría', () => {
    const alwaysFalse = () => false
    const projectWithoutBoundary = (messages: Message[]): Message[] => {
      const boundaryIndex = messages.findIndex(alwaysFalse)
      if (boundaryIndex === -1) return messages
      return messages.slice(boundaryIndex)
    }
    const messages = [user, boundary, otherSystem]
    expect(projectWithoutBoundary(messages)).toBe(messages)
    expect(projectSnippedView(messages)).not.toBe(messages)
  })
})
