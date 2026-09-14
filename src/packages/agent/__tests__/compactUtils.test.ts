import { describe, expect, test } from 'bun:test'
import {
  stripImagesFromMessages,
  buildPostCompactMessages,
  annotateBoundaryWithPreservedSegment,
  mergeHookInstructions,
  isCompactBoundaryMessage,
  truncateHeadForPTLRetry,
  type CompactableMessage,
  type CompactBoundaryMessage,
  type CompactionResult,
} from '../compaction/compactUtils.ts'

describe('stripImagesFromMessages', () => {
  test('reemplaza un bloque image suelto de un mensaje user', () => {
    const messages: CompactableMessage[] = [
      { type: 'user', message: { content: [{ type: 'image' }, { type: 'text', text: 'hola' }] } },
    ]
    const [result] = stripImagesFromMessages(messages)
    expect(result!.message!.content).toEqual([{ type: 'text', text: '[image]' }, { type: 'text', text: 'hola' }])
  })

  test('reemplaza image/document anidados dentro de un tool_result', () => {
    const messages: CompactableMessage[] = [
      {
        type: 'user',
        message: {
          content: [{ type: 'tool_result', tool_use_id: 't1', content: [{ type: 'image' }, { type: 'text', text: 'ok' }] }],
        },
      },
    ]
    const [result] = stripImagesFromMessages(messages)
    const block = (result!.message!.content as Record<string, unknown>[])[0]!
    expect(block.content).toEqual([{ type: 'text', text: '[image]' }, { type: 'text', text: 'ok' }])
  })

  test('un mensaje sin media se devuelve por referencia idéntica (sin copia innecesaria)', () => {
    const m: CompactableMessage = { type: 'user', message: { content: [{ type: 'text', text: 'x' }] } }
    const [result] = stripImagesFromMessages([m])
    expect(result).toBe(m)
  })

  test('un mensaje que no es user se ignora aunque su content tenga forma de imagen', () => {
    const m: CompactableMessage = { type: 'assistant', message: { content: [{ type: 'image' }] } }
    const [result] = stripImagesFromMessages([m])
    expect(result).toBe(m)
  })
})

describe('buildPostCompactMessages', () => {
  test('el orden es siempre: frontera, resumen, conservados, adjuntos, hooks', () => {
    const boundary = { type: 'system' } as CompactBoundaryMessage
    const result: CompactionResult = {
      boundaryMarker: boundary,
      summaryMessages: [{ type: 's' }],
      attachments: [{ type: 'a' }],
      hookResults: [{ type: 'h' }],
      messagesToKeep: [{ type: 'k' }],
    }
    expect(buildPostCompactMessages(result).map((m) => m.type)).toEqual(['system', 's', 'k', 'a', 'h'])
  })

  test('sin messagesToKeep, el hueco simplemente no aparece', () => {
    const boundary = { type: 'system' } as CompactBoundaryMessage
    const result: CompactionResult = { boundaryMarker: boundary, summaryMessages: [], attachments: [], hookResults: [] }
    expect(buildPostCompactMessages(result).map((m) => m.type)).toEqual(['system'])
  })
})

describe('annotateBoundaryWithPreservedSegment', () => {
  test('sin mensajes conservados, la frontera vuelve intacta', () => {
    const boundary = { type: 'system' } as CompactBoundaryMessage
    expect(annotateBoundaryWithPreservedSegment(boundary, 'anchor', undefined)).toBe(boundary)
    expect(annotateBoundaryWithPreservedSegment(boundary, 'anchor', [])).toBe(boundary)
  })

  test('con mensajes conservados, anota head/anchor/tail por su uuid', () => {
    const boundary = { type: 'system' } as CompactBoundaryMessage
    const keep: CompactableMessage[] = [{ type: 'x', uuid: 'u1' }, { type: 'x', uuid: 'u2' }, { type: 'x', uuid: 'u3' }]
    const result = annotateBoundaryWithPreservedSegment(boundary, 'anchor-uuid', keep)
    expect(result.compactMetadata?.preservedSegment).toEqual({
      headUuid: 'u1',
      anchorUuid: 'anchor-uuid',
      tailUuid: 'u3',
    })
  })
})

