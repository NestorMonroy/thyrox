/**
 * Porte de `ccnmt: packages/agent/__tests__/sdkMappers.test.ts` — el mapeo
 * de forma interna (Anthropic, camelCase) al contrato de salida del SDK
 * (snake_case). Es el contrato de wire-protocol para consumidores del SDK:
 * una regresión aquí rompe a todos en silencio.
 */
import { describe, expect, test } from 'bun:test'
import {
  localCommandOutputToSDKAssistantMessage,
  toSDKCompactMetadata,
} from '../internal/sdkMappers.ts'

describe('toSDKCompactMetadata', () => {
  test('metadata básica: trigger + preTokens, sin preservedSegment', () => {
    const result = toSDKCompactMetadata({
      trigger: 'auto',
      preTokens: 42000,
    } as never)
    expect(result).toEqual({
      trigger: 'auto',
      pre_tokens: 42000,
    })
    // preservedSegment OMITIDO cuando no está presente.
    expect(result).not.toHaveProperty('preserved_segment')
  })

  test('con preservedSegment: las claves pasan a snake_case', () => {
    const result = toSDKCompactMetadata({
      trigger: 'manual',
      preTokens: 100000,
      preservedSegment: {
        headUuid: 'h1',
        anchorUuid: 'a1',
        tailUuid: 't1',
      },
    } as never)
    expect(result.preserved_segment).toEqual({
      head_uuid: 'h1',
      anchor_uuid: 'a1',
      tail_uuid: 't1',
    })
  })

  test('preservedSegment con campos extra conserva sólo las tres claves fijadas', () => {
    // A prueba de futuro: si preservedSegment crece, la forma del SDK no
    // expone accidentalmente campos nuevos. Sólo las tres documentadas.
    const result = toSDKCompactMetadata({
      trigger: 'auto',
      preTokens: 0,
      preservedSegment: {
        headUuid: 'h',
        anchorUuid: 'a',
        tailUuid: 't',
        extraInternalField: 'leak-me',
      },
    } as never)
    expect(result.preserved_segment).toEqual({
      head_uuid: 'h',
      anchor_uuid: 'a',
      tail_uuid: 't',
    })
    expect(result.preserved_segment).not.toHaveProperty('extraInternalField')
    expect(result.preserved_segment).not.toHaveProperty(
      'extra_internal_field',
    )
  })

  test('preTokens en cero se conserva (no se descarta por falsy)', () => {
    const result = toSDKCompactMetadata({
      trigger: 'auto',
      preTokens: 0,
    } as never)
    expect(result.pre_tokens).toBe(0)
  })
})

describe('localCommandOutputToSDKAssistantMessage', () => {
  test('elimina los códigos de escape ANSI', () => {
    const result = localCommandOutputToSDKAssistantMessage(
      '\x1b[31mred text\x1b[0m',
      'u1',
      's1',
      'stdout',
      'stderr',
    )
    expect((result.content[0] as { text: string }).text).toBe('red text')
  })

  test('elimina los envoltorios configurados de stdout/stderr', () => {
    const result = localCommandOutputToSDKAssistantMessage(
      '<stdout>hello</stdout>',
      'u1',
      's1',
      'stdout',
      'stderr',
    )
    expect((result.content[0] as { text: string }).text).toBe('hello')
  })

  test('elimina tanto el envoltorio de stdout como el de stderr', () => {
    const result = localCommandOutputToSDKAssistantMessage(
      '<stdout>out</stdout> AND <stderr>err</stderr>',
      'u1',
      's1',
      'stdout',
      'stderr',
    )
    expect((result.content[0] as { text: string }).text).toBe('out AND err')
  })

  test('content vacío (tras limpiar) → centinela "(no content)"', () => {
    // Fija la constante canónica NO_CONTENT_MESSAGE.
    const result = localCommandOutputToSDKAssistantMessage(
      '',
      'u1',
      's1',
      'stdout',
      'stderr',
    )
    expect((result.content[0] as { text: string }).text).toBe('(no content)')
  })

  test('sólo espacios en blanco tras limpiar → "(no content)"', () => {
    const result = localCommandOutputToSDKAssistantMessage(
      '   \n  \t  ',
      'u1',
      's1',
      'stdout',
      'stderr',
    )
    expect((result.content[0] as { text: string }).text).toBe('(no content)')
  })

  test('la forma del resultado cumple el contrato SDKAssistantMessage', () => {
    const result = localCommandOutputToSDKAssistantMessage(
      'plain text',
      'uuid-1',
      'session-1',
      'stdout',
      'stderr',
    )
    expect(result.type).toBe('assistant')
    expect(result.uuid).toBe('uuid-1')
    expect(result.session_id).toBe('session-1')
    expect(result.parent_tool_use_id).toBeNull()
    expect(result.message.id).toBe('synthetic-uuid-1')
    expect(result.message.role).toBe('assistant')
    expect(result.message.stop_reason).toBe('end_turn')
    expect(result.message.usage.input_tokens).toBe(0)
    expect(result.message.usage.output_tokens).toBe(0)
  })

  test('el arreglo de content coincide entre el nivel superior y message.content', () => {
    // Documentado: la misma referencia de arreglo de content en ambos
    // lugares (la función fija `content` y `message.content` al mismo valor).
    const result = localCommandOutputToSDKAssistantMessage(
      'plain',
      'u',
      's',
      'stdout',
      'stderr',
    )
    expect(result.content).toBe(result.message.content)
  })

  test('se conserva el content multilínea', () => {
    const result = localCommandOutputToSDKAssistantMessage(
      'line1\nline2\nline3',
      'u',
      's',
      'stdout',
      'stderr',
    )
    expect((result.content[0] as { text: string }).text).toBe(
      'line1\nline2\nline3',
    )
  })

  test('el content multilínea DENTRO del envoltorio también se limpia', () => {
    const result = localCommandOutputToSDKAssistantMessage(
      '<stdout>line1\nline2</stdout>',
      'u',
      's',
      'stdout',
      'stderr',
    )
    expect((result.content[0] as { text: string }).text).toBe(
      'line1\nline2',
    )
  })

  test('nombres de tag personalizados funcionan', () => {
    // La función recibe los nombres de tag de stdout/stderr como
    // parámetros, admitiendo markup no-default.
    const result = localCommandOutputToSDKAssistantMessage(
      '<my-out>hello</my-out>',
      'u',
      's',
      'my-out',
      'my-err',
    )
    expect((result.content[0] as { text: string }).text).toBe('hello')
  })
})
