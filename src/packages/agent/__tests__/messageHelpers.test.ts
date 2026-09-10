/**
 * Porte de `ccnmt: packages/agent/__tests__/messageHelpers.test.ts`.
 *
 * `internal/messageHelpers.ts` NO es la familia `messages/helpers` — es un
 * módulo homónimo, distinto: aquí viven `SYNTHETIC_MESSAGES` (el conjunto de
 * cadenas sintéticas que un consumidor usa como ancla para NO contarlas como
 * prompt real del usuario) y `countToolCalls` (cuenta MENSAJES de asistente
 * que usan una tool dada, no bloques `tool_use` individuales).
 */
import { describe, expect, test } from 'bun:test'
import {
  countToolCalls,
  SYNTHETIC_MESSAGES,
} from '../internal/messageHelpers.js'

type Msg = Parameters<typeof countToolCalls>[0][number]

describe('SYNTHETIC_MESSAGES — cadenas sintéticas conocidas', () => {
  // Estas cadenas se usan en otros módulos como ancla para detectar
  // mensajes de usuario sintéticos inyectados (p. ej. filtrado de
  // transcript, conteo de atribución). Si un cambio futuro agrega un
  // mensaje sintético nuevo y olvida actualizar este set, el mensaje se
  // contaría como un prompt real — inflando el conteo en silencio.

  test('contiene "[Request interrupted by user]"', () => {
    expect(SYNTHETIC_MESSAGES.has('[Request interrupted by user]')).toBe(true)
  })
  test('contiene "[Request interrupted by user for tool use]"', () => {
    expect(
      SYNTHETIC_MESSAGES.has('[Request interrupted by user for tool use]'),
    ).toBe(true)
  })
  test('contiene "No response requested."', () => {
    expect(SYNTHETIC_MESSAGES.has('No response requested.')).toBe(true)
  })
  test('contiene el rechazo "doesn\'t want to take this action"', () => {
    const rejection = SYNTHETIC_MESSAGES.values()
    let found = false
    for (const m of rejection) {
      if (m.includes("doesn't want to take this action")) found = true
    }
    expect(found).toBe(true)
  })
  test('contiene el rechazo "doesn\'t want to proceed with this tool"', () => {
    let found = false
    for (const m of SYNTHETIC_MESSAGES) {
      if (m.includes("doesn't want to proceed with this tool")) found = true
    }
    expect(found).toBe(true)
  })

  test('NO contiene mensajes escritos por el usuario (p. ej. "hi")', () => {
    expect(SYNTHETIC_MESSAGES.has('hi')).toBe(false)
    expect(SYNTHETIC_MESSAGES.has('hello')).toBe(false)
    expect(SYNTHETIC_MESSAGES.has('')).toBe(false)
  })
})

describe('countToolCalls — casos vacíos / sin match', () => {
  test('devuelve 0 con la lista de mensajes vacía', () => {
    expect(countToolCalls([], 'Bash')).toBe(0)
  })

  test('devuelve 0 cuando no hay mensajes de assistant', () => {
    expect(
      countToolCalls(
        [{ type: 'user', message: { content: [] } } as never],
        'Bash',
      ),
    ).toBe(0)
  })

  test('devuelve 0 cuando ningún mensaje usa la tool pedida', () => {
    const messages: Msg[] = [
      {
        type: 'assistant',
        message: {
          content: [{ type: 'tool_use', id: 'x', name: 'Edit', input: {} }],
        },
      } as never,
    ]
    expect(countToolCalls(messages, 'Bash')).toBe(0)
  })

  test('salta mensajes falsy (null/undefined)', () => {
    const messages = [null, undefined, null] as never as Msg[]
    expect(countToolCalls(messages, 'Bash')).toBe(0)
  })
})

