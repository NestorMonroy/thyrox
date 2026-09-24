/**
 * `generateSessionTitle` (≙ `XJ` de 2.1.275) con una consulta inyectada:
 * mide la entrada que se envía y el tratamiento de la respuesta, sin red.
 */
import { describe, expect, test } from 'bun:test'
import { generateSessionTitle, parseSessionTitle, SESSION_TITLE_PROMPT } from '../sessionTitle.ts'

const signal = new AbortController().signal

describe('generateSessionTitle (XJ)', () => {
  test('una descripción de menos de 10 caracteres no consulta', async () => {
    let calls = 0
    const title = await generateSessionTitle('  fix it  ', signal, async () => {
      calls++
      return '{"title":"x"}'
    })
    expect([title, calls]).toEqual([null, 0])
  })
  test('envía el prompt y la sesión envuelta, y devuelve el título recortado', async () => {
    let sent: { systemPrompt: string; userPrompt: string } | undefined
    const title = await generateSessionTitle('  refactor the socket pool refresh  ', signal, async args => {
      sent = args
      return '{"title":"  Socket pool refresh  "}'
    })
    expect(title).toBe('Socket pool refresh')
    expect(sent!.systemPrompt).toBe(SESSION_TITLE_PROMPT)
    expect(sent!.userPrompt.startsWith('<session>\nrefactor the socket pool refresh\n</session>\n\n')).toBe(true)
  })
  test('una consulta que lanza da null y no propaga', async () => {
    expect(await generateSessionTitle('a long enough description', signal, async () => {
      throw new Error('network')
    })).toBeNull()
  })
})

describe('parseSessionTitle', () => {
  test('JSON inválido, sin título o vacío dan null', () => {
    expect(parseSessionTitle('not json')).toBeNull()
    expect(parseSessionTitle('{"name":"x"}')).toBeNull()
    expect(parseSessionTitle('{"title":"   "}')).toBeNull()
  })
})
