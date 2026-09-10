/**
 * Porte de `ccnmt: packages/agent/__tests__/contentTextHelpers.test.ts`.
 *
 * Fija el contrato de los ayudantes que extraen texto plano de un mensaje:
 * `extractTextContent` (el unico que ensambla texto desde bloques),
 * `getContentText` (enruta cadena vs arreglo, con el `trim()` que SOLO
 * aplica a la rama de arreglo — un refactor que unifique con
 * `result.trim()` recortaria en silencio las cadenas), `getUserMessageText`
 * (filtro por tipo `user`) y `textForResubmit`, cuya precedencia
 * bash-input > command-name > texto llano decide que ve el modelo al
 * reenviar un prompt con la flecha hacia arriba.
 */
import { describe, expect, test } from 'bun:test'
import {
  extractTextContent,
  getContentText,
  getUserMessageText,
  textForResubmit,
} from '../messages.ts'
import type { Message, UserMessage } from '../messageShapes.ts'

describe('extractTextContent — ensamblador de bloques de texto', () => {
  test('arreglo vacio → cadena vacia', () => {
    expect(extractTextContent([])).toBe('')
  })

  test('extrae un unico bloque de texto', () => {
    expect(extractTextContent([{ type: 'text', text: 'hello' }])).toBe(
      'hello',
    )
  })

  test('varios bloques de texto unidos con separador vacio (por defecto)', () => {
    expect(
      extractTextContent([
        { type: 'text', text: 'a' },
        { type: 'text', text: 'b' },
      ]),
    ).toBe('ab')
  })

  test('un separador propio une los bloques', () => {
    expect(
      extractTextContent(
        [
          { type: 'text', text: 'a' },
          { type: 'text', text: 'b' },
        ],
        '\n',
      ),
    ).toBe('a\nb')
  })

  test('los bloques que no son texto se filtran', () => {
    expect(
      extractTextContent([
        { type: 'text', text: 'keep' },
        { type: 'image', source: { type: 'base64', data: 'x' } },
        { type: 'tool_use', id: 't', name: 'X', input: {} },
        { type: 'text', text: 'also-keep' },
      ]),
    ).toBe('keepalso-keep')
  })

  test('bloque de texto sin el campo `text` — se une como vacio (Array.join coacciona undefined)', () => {
    // El filtro solo revisa type === 'text'. El map luego accede a .text,
    // que es undefined. Array.prototype.join coacciona undefined a ''
    // (NO a la cadena 'undefined'). Documenta el comportamiento seguro
    // por accidente: un bloque de texto malformado desaparece en
    // silencio de la salida.
    const r = extractTextContent([
      { type: 'text' } as { type: 'text'; text: string },
    ])
    expect(r).toBe('')
  })

  test('mezcla de bloques de texto validos e invalidos — solo caen los undefined', () => {
    expect(
      extractTextContent([
        { type: 'text', text: 'a' },
        { type: 'text' } as { type: 'text'; text: string }, // campo ausente
        { type: 'text', text: 'b' },
      ]),
    ).toBe('ab')
  })

  test('acepta arreglos de solo lectura (tipado estructural)', () => {
    const blocks: ReadonlyArray<{ readonly type: string; readonly text?: string }> =
      Object.freeze([{ type: 'text', text: 'frozen' }])
    expect(extractTextContent(blocks as never)).toBe('frozen')
  })
})

describe('getContentText — enrutado cadena vs arreglo', () => {
  test('contenido de cadena → se devuelve verbatim (sin trim)', () => {
    expect(getContentText('hello world')).toBe('hello world')
  })

  test('cadena con espacios al inicio/final preservados', () => {
    // CRITICO: solo la rama de arreglo hace trim. La rama de cadena pasa
    // sin cambios. Un refactor que unifique via `result.trim()` recortaria
    // en silencio los espacios de las rutas de contenido en cadena.
    expect(getContentText('  spaced  ')).toBe('  spaced  ')
  })

  test('cadena vacia → cadena vacia (NO null)', () => {
    expect(getContentText('')).toBe('')
  })

  test('contenido en arreglo se une con \\n y luego se recorta', () => {
    expect(
      getContentText([
        { type: 'text', text: 'a' },
        { type: 'text', text: 'b' },
      ] as never),
    ).toBe('a\nb')
  })

  test('arreglo cuyo resultado tras el trim queda vacio devuelve null', () => {
    // La funcion devuelve `result || null` — vacio tras el trim → null.
    expect(getContentText([] as never)).toBeNull()
  })

  test('arreglo con texto solo de espacios → null tras el trim', () => {
    expect(
      getContentText([{ type: 'text', text: '   ' }] as never),
    ).toBeNull()
  })

  test('ni cadena ni arreglo → null', () => {
    expect(getContentText(null as never)).toBeNull()
    expect(getContentText(undefined as never)).toBeNull()
    expect(getContentText({} as never)).toBeNull()
  })
})