describe('countToolCalls — conteo básico', () => {
  test('cuenta un solo tool_use', () => {
    const messages: Msg[] = [
      {
        type: 'assistant',
        message: {
          content: [{ type: 'tool_use', id: 'x', name: 'Bash', input: {} }],
        },
      } as never,
    ]
    expect(countToolCalls(messages, 'Bash')).toBe(1)
  })

  test('cuenta cada mensaje de ASSISTANT que usa la tool, no cada bloque tool_use', () => {
    // Contrato: la función cuenta MENSAJES con ≥1 tool_use que hace match,
    // NO bloques tool_use individuales. Dos tool_use en el mismo mensaje
    // cuentan como 1.
    const messages: Msg[] = [
      {
        type: 'assistant',
        message: {
          content: [
            { type: 'tool_use', id: 'x', name: 'Bash', input: {} },
            { type: 'tool_use', id: 'y', name: 'Bash', input: {} },
          ],
        },
      } as never,
    ]
    expect(countToolCalls(messages, 'Bash')).toBe(1)
  })

  test('cuenta a través de varios mensajes de assistant', () => {
    const messages: Msg[] = [
      {
        type: 'assistant',
        message: {
          content: [{ type: 'tool_use', id: 'a', name: 'Bash', input: {} }],
        },
      } as never,
      {
        type: 'assistant',
        message: {
          content: [{ type: 'tool_use', id: 'b', name: 'Bash', input: {} }],
        },
      } as never,
    ]
    expect(countToolCalls(messages, 'Bash')).toBe(2)
  })

  test('NO cuenta mensajes de user/system', () => {
    const messages: Msg[] = [
      {
        type: 'user',
        message: {
          content: [{ type: 'tool_use', id: 'x', name: 'Bash', input: {} }],
        },
      } as never,
    ]
    expect(countToolCalls(messages, 'Bash')).toBe(0)
  })

  test('NO cuenta cuando el content del assistant no es un array', () => {
    const messages: Msg[] = [
      { type: 'assistant', message: { content: 'plain string' } } as never,
    ]
    expect(countToolCalls(messages, 'Bash')).toBe(0)
  })

  test('sólo cuenta el nombre de tool que hace match (case-sensitive)', () => {
    const messages: Msg[] = [
      {
        type: 'assistant',
        message: {
          content: [{ type: 'tool_use', id: 'x', name: 'bash', input: {} }],
        },
      } as never,
    ]
    expect(countToolCalls(messages, 'Bash')).toBe(0)
    expect(countToolCalls(messages, 'bash')).toBe(1)
  })
})

describe('countToolCalls — salida temprana vía maxCount', () => {
  // Contrato crítico: maxCount permite al llamador dejar de iterar en
  // cuanto vio "suficiente" — lo usan chequeos de camino caliente que
  // sólo necesitan "≥N", no el conteo exacto.

  test('devuelve de inmediato cuando el conteo llega a maxCount', () => {
    const messages: Msg[] = Array.from({ length: 10 }, (_, i) => ({
      type: 'assistant',
      message: {
        content: [
          { type: 'tool_use', id: `tu_${i}`, name: 'Bash', input: {} },
        ],
      },
    })) as never
    expect(countToolCalls(messages, 'Bash', 3)).toBe(3)
  })

  test('NO sale temprano cuando el conteo está por debajo de maxCount', () => {
    const messages: Msg[] = [
      {
        type: 'assistant',
        message: {
          content: [{ type: 'tool_use', id: 'x', name: 'Bash', input: {} }],
        },
      } as never,
    ]
    expect(countToolCalls(messages, 'Bash', 5)).toBe(1)
  })

  test('devuelve el conteo completo cuando maxCount es undefined', () => {
    const messages: Msg[] = Array.from({ length: 5 }, (_, i) => ({
      type: 'assistant',
      message: {
        content: [
          { type: 'tool_use', id: `tu_${i}`, name: 'Bash', input: {} },
        ],
      },
    })) as never
    expect(countToolCalls(messages, 'Bash')).toBe(5)
  })

  test('maxCount=0 es falsy y en la práctica desactiva la salida temprana', () => {
    // Contrato: `maxCount && count >= maxCount` corta en corto cuando
    // maxCount=0 porque 0 es falsy. Pasar 0 se comporta como "sin tope".
    // Este caso documenta esa rareza — pasar 0 no devuelve 0.
    const messages: Msg[] = [
      {
        type: 'assistant',
        message: {
          content: [{ type: 'tool_use', id: 'x', name: 'Bash', input: {} }],
        },
      } as never,
    ]
    expect(countToolCalls(messages, 'Bash', 0)).toBe(1)
  })
})
