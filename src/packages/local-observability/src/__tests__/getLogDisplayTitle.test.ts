/**
 * Puerto de `ccnmt: packages/local-observability/src/__tests__/getLogDisplayTitle.test.ts`
 * (237 líneas fuente, 100 % portado).
 *
 * `getLogDisplayTitle` es el helper puro que elige el título a mostrar de
 * una sesión en el selector de /resume. La cadena de fallback tiene 8
 * niveles: agentName → customTitle → summary → firstPrompt (si no vacío
 * tras despojar tags XML Y no es un prompt autónomo <tick>) → defaultTitle
 * → "Autonomous session" (cuando firstPrompt era un <tick>) →
 * sessionId.slice(0, 8) → ''.
 *
 * Una prioridad equivocada muestra la sesión incorrecta al usuario cuando
 * varias comparten prefijo. El salto del prompt autónomo es crítico: el
 * auto-prompt es `<tick>haz esto</tick>` — sin el salto, el selector
 * mostraría el XML crudo, que no tiene sentido para el usuario.
 */
import { describe, expect, test } from 'bun:test'
import { getLogDisplayTitle } from '../log.ts'

type LogOption = Parameters<typeof getLogDisplayTitle>[0]

const baseLog = (overrides: Partial<LogOption> = {}): LogOption =>
  ({
    sessionId: '550e8400-e29b-41d4-a716-446655440000',
    firstPrompt: '',
    ...overrides,
  }) as LogOption

describe('getLogDisplayTitle — prioridad de fallback', () => {
  test('agentName tiene la prioridad más alta', () => {
    expect(
      getLogDisplayTitle(
        baseLog({
          agentName: 'researcher',
          customTitle: 'custom',
          summary: 'sum',
          firstPrompt: 'first',
        }),
        'def',
      ),
    ).toBe('researcher')
  })

  test('customTitle se prefiere sobre summary + firstPrompt', () => {
    expect(
      getLogDisplayTitle(
        baseLog({
          customTitle: 'my custom',
          summary: 'sum',
          firstPrompt: 'first',
        }),
      ),
    ).toBe('my custom')
  })

  test('summary se usa sin agentName/customTitle', () => {
    expect(
      getLogDisplayTitle(
        baseLog({ summary: 'a session summary', firstPrompt: 'first' }),
      ),
    ).toBe('a session summary')
  })

  test('firstPrompt se usa sin agentName/customTitle/summary', () => {
    expect(
      getLogDisplayTitle(baseLog({ firstPrompt: 'help me debug' })),
    ).toBe('help me debug')
  })

  test('defaultTitle se usa cuando no hay nada más disponible', () => {
    expect(
      getLogDisplayTitle(baseLog({ firstPrompt: '' }), 'fallback default'),
    ).toBe('fallback default')
  })

  test('el prefijo de 8 chars del sessionId se usa al final', () => {
    expect(
      getLogDisplayTitle(
        baseLog({
          sessionId: '550e8400-e29b-41d4-a716-446655440000',
          firstPrompt: '',
        }),
      ),
    ).toBe('550e8400')
  })

  test('cadena vacía cuando no hay ningún campo disponible', () => {
    expect(
      getLogDisplayTitle(baseLog({ sessionId: '', firstPrompt: '' })),
    ).toBe('')
  })
})