describe('mergeHookInstructions', () => {
  test('sin ninguna de las dos, undefined', () => {
    expect(mergeHookInstructions(undefined, undefined)).toBeUndefined()
  })
  test('sólo hook: se devuelve tal cual', () => {
    expect(mergeHookInstructions(undefined, 'del hook')).toBe('del hook')
  })
  test('sólo usuario: se devuelve tal cual', () => {
    expect(mergeHookInstructions('del usuario', undefined)).toBe('del usuario')
  })
  test('ambas: se concatenan con doble salto de línea, usuario primero', () => {
    expect(mergeHookInstructions('del usuario', 'del hook')).toBe('del usuario\n\ndel hook')
  })
  test('usuario vacío se trata como ausente', () => {
    expect(mergeHookInstructions('', 'del hook')).toBe('del hook')
  })
})

describe('isCompactBoundaryMessage', () => {
  test('system con subtype compact_boundary: sí', () => {
    expect(isCompactBoundaryMessage({ type: 'system', subtype: 'compact_boundary' })).toBe(true)
  })
  test('cualquier otro: no', () => {
    expect(isCompactBoundaryMessage({ type: 'user' })).toBe(false)
  })
})

describe('truncateHeadForPTLRetry', () => {
  const round = (id: string): CompactableMessage[] => [
    { type: 'assistant', message: { id } },
    { type: 'user' },
  ]
  function deps(estimatePerGroup: number) {
    return {
      groupByRound: (msgs: CompactableMessage[]): CompactableMessage[][] => {
        const groups: CompactableMessage[][] = []
        for (let i = 0; i < msgs.length; i += 2) groups.push(msgs.slice(i, i + 2))
        return groups
      },
      estimateTokens: () => estimatePerGroup,
      prependUserMessage: (content: string, isMeta: boolean): CompactableMessage => ({
        type: 'user',
        isMeta,
        message: { content },
      }),
    }
  }

  test('con menos de 2 rondas, no hay nada que recortar: null', () => {
    const messages = round('a1')
    expect(truncateHeadForPTLRetry(messages, undefined, deps(100))).toBeNull()
  })

  test('sin tokenGap, recorta el 20% de las rondas (mínimo 1)', () => {
    const messages = [...round('a1'), ...round('a2'), ...round('a3'), ...round('a4'), ...round('a5')]
    const result = truncateHeadForPTLRetry(messages, undefined, deps(100))
    // 5 rondas * 20% = 1 -> recorta la primera ronda; quedan 4 rondas (8
    // mensajes) + 1 marcador antepuesto (la primera sobreviviente es un
    // assistant huérfano tras el recorte).
    expect(result?.length).toBe(9)
  })

  test('con tokenGap, acumula rondas hasta cubrirlo', () => {
    const messages = [...round('a1'), ...round('a2'), ...round('a3'), ...round('a4')]
    const result = truncateHeadForPTLRetry(messages, 250, deps(100))
    // 100+100+100=300 >= 250 tras 3 rondas -> queda 1 ronda (2 mensajes) +
    // 1 marcador antepuesto (empieza en assistant).
    expect(result?.length).toBe(3)
  })

  test('el dropCount nunca deja el resultado vacío: se acota a groups.length - 1', () => {
    const messages = [...round('a1'), ...round('a2')]
    const result = truncateHeadForPTLRetry(messages, 999_999, deps(100))
    // groups.length-1 = 1 ronda sobrevive (2 mensajes) + 1 marcador antepuesto.
    expect(result?.length).toBe(3)
  })

  test('si tras recortar el primer mensaje sobreviviente es un assistant huérfano, se antepone un marcador de usuario', () => {
    const messages = [...round('a1'), ...round('a2')]
    const result = truncateHeadForPTLRetry(messages, undefined, deps(100))
    expect(result?.[0]?.type).toBe('user')
    expect(result?.[0]?.isMeta).toBe(true)
    expect(result?.[1]?.type).toBe('assistant')
  })

  test('quita un marcador de retry previo antes de volver a agrupar (no lo deja duplicado)', () => {
    const previous: CompactableMessage = {
      type: 'user',
      isMeta: true,
      message: { content: '[earlier conversation truncated for compaction retry]' },
    }
    const messages = [previous, ...round('a1'), ...round('a2'), ...round('a3')]
    const result = truncateHeadForPTLRetry(messages, undefined, deps(100))
    // El objeto `previous` en sí NO sobrevive (se filtró antes de reagrupar);
    // puede aparecer un marcador NUEVO si el recorte deja un assistant
    // huérfano al frente, pero nunca dos -- eso probaría que el filtro
    // inicial no corrió.
    expect(result).not.toContain(previous)
    const markerCount = result?.filter(
      (m) => m.message?.content === previous.message?.content,
    ).length
    expect(markerCount).toBeLessThanOrEqual(1)
  })
})
