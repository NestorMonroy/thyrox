/**
 * La ventana del modelo y los ajustes por entorno del gestor de contexto: lo
 * que el porte cambia frente a OmniRoute (el prefijo de thyrox y la ventana
 * inyectada en vez de un registro).
 */
import { afterEach, expect, test } from 'bun:test'
// Ruta sustituible para los controles de anulación en paralelo (`src/verify/annul_parallel.sh`).
const CM = (await import(process.env.CONTEXT_MANAGER_MODULE ?? '../src/proxy/context/contextManager.ts')) as typeof import('../src/proxy/context/contextManager.ts')
const { compressContext, getTokenLimit, pruneOlderInlineImages, resolveTokenLimit } = CM

const VARS = ['THYROX_CONTEXT_LENGTH_OPENAI', 'THYROX_CONTEXT_LENGTH_DEFAULT', 'THYROX_CONTEXT_RESERVE_TOKENS', 'THYROX_CONTEXT_KEEP_LATEST_IMAGES']
const saved = Object.fromEntries(VARS.map(name => [name, process.env[name]]))
afterEach(() => {
  for (const name of VARS) {
    if (saved[name] === undefined) delete process.env[name]
    else process.env[name] = saved[name]
  }
})

const image = (n: number) => ({ type: 'image_url', image_url: { url: `data:image/png;base64,${String(n).repeat(8)}` } })

test('THYROX_CONTEXT_LENGTH_<PROVEEDOR> gana a todo lo demás', () => {
  process.env.THYROX_CONTEXT_LENGTH_OPENAI = '50000'
  expect(getTokenLimit('openai', 'gpt-4o', () => 900_000)).toBe(50_000)
})

test('THYROX_CONTEXT_LENGTH_DEFAULT vale para cualquier proveedor sin variable propia', () => {
  process.env.THYROX_CONTEXT_LENGTH_DEFAULT = '64000'
  expect(getTokenLimit('anthropic', 'claude-sonnet-5')).toBe(64_000)
})

test('una variable que no es un entero positivo se ignora', () => {
  process.env.THYROX_CONTEXT_LENGTH_OPENAI = 'mucho'
  expect(getTokenLimit('openai', 'gpt-4o')).toBe(400_000)
})

test('la ventana inyectada gana a la pista por nombre', () => {
  expect(resolveTokenLimit('anthropic', 'claude-sonnet-5', (_p, m) => (m === 'claude-sonnet-5' ? 1_000_000 : undefined)))
    .toEqual({ limit: 1_000_000, specific: true })
  expect(getTokenLimit('anthropic', 'claude-haiku-4-5', () => undefined)).toBe(200_000)
})

test('sin fuente propia, el valor genérico no es específico', () => {
  expect(resolveTokenLimit('desconocido', 'modelo-x')).toEqual({ limit: 128_000, specific: false })
})

test('compressContext lee la ventana inyectada', () => {
  const body = { model: 'm', messages: [{ role: 'user', content: 'x'.repeat(4000) }] }
  expect(compressContext(body, { contextWindowOf: () => 100_000 }).compressed).toBe(false)
  expect(compressContext(body, { contextWindowOf: () => 900, reserveTokens: 100 }).compressed).toBe(true)
})

test('THYROX_CONTEXT_RESERVE_TOKENS fija la reserva cuando la llamada no la da', () => {
  const body = { model: 'm', messages: [{ role: 'user', content: 'x'.repeat(4000) }] }
  process.env.THYROX_CONTEXT_RESERVE_TOKENS = '10'
  expect(compressContext(body, { maxTokens: 1100 }).compressed).toBe(false)
  process.env.THYROX_CONTEXT_RESERVE_TOKENS = '500'
  expect(compressContext(body, { maxTokens: 1100 }).compressed).toBe(true)
})

test('THYROX_CONTEXT_KEEP_LATEST_IMAGES fija cuántas imágenes recientes se conservan, cero incluido', () => {
  const messages = [{ role: 'user', content: [image(1), image(2), image(3)] }]
  process.env.THYROX_CONTEXT_KEEP_LATEST_IMAGES = '1'
  expect(pruneOlderInlineImages(messages).pruned).toBe(2)
  process.env.THYROX_CONTEXT_KEEP_LATEST_IMAGES = '0'
  expect(pruneOlderInlineImages(messages).pruned).toBe(3)
})