describe('getLogDisplayTitle — manejo del prompt autónomo', () => {
  test('prompt <tick> se salta → se usa "Autonomous session"', () => {
    // Contrato documentado: cuando firstPrompt empieza con <tick>, el
    // selector NO debe mostrar el XML crudo — cae a la etiqueta sintética
    // "Autonomous session".
    expect(
      getLogDisplayTitle(
        baseLog({ firstPrompt: '<tick>do this thing</tick>' }),
      ),
    ).toBe('Autonomous session')
  })

  test('<tick> sin ningún otro campo → "Autonomous session"', () => {
    expect(
      getLogDisplayTitle(baseLog({ firstPrompt: '<tick>auto</tick>' })),
    ).toBe('Autonomous session')
  })

  test('<tick> + customTitle → gana customTitle (no es autónoma)', () => {
    expect(
      getLogDisplayTitle(
        baseLog({
          firstPrompt: '<tick>auto</tick>',
          customTitle: 'My Title',
        }),
      ),
    ).toBe('My Title')
  })

  test('<tick> + defaultTitle → gana defaultTitle sobre la etiqueta autónoma', () => {
    // defaultTitle va ANTES que la etiqueta autónoma en la cadena.
    expect(
      getLogDisplayTitle(
        baseLog({ firstPrompt: '<tick>auto</tick>' }),
        'def',
      ),
    ).toBe('def')
  })
})

describe('getLogDisplayTitle — despojo de tags XML en firstPrompt', () => {
  test('firstPrompt con tag ide_opened_file embebido → tag despojado', () => {
    expect(
      getLogDisplayTitle(
        baseLog({
          firstPrompt:
            '<ide_opened_file>foo.ts</ide_opened_file>real prompt text',
        }),
      ),
    ).toBe('real prompt text')
  })

  test('firstPrompt que ES sólo un tag XML → vacío tras despojar → siguiente fallback', () => {
    // Tras despojar, firstPrompt queda vacío. Debe caer al siguiente nivel.
    expect(
      getLogDisplayTitle(
        baseLog({
          firstPrompt: '<ide_opened_file>foo.ts</ide_opened_file>',
          sessionId: 'abcd1234-deadbeef',
        }),
      ),
    ).toBe('abcd1234')
  })

  test('firstPrompt con tags mezclados + texto → queda la porción de texto', () => {
    expect(
      getLogDisplayTitle(
        baseLog({
          firstPrompt:
            '<hook>system note</hook>actual user query<ide_selection>x</ide_selection>',
        }),
      ),
    ).toBe('actual user query')
  })

  test('prosa del usuario con contenido tipo-XML en mayúscula (p. ej. <Button>) se preserva', () => {
    // El despojo sólo matchea nombres de tag en minúscula — prosa del
    // usuario con <Button> o <!DOCTYPE> no se despoja.
    expect(
      getLogDisplayTitle(
        baseLog({ firstPrompt: 'fix the <Button> layout' }),
      ),
    ).toBe('fix the <Button> layout')
  })
})

describe('getLogDisplayTitle — recorte del título', () => {
  test('los espacios en blanco se recortan del resultado final', () => {
    expect(
      getLogDisplayTitle(baseLog({ summary: '   summary   ' })),
    ).toBe('summary')
  })

  test('agentName también se recorta', () => {
    expect(
      getLogDisplayTitle(baseLog({ agentName: '  bot  ' })),
    ).toBe('bot')
  })
})

describe('getLogDisplayTitle — rarezas de prioridad con cadena vacía', () => {
  test('agentName vacío cae a customTitle', () => {
    expect(
      getLogDisplayTitle(
        baseLog({ agentName: '', customTitle: 'custom' }),
      ),
    ).toBe('custom')
  })

  test('customTitle vacío cae a summary', () => {
    expect(
      getLogDisplayTitle(
        baseLog({ customTitle: '', summary: 'sum' }),
      ),
    ).toBe('sum')
  })

  test('summary vacío cae a firstPrompt', () => {
    expect(
      getLogDisplayTitle(
        baseLog({ summary: '', firstPrompt: 'first' }),
      ),
    ).toBe('first')
  })
})

describe('getLogDisplayTitle — casos límite de sessionId', () => {
  test('sessionId corto (< 8 chars) se usa tal cual', () => {
    expect(
      getLogDisplayTitle(baseLog({ sessionId: 'abc', firstPrompt: '' })),
    ).toBe('abc')
  })

  test('sessionId de exactamente 8 chars', () => {
    expect(
      getLogDisplayTitle(
        baseLog({ sessionId: 'abcdefgh', firstPrompt: '' }),
      ),
    ).toBe('abcdefgh')
  })
})
