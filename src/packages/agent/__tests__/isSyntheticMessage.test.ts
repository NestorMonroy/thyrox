/**
 * Porte de `ccnmt: packages/agent/__tests__/isSyntheticMessage.test.ts`.
 *
 * `isSyntheticMessage` detecta si un mensaje es uno de los
 * `SYNTHETIC_MESSAGES` canonicos (interrumpido-por-el-usuario, sin
 * respuesta solicitada, etc.) para que los llamadores puedan suprimirlos
 * del export del transcript o de los conteos de atribucion.
 *
 * Una deteccion equivocada es, en cualquier direccion, perdida de datos:
 *   - un mensaje REAL de usuario clasificado como sintetico: se descarta
 *     en silencio del transcript / la atribucion
 *   - un mensaje sintetico clasificado como real: infla el conteo de
 *     prompts de usuario y se filtra al export de transcript que el
 *     usuario comparte
 */
import { describe, expect, test } from 'bun:test'
import { isSyntheticMessage, SYNTHETIC_MESSAGES } from '../messages.ts'
import type { Message } from '../messageShapes.ts'

const userText = (text: string): Message =>
  ({
    type: 'user',
    uuid: 'uuid',
    message: {
      role: 'user',
      content: [{ type: 'text', text }],
    },
  }) as Message

describe('isSyntheticMessage — marcadores sinteticos conocidos', () => {
  test('"[Request interrupted by user]" → true', () => {
    expect(
      isSyntheticMessage(userText('[Request interrupted by user]')),
    ).toBe(true)
  })

  test('"[Request interrupted by user for tool use]" → true', () => {
    expect(
      isSyntheticMessage(
        userText('[Request interrupted by user for tool use]'),
      ),
    ).toBe(true)
  })

  test('"No response requested." → true', () => {
    expect(isSyntheticMessage(userText('No response requested.'))).toBe(
      true,
    )
  })

  test('todo miembro del conjunto SYNTHETIC_MESSAGES devuelve true', () => {
    for (const m of SYNTHETIC_MESSAGES) {
      expect(isSyntheticMessage(userText(m))).toBe(true)
    }
  })
})

describe('isSyntheticMessage — contenido no-sintetico', () => {
  test('mensaje de usuario normal → false', () => {
    expect(isSyntheticMessage(userText('hello world'))).toBe(false)
  })

  test('texto parecido pero distinto → false (exige coincidencia exacta)', () => {
    expect(isSyntheticMessage(userText('Request interrupted by user'))).toBe(
      false,
    )
    expect(isSyntheticMessage(userText('[Request interrupted]'))).toBe(false)
    expect(isSyntheticMessage(userText('no response requested.'))).toBe(
      false,
    ) // caja
  })

  test('cadena vacia → false', () => {
    expect(isSyntheticMessage(userText(''))).toBe(false)
  })

  test('sintetico con espacios de relleno → false (sin trim)', () => {
    expect(
      isSyntheticMessage(userText(' [Request interrupted by user] ')),
    ).toBe(false)
  })
})

describe('isSyntheticMessage — tipos de mensaje no elegibles', () => {
  test('mensaje progress → false (retorna temprano)', () => {
    expect(
      isSyntheticMessage({
        type: 'progress',
        toolUseID: 'x',
        parentToolUseID: 'p',
        data: {},
        uuid: 'u',
        timestamp: 't',
      } as never),
    ).toBe(false)
  })

  test('mensaje attachment → false', () => {
    expect(
      isSyntheticMessage({
        type: 'attachment',
        attachment: { type: 'whatever' },
      } as never),
    ).toBe(false)
  })

  test('mensaje system → false', () => {
    expect(
      isSyntheticMessage({
        type: 'system',
        content: '[Request interrupted by user]',
      } as never),
    ).toBe(false)
  })

  test('mensaje de asistente con contenido de texto sintetico → revisa text[0]', () => {
    // Documentado: los mensajes de asistente TAMBIEN pueden marcarse como
    // sinteticos. Fija que la funcion inspecciona content[0] sin importar
    // el rol.
    const r = isSyntheticMessage({
      type: 'assistant',
      uuid: 'uuid',
      message: {
        role: 'assistant',
        content: [{ type: 'text', text: 'No response requested.' }],
      },
    } as never)
    expect(r).toBe(true)
  })
})

describe('isSyntheticMessage — casos limite de la forma del contenido', () => {
  test('mensaje de usuario con contenido de cadena (no arreglo) → false', () => {
    // Contrato documentado: la funcion exige Array.isArray sobre el
    // contenido.
    expect(
      isSyntheticMessage({
        type: 'user',
        uuid: 'uuid',
        message: {
          role: 'user',
          content: '[Request interrupted by user]',
        },
      } as never),
    ).toBe(false)
  })

  test('arreglo de contenido vacio → false', () => {
    expect(
      isSyntheticMessage({
        type: 'user',
        uuid: 'uuid',
        message: {
          role: 'user',
          content: [],
        },
      } as never),
    ).toBe(false)
  })

  test('el primer bloque no es texto (imagen, tool_use) → false', () => {
    expect(
      isSyntheticMessage({
        type: 'user',
        uuid: 'uuid',
        message: {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/png', data: '' },
            },
          ],
        },
      } as never),
    ).toBe(false)
  })

  test('mensaje multi-bloque: solo se revisa el primer bloque de texto', () => {
    // Documentado: la funcion SOLO revisa content[0]. Los bloques
    // siguientes se ignoran aunque contengan marcadores sinteticos.
    const r = isSyntheticMessage({
      type: 'user',
      uuid: 'uuid',
      message: {
        role: 'user',
        content: [
          { type: 'text', text: 'first block (not synthetic)' },
          { type: 'text', text: '[Request interrupted by user]' },
        ],
      },
    } as never)
    expect(r).toBe(false)
  })
})
