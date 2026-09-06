/**
 * Porte de `ccnmt: packages/agent/__tests__/extractConversationText.test.ts`
 * (24 casos, 26 `expect`; verbatim en datos y expectativas).
 *
 * Fija el contrato de `extractConversationText` (`../sessionTitle.js`): el
 * aplanado de un historial de mensajes a un único texto para el título de
 * sesión — qué tipos de mensaje cuentan, qué forma de `content` se extrae,
 * los filtros `isMeta`/`origin.kind`, y el recorte de cola a 1000 caracteres
 * (el defecto que fija: un cambio futuro a `.slice(0, 1000)` degradaría la
 * calidad del título en silencio, porque el contexto reciente es el que
 * importa).
 */
import { describe, expect, test } from 'bun:test'
import { extractConversationText } from '../sessionTitle.js'
import type { Message } from '../messageShapes.js'

function userMsg(content: string | Array<{ type: string; text?: string }>): Message {
  return {
    type: 'user',
    message: { content },
  } as Message
}

function assistantMsg(
  content: string | Array<{ type: string; text?: string }>,
): Message {
  return {
    type: 'assistant',
    message: { content },
  } as Message
}

describe('extractConversationText — filtro por tipo de mensaje', () => {
  test('usuario + asistente: texto concatenado con salto de línea', () => {
    expect(
      extractConversationText([
        userMsg('hello'),
        assistantMsg('world'),
      ]),
    ).toBe('hello\nworld')
  })

  test('mensajes de sistema se omiten', () => {
    expect(
      extractConversationText([
        { type: 'system', message: { content: 'system info' } } as Message,
        userMsg('real'),
      ]),
    ).toBe('real')
  })

  test('mensajes de progreso se omiten', () => {
    expect(
      extractConversationText([
        { type: 'progress', message: { content: 'progress' } } as Message,
        userMsg('real'),
      ]),
    ).toBe('real')
  })

  test('mensajes de adjunto se omiten', () => {
    expect(
      extractConversationText([
        { type: 'attachment' } as Message,
        userMsg('real'),
      ]),
    ).toBe('real')
  })
})

describe('extractConversationText — tipo de content', () => {
  test('content de tipo string se propaga verbatim', () => {
    expect(extractConversationText([userMsg('hello world')])).toBe(
      'hello world',
    )
  })

  test('content de tipo array — solo se extraen los bloques text', () => {
    expect(
      extractConversationText([
        userMsg([
          { type: 'text', text: 'block1' },
          { type: 'image', text: 'should-not-appear' },
          { type: 'text', text: 'block2' },
        ]),
      ]),
    ).toBe('block1\nblock2')
  })

  test('bloque text sin el campo `text` se omite', () => {
    // La condición es: 'type' === 'text' Y 'text' in block. Un bloque text
    // malformado sin ese campo se omite.
    expect(
      extractConversationText([
        userMsg([{ type: 'text' } as { type: string }]),
      ]),
    ).toBe('')
  })

  test('content que no es string ni array (forma inesperada) se omite', () => {
    expect(
      extractConversationText([
        {
          type: 'user',
          message: { content: 42 as unknown as string },
        } as Message,
      ]),
    ).toBe('')
  })

  test('array de content vacío → resultado vacío para ese mensaje', () => {
    expect(extractConversationText([userMsg([])])).toBe('')
  })

  test('content de string vacío se propaga', () => {
    // La función empuja strings vacíos sin condición para content de tipo
    // string. Unidos con \n, dos mensajes de usuario vacíos producen solo '\n'.
    expect(extractConversationText([userMsg(''), userMsg('')])).toBe('\n')
  })
})

describe('extractConversationText — filtro isMeta', () => {
  test('mensajes con isMeta:true se omiten', () => {
    const meta = {
      type: 'user',
      isMeta: true,
      message: { content: 'meta content' },
    } as Message
    expect(extractConversationText([meta, userMsg('real')])).toBe('real')
  })

  test('mensajes con isMeta:false NO se omiten', () => {
    // La condición es `'isMeta' in msg && msg.isMeta` — un isMeta falsy pasa.
    const notMeta = {
      type: 'user',
      isMeta: false,
      message: { content: 'real' },
    } as Message
    expect(extractConversationText([notMeta])).toBe('real')
  })

  test('campo isMeta ausente NO se trata como meta', () => {
    expect(extractConversationText([userMsg('real')])).toBe('real')
  })
})

