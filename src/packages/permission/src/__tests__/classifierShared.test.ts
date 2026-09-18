import { describe, expect, test } from 'bun:test'
import { z } from 'zod/v4'
import {
  extractToolUseBlock,
  parseClassifierResponse,
} from '../classifierShared.js'

type Block = Parameters<typeof extractToolUseBlock>[0][number]

describe('extractToolUseBlock', () => {
  test('returns matching tool_use block', () => {
    const blocks: Block[] = [
      { type: 'text', text: 'thinking' } as never,
      { type: 'tool_use', id: 'tu1', name: 'Bash', input: { cmd: 'ls' } } as never,
    ]
    const result = extractToolUseBlock(blocks, 'Bash')
    expect(result?.id).toBe('tu1')
    expect(result?.name).toBe('Bash')
  })

  test('returns FIRST matching block when multiple present', () => {
    // Copia de `ccnmt: packages/permission/src/__tests__/classifierShared.test.ts`
    // con los comentarios traducidos; el cuerpo es el de la fuente.
    //
    // `.find` devuelve el primero. Queda documentado: si un refactor futuro
    // usara `.findLast`, se clasificaría el `tool_use` equivocado.
    const blocks: Block[] = [
      { type: 'tool_use', id: 'first', name: 'Bash', input: {} } as never,
      { type: 'tool_use', id: 'second', name: 'Bash', input: {} } as never,
    ]
    expect(extractToolUseBlock(blocks, 'Bash')?.id).toBe('first')
  })

  test('returns null when no tool_use block has matching name', () => {
    const blocks: Block[] = [
      { type: 'tool_use', id: 'tu1', name: 'Edit', input: {} } as never,
    ]
    expect(extractToolUseBlock(blocks, 'Bash')).toBeNull()
  })

  test('returns null for empty content', () => {
    expect(extractToolUseBlock([], 'Bash')).toBeNull()
  })

  test('returns null when only non-tool_use blocks present', () => {
    const blocks: Block[] = [
      { type: 'text', text: 'thinking' } as never,
      { type: 'thinking', thinking: 'hmm' } as never,
    ]
    expect(extractToolUseBlock(blocks, 'Bash')).toBeNull()
  })

  test('case-sensitive name matching', () => {
    const blocks: Block[] = [
      { type: 'tool_use', id: 'tu1', name: 'Bash', input: {} } as never,
    ]
    // 'bash' en minúscula NO casa con 'Bash'.
    expect(extractToolUseBlock(blocks, 'bash')).toBeNull()
  })

  test('skips text blocks even with matching content', () => {
    // La función comprueba `b.type === 'tool_use'` Y el nombre. Un bloque de
    // texto cuya cadena resulte ser 'Bash' NO debe casar.
    const blocks: Block[] = [
      { type: 'text', text: 'Bash' } as never,
    ]
    expect(extractToolUseBlock(blocks, 'Bash')).toBeNull()
  })

  test('post-narrow check (block.type !== "tool_use") catches null block', () => {
    // Defensa en profundidad: aunque `.find` devuelva algo con
    // `type=tool_use`, el segundo `if (!block || block.type !== 'tool_use')`
    // protege de sorpresas. Se prueba el comportamiento de fallar cerrado
    // cuando no hay coincidencia.
    expect(extractToolUseBlock([] as Block[], 'Anything')).toBeNull()
  })
})

describe('parseClassifierResponse', () => {
  const schema = z.object({
    decision: z.enum(['allow', 'deny', 'ask']),
    reason: z.string(),
  })

  test('returns parsed data when input matches schema', () => {
    const block = {
      type: 'tool_use' as const,
      id: 't',
      name: 'classify',
      input: { decision: 'allow' as const, reason: 'safe' },
    }
    const result = parseClassifierResponse(block, schema)
    expect(result).toEqual({ decision: 'allow', reason: 'safe' })
  })

  test('returns null when input fails schema validation', () => {
    const block = {
      type: 'tool_use' as const,
      id: 't',
      name: 'classify',
      input: { decision: 'invalid', reason: 'safe' },
    }
    expect(parseClassifierResponse(block, schema)).toBeNull()
  })

  test('returns null when required fields missing', () => {
    const block = {
      type: 'tool_use' as const,
      id: 't',
      name: 'classify',
      input: { decision: 'allow' /* falta la razón */ },
    }
    expect(parseClassifierResponse(block, schema)).toBeNull()
  })

  test('returns null when input is not an object', () => {
    const block = {
      type: 'tool_use' as const,
      id: 't',
      name: 'classify',
      input: 'string instead of object',
    }
    expect(parseClassifierResponse(block, schema)).toBeNull()
  })

  test('preserves type narrowing — returned data is z.infer<typeof schema>', () => {
    // Comprobación en tiempo de compilación: el tipo del dato devuelto
    // coincide con lo que el esquema infiere. Si el esquema exige
    // `{decision, reason}`, el objeto devuelto en tiempo de ejecución tiene
    // esos campos cuando no es null.
    const block = {
      type: 'tool_use' as const,
      id: 't',
      name: 'classify',
      input: { decision: 'deny' as const, reason: 'unsafe' },
    }
    const result = parseClassifierResponse(block, schema)
    if (result !== null) {
      // El tipo se estrecha a `{decision, reason}`.
      expect(result.decision).toBe('deny')
      expect(result.reason).toBe('unsafe')
    } else {
      throw new Error('expected non-null')
    }
  })

  test('strips extra fields per schema definition', () => {
    // `z.object` descarta por defecto los campos desconocidos (el
    // estricto-por-defecto de zod v4 es opt-in). Queda documentado.
    const block = {
      type: 'tool_use' as const,
      id: 't',
      name: 'classify',
      input: {
        decision: 'allow' as const,
        reason: 'safe',
        extraField: 'should be stripped',
      },
    }
    const result = parseClassifierResponse(block, schema) as Record<
      string,
      unknown
    >
    expect(result).toEqual({ decision: 'allow', reason: 'safe' })
    expect(result.extraField).toBeUndefined()
  })

  test('safeParse failure returns null (does NOT throw)', () => {
    // Contrato crítico: la función NUNCA debe lanzar. Si `schema.safeParse`
    // devuelve `success=false`, devuelve null. Un lanzamiento aquí reventaría
    // el turno del clasificador.
    const block = {
      type: 'tool_use' as const,
      id: 't',
      name: 'classify',
      input: null, // invalid for object schema
    }
    expect(() => parseClassifierResponse(block, schema)).not.toThrow()
    expect(parseClassifierResponse(block, schema)).toBeNull()
  })
})