describe('getUserMessageText — filtro solo-usuario', () => {
  function userMsg(content: string | Array<{ type: string; text?: string }>): Message {
    return { type: 'user', message: { content } } as Message
  }

  test('mensaje de usuario con contenido de cadena → se devuelve', () => {
    expect(getUserMessageText(userMsg('hi'))).toBe('hi')
  })

  test('mensaje de usuario con contenido en arreglo → unido y recortado', () => {
    expect(
      getUserMessageText(userMsg([{ type: 'text', text: 'hi' }])),
    ).toBe('hi')
  })

  test('tipos que no son de usuario → null', () => {
    expect(
      getUserMessageText({
        type: 'assistant',
        message: { content: 'reply' },
      } as Message),
    ).toBeNull()
    expect(
      getUserMessageText({
        type: 'system',
        message: { content: 'sys' },
      } as Message),
    ).toBeNull()
  })

  test('mensaje de usuario con arreglo vacio → null', () => {
    expect(getUserMessageText(userMsg([]))).toBeNull()
  })
})

describe('textForResubmit — precedencia de entrada bash', () => {
  function userMsg(content: string): UserMessage {
    return { type: 'user', message: { content } } as UserMessage
  }

  test('prompt llano — modo=prompt, texto sin cambios', () => {
    expect(textForResubmit(userMsg('what is 2+2'))).toEqual({
      text: 'what is 2+2',
      mode: 'prompt',
    })
  })

  test('bash-input gana sobre command-name (precedencia)', () => {
    // La funcion revisa bash-input PRIMERO. Aunque ambas etiquetas esten
    // presentes, bash-input domina.
    expect(
      textForResubmit(
        userMsg(
          '<bash-input>ls -la</bash-input><command-name>compact</command-name>',
        ),
      ),
    ).toEqual({ text: 'ls -la', mode: 'bash' })
  })

  test('command-name sin argumentos → "name " (espacio final)', () => {
    // El formato es `${cmd} ${args}` con args por defecto en cadena
    // vacia. Resultado: "compact " con espacio final. Lo documenta.
    expect(
      textForResubmit(userMsg('<command-name>compact</command-name>')),
    ).toEqual({ text: 'compact ', mode: 'prompt' })
  })

  test('command-name con command-args', () => {
    expect(
      textForResubmit(
        userMsg(
          '<command-name>review</command-name><command-args>PR-123</command-args>',
        ),
      ),
    ).toEqual({ text: 'review PR-123', mode: 'prompt' })
  })

  test('mensaje que no es de usuario → null', () => {
    expect(
      textForResubmit({
        type: 'assistant',
        message: { content: 'no' },
      } as unknown as UserMessage),
    ).toBeNull()
  })

  test('mensaje de usuario sin contenido de texto → null', () => {
    expect(
      textForResubmit({
        type: 'user',
        message: { content: [] },
      } as unknown as UserMessage),
    ).toBeNull()
  })

  test('prompt llano sin etiquetas pasa por stripIdeContextTags', () => {
    // La rama de respaldo: el texto pasa por stripIdeContextTags. Para
    // entrada que no es de IDE deberia pasar sin cambios.
    expect(textForResubmit(userMsg('please help'))).toEqual({
      text: 'please help',
      mode: 'prompt',
    })
  })

  test('etiqueta bash-input vacia → texto bash vacio', () => {
    // <bash-input></bash-input> — extractTag devuelve null ante contenido
    // vacio (por el guard `if (depth === 0 && content)` de extractTag).
    // Asi que la rama bash-input cae a command-name → null → la rama
    // stripIdeContextTags.
    expect(
      textForResubmit(userMsg('<bash-input></bash-input>')),
    ).toEqual({ text: '<bash-input></bash-input>', mode: 'prompt' })
  })
})
