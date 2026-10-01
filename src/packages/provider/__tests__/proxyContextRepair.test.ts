/**
 * Casos propios del gestor de contexto: las ramas que ningún caso de OmniRoute
 * alcanza — un par de herramienta partido por el recorte, las llamadas del
 * último mensaje, el razonamiento del último asistente, el corte de la poda
 * de imágenes al caber y el texto exacto del aviso.
 */
import { expect, test } from 'bun:test'
// Ruta sustituible para los controles de anulación en paralelo (`src/verify/annul_parallel.sh`).
const CM = (await import(process.env.CONTEXT_MANAGER_MODULE ?? '../src/proxy/context/contextManager.ts')) as typeof import('../src/proxy/context/contextManager.ts')
const { compressContext, estimateTokens, fixToolPairs, pruneOlderInlineImages } = CM

type Msg = Record<string, unknown>
const call = (id: string, content: unknown = null): Msg => ({ role: 'assistant', content, tool_calls: [{ id, type: 'function', function: { name: 'f' } }] })

test('fixToolPairs retira un resultado de herramienta cuya llamada no está', () => {
  const out = fixToolPairs([{ role: 'user', content: 'q' }, { role: 'tool', tool_call_id: 'x', content: 'r' }, { role: 'user', content: 'y' }])
  expect(out.map(m => m.role)).toEqual(['user', 'user'])
})

test('fixToolPairs retira el bloque tool_result huérfano y el mensaje que queda vacío', () => {
  const out = fixToolPairs([
    { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'x', content: 'r' }] },
    { role: 'user', content: 'y' },
  ])
  expect(out).toEqual([{ role: 'user', content: 'y' }])
})

test('fixToolPairs conserva la llamada del último mensaje: su resultado aún no llega', () => {
  const out = fixToolPairs([{ role: 'user', content: 'q' }, call('pending', 'voy')])
  expect(out[1]!.tool_calls).toHaveLength(1)
})

test('fixToolPairs retira un asistente que se queda sin contenido ni llamadas', () => {
  const out = fixToolPairs([{ role: 'user', content: 'q' }, call('orphan'), { role: 'user', content: 'y' }])
  expect(out.map(m => m.role)).toEqual(['user', 'user'])
})

test('un recorte que parte un par de herramienta no deja el resultado huérfano', () => {
  const body = { messages: [call('a', 'x'.repeat(4000)), { role: 'tool', tool_call_id: 'a', content: 'r' }, { role: 'user', content: 'q' }] }
  const out = compressContext(body, { maxTokens: 800, reserveTokens: 200 }).body!.messages as Msg[]
  expect(out.some(m => m.role === 'tool')).toBe(false)
  expect(out.at(-1)).toEqual({ role: 'user', content: 'q' })
})

test('el último asistente conserva su razonamiento', () => {
  const thinking = (text: string) => [{ type: 'thinking', thinking: text }, { type: 'text', text: 'ok' }]
  const body = { messages: [
    { role: 'user', content: 'q1' }, { role: 'assistant', content: thinking('t'.repeat(8000)) },
    { role: 'user', content: 'q2' }, { role: 'assistant', content: thinking('último') },
  ] }
  const out = compressContext(body, { maxTokens: 1000, reserveTokens: 100 })
  expect(out.stats.layers?.at(-1)?.name).toBe('compress_thinking')
  expect((out.body!.messages as Msg[])[3]!.content).toEqual(thinking('último'))
})

test('la poda de imágenes para en cuanto la petición cabe', () => {
  const image = (n: number) => ({ type: 'image_url', image_url: { url: `data:image/png;base64,${String(n).repeat(8)}` } })
  const messages = [{ role: 'user', content: [image(1), image(2), image(3), image(4)] }]
  expect(pruneOlderInlineImages(messages, { keepLatest: 0, targetTokens: estimateTokens(messages) - 1000 }).pruned).toBe(1)
})

test('el aviso de historia recortada es un texto fijo, sin la cuenta de lo retirado', () => {
  const body = { messages: Array.from({ length: 80 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `${i} ${'z'.repeat(400)}` })) }
  const out = compressContext(body, { maxTokens: 3000, reserveTokens: 500 }).body!.messages as Msg[]
  expect(out[0]).toEqual({ role: 'system', content: '[Context compressed: earlier messages removed to fit context window]' })
})
