/**
 * La compresión previa aplicada a un cuerpo de Messages de Anthropic: el umbral
 * es una fracción de la ventana menos lo que ocupan las herramientas, y el
 * aviso de historia recortada vuelve al `system` de primer nivel, porque la
 * API de Messages no admite un mensaje de sistema dentro de `messages`.
 */
import { expect, test } from 'bun:test'
// Ruta sustituible para los controles de anulación en paralelo (`src/verify/annul_parallel.sh`).
const { compactMessagesBody, PROACTIVE_COMPRESSION_RATIO } = (await import(
  process.env.COMPACT_REQUEST_MODULE ?? '../src/proxy/context/compactRequest.ts'
)) as typeof import('../src/proxy/context/compactRequest.ts')

const NOTICE = '[Context compressed: earlier messages removed to fit context window]'
const turns = (n: number) => Array.from({ length: n }, (_, i) => [
  { role: 'user', content: `pregunta ${i}: ${'x'.repeat(400)}` },
  { role: 'assistant', content: `respuesta ${i}: ${'y'.repeat(400)}` },
]).flat()
const window = (tokens: number) => () => tokens

test('una petición bajo el umbral sale intacta', () => {
  const body = { model: 'm', system: 'eres útil', messages: turns(2) }
  const result = compactMessagesBody(body, { provider: 'anthropic', model: 'm', contextWindowOf: window(100_000) })
  expect(result.compressed).toBe(false)
  expect(result.body).toBe(body)
})

test('el umbral es la fracción proactiva de la ventana', () => {
  expect(PROACTIVE_COMPRESSION_RATIO).toBe(0.7)
  const body = { model: 'm', messages: [{ role: 'user', content: 'x'.repeat(3200) }] }
  expect(compactMessagesBody(body, { provider: 'anthropic', model: 'm', contextWindowOf: window(1200) }).compressed).toBe(false)
  expect(compactMessagesBody(body, { provider: 'anthropic', model: 'm', contextWindowOf: window(1100) }).compressed).toBe(true)
})

test('lo que ocupan las herramientas se resta de la ventana', () => {
  const body = { model: 'm', messages: [{ role: 'user', content: 'x'.repeat(3200) }], tools: [{ name: 't', description: 'd'.repeat(2000) }] }
  expect(compactMessagesBody(body, { provider: 'anthropic', model: 'm', contextWindowOf: window(1200) }).compressed).toBe(true)
})

test('al recortar historia, el aviso va al system de texto y messages no lleva mensajes de sistema', () => {
  const body = { model: 'm', system: 'eres útil', messages: turns(60) }
  const result = compactMessagesBody(body, { provider: 'anthropic', model: 'm', contextWindowOf: window(4000) })
  expect(result.compressed).toBe(true)
  expect(result.body.system).toBe(`${NOTICE}\neres útil`)
  expect((result.body.messages as { role: string }[]).every(m => m.role !== 'system')).toBe(true)
  expect((result.body.messages as unknown[]).length).toBeLessThan(120)
})

test('un system de bloques recibe el aviso como primer bloque', () => {
  const body = { model: 'm', system: [{ type: 'text', text: 'eres útil' }], messages: turns(60) }
  const result = compactMessagesBody(body, { provider: 'anthropic', model: 'm', contextWindowOf: window(4000) })
  expect(result.body.system).toEqual([{ type: 'text', text: NOTICE }, { type: 'text', text: 'eres útil' }])
})

test('sin system, el aviso pasa a ser el system', () => {
  const body: Record<string, unknown> = { model: 'm', messages: turns(60) }
  const result = compactMessagesBody(body, { provider: 'anthropic', model: 'm', contextWindowOf: window(4000) })
  expect(result.body.system).toBe(NOTICE)
  expect((result.body.messages as { role: string }[])[0]!.role).not.toBe('system')
})

test('una compresión sin recorte de historia no inventa un system', () => {
  const body = { model: 'm', messages: [{ role: 'user', content: 'hola' }, { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't', content: 'z'.repeat(20_000) }] }] }
  const result = compactMessagesBody(body, { provider: 'anthropic', model: 'm', contextWindowOf: window(4000) })
  expect(result.compressed).toBe(true)
  expect('system' in result.body).toBe(false)
})