describe('extractConversationText — filtro origin', () => {
  test('origin.kind === "human" se permite', () => {
    const human = {
      type: 'user',
      origin: { kind: 'human' },
      message: { content: 'real' },
    } as Message
    expect(extractConversationText([human])).toBe('real')
  })

  test('origin.kind !== "human" se filtra (p. ej. agent, channel)', () => {
    // Los mensajes originados en canal/agente no forman parte del hilo de
    // conversación humano a efectos de generación de título.
    const agent = {
      type: 'user',
      origin: { kind: 'agent' },
      message: { content: 'agent output' },
    } as Message
    const channel = {
      type: 'user',
      origin: { kind: 'channel' },
      message: { content: 'channel notification' },
    } as Message
    expect(
      extractConversationText([agent, channel, userMsg('real')]),
    ).toBe('real')
  })

  test('campo origin ausente se permite (se trata como human)', () => {
    expect(extractConversationText([userMsg('real')])).toBe('real')
  })
})

describe('extractConversationText — recorte de cola (1000 caracteres)', () => {
  test('texto de menos de 1000 caracteres pasa sin cambios', () => {
    const text = 'a'.repeat(500)
    expect(extractConversationText([userMsg(text)])).toBe(text)
  })

  test('texto de exactamente 1000 caracteres pasa (límite inclusivo)', () => {
    const text = 'a'.repeat(1000)
    expect(extractConversationText([userMsg(text)])).toBe(text)
  })

  test('texto de más de 1000 caracteres se recorta por LA COLA (últimos 1000)', () => {
    // CRÍTICO: el recorte por cola significa que gana el FINAL de la
    // conversación, no el inicio. Es así por diseño — el contexto reciente
    // es más relevante para generar el título. Un cambio futuro a
    // .slice(0, 1000) desplazaría en silencio a un prefijo inicial y
    // degradaría la calidad del título.
    const head = 'X'.repeat(500)
    const tail = 'a'.repeat(1000)
    const result = extractConversationText([userMsg(head + tail)])
    expect(result).toBe(tail)
    expect(result.startsWith('X')).toBe(false)
  })

  test('el recorte aplica sobre el texto YA UNIDO, no por mensaje', () => {
    // El recorte corre sobre el parts.join('\n') ya unido, así que aunque
    // cada mensaje individual sea < 1000, el total puede excederlo.
    const m1 = 'x'.repeat(800)
    const m2 = 'y'.repeat(800) // total: 800 + 1 + 800 = 1601 caracteres
    const result = extractConversationText([userMsg(m1), userMsg(m2)])
    expect(result.length).toBe(1000)
    expect(result.endsWith('y')).toBe(true)
  })
})

describe('extractConversationText — casos vacíos / de borde', () => {
  test('array de mensajes vacío → string vacío', () => {
    expect(extractConversationText([])).toBe('')
  })

  test('todos los mensajes meta → string vacío', () => {
    const meta = (text: string) =>
      ({
        type: 'user',
        isMeta: true,
        message: { content: text },
      }) as Message
    expect(extractConversationText([meta('a'), meta('b')])).toBe('')
  })

  test('solo tipos que no son de conversación → string vacío', () => {
    expect(
      extractConversationText([
        { type: 'system', message: { content: 'x' } } as Message,
        { type: 'progress', message: { content: 'y' } } as Message,
      ]),
    ).toBe('')
  })

  test('mezcla user+assistant+meta — solo se une lo humano no-meta de user/assistant', () => {
    const meta = {
      type: 'user',
      isMeta: true,
      message: { content: 'meta' },
    } as Message
    const result = extractConversationText([
      userMsg('first'),
      meta,
      assistantMsg('second'),
      userMsg('third'),
    ])
    expect(result).toBe('first\nsecond\nthird')
  })
})
