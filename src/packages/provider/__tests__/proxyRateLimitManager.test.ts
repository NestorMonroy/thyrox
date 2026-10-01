/**
 * El gestor de límites adaptativos del proxy — porte de OmniRoute
 * (`open-sse/services/rateLimitManager.ts`, a58000c7). Los casos siguen
 * `tests/unit/rate-limit-manager.test.ts` (desactivado, aviso de exceso,
 * aprendizaje de cabeceras, 429, claves por modelo, pista en el cuerpo,
 * cancelación), `rate-limit-learned-cap-13594.test.ts` (tope aprendido) y
 * `rateLimitManager-mintime-floor-9763.test.ts` (suelo de `minTime`), sin su
 * base de datos: el estado vive en la instancia.
 */
import { expect, test } from 'bun:test'
// Rutas sustituibles para los controles de anulación en paralelo (`src/verify/annul_parallel.sh`).
const { RateLimitManager } = (await import(
  process.env.RATE_LIMIT_MANAGER_MODULE ?? '../src/proxy/resilience/rateLimitManager.ts'
)) as typeof import('../src/proxy/resilience/rateLimitManager.ts')
const { parseRetryAfterFromBody } = (await import(
  process.env.RETRY_HINTS_MODULE ?? '../src/proxy/resilience/retryHints.ts'
)) as typeof import('../src/proxy/resilience/retryHints.ts')

const TOKENROUTER_429 = JSON.stringify({
  error: { message: 'You have reached the request limit: Maximum 5 requests within 1 minutes', type: 'rate_limit_error' },
})

test('una credencial sin protección pasa directa y no aparece en el estado', async () => {
  const m = new RateLimitManager()
  expect(await m.withRateLimit('openai', 'c1', null, async () => 'directo')).toBe('directo')
  expect(m.status('openai', 'c1')).toEqual({ enabled: false, active: false, queued: 0, running: 0 })
  expect(m.allStatus()).toEqual({})
  m.updateFromHeaders('openai', 'c1', { 'x-ratelimit-limit-requests': '100', 'x-ratelimit-remaining-requests': '1' }, 200)
  expect(m.learnedLimits()).toEqual({})
})

test('el aviso de exceso separa las peticiones 200 ms', () => {
  const m = new RateLimitManager()
  m.enable('c1')
  m.updateFromHeaders('openai', 'c1', { 'x-ratelimit-over-limit': 'yes' }, 200)
  expect(m.status('openai', 'c1').active).toBe(true)
  expect(m.settingsOf('openai', 'c1')?.minTime).toBe(200)
})

test('con poco cupo restante, el limitador se ciñe a lo que queda hasta el reinicio', () => {
  const m = new RateLimitManager()
  m.enable('c1')
  m.updateFromHeaders('openai', 'c1', {
    'x-ratelimit-limit-requests': '100',
    'x-ratelimit-remaining-requests': '5',
    'x-ratelimit-reset-requests': '30s',
  }, 200)
  expect(m.settingsOf('openai', 'c1')).toMatchObject({
    minTime: 590, reservoir: 5, reservoirRefreshAmount: 100, reservoirRefreshInterval: 30_000,
  })
  expect(m.learnedLimits()['openai:c1']).toMatchObject({ provider: 'openai', credentialId: 'c1', limit: 100, remaining: 5, minTime: 590 })
})

test('con holgura, el limitador vuelve al suelo y suelta el cupo; Anthropic usa sus cabeceras', () => {
  const m = new RateLimitManager({ minTimeBetweenRequestsMs: 25 })
  m.enable('c1')
  m.updateFromHeaders('anthropic', 'c1', new Headers({
    'anthropic-ratelimit-requests-limit': '100',
    'anthropic-ratelimit-requests-remaining': '70',
    'anthropic-ratelimit-requests-reset': new Date(Date.now() + 30_000).toISOString(),
  }), 200)
  expect(m.settingsOf('anthropic', 'c1')).toMatchObject({ minTime: 25, reservoir: null, reservoirRefreshAmount: null })
})

test('un remanente intermedio sólo ajusta minTime', () => {
  const m = new RateLimitManager()
  m.enable('c1')
  m.updateFromHeaders('openai', 'c1', { 'x-ratelimit-limit-requests': '60', 'x-ratelimit-remaining-requests': '20' }, 200)
  expect(m.settingsOf('openai', 'c1')).toMatchObject({ minTime: 990, reservoir: null })
})

test('un 429 retira el limitador y rechaza lo que esperaba en él', async () => {
  const m = new RateLimitManager({ concurrentRequests: 1 })
  m.enable('c1')
  let release!: () => void
  const running = m.withRateLimit('openai', 'c1', null, () => new Promise<string>(r => (release = () => r('hecho'))))
  const queued = m.withRateLimit('openai', 'c1', null, async () => 'nunca')
  m.updateFromHeaders('openai', 'c1', { 'retry-after': '1s' }, 429)
  await expect(queued).rejects.toMatchObject({ code: 'RATE_LIMITED_BY_UPSTREAM' })
  expect(m.status('openai', 'c1').active).toBe(false)
  release()
  expect(await running).toBe('hecho')
})

test('gemini y github llevan un limitador por modelo; el resto uno por credencial', () => {
  const m = new RateLimitManager()
  m.enable('c1')
  const low = { 'x-ratelimit-limit-requests': '50', 'x-ratelimit-remaining-requests': '3', 'x-ratelimit-reset-requests': '15s' }
  m.updateFromHeaders('github', 'c1', low, 200, 'gpt-5.1-codex-max')
  m.updateFromHeaders('openai', 'c1', low, 200, 'gpt-4o')
  expect(Object.keys(m.allStatus()).sort()).toEqual(['github:c1:gpt-5.1-codex-max', 'openai:c1'])
})

test('una pista de reintento en el cuerpo vacía el cupo hasta que pase', () => {
  const m = new RateLimitManager()
  m.enable('c1')
  m.updateFromResponseBody('openai', 'c1', { error: { details: [{ retryDelay: '2s' }], message: 'Please retry later' } }, 429, 'gpt-4o')
  expect(m.settingsOf('openai', 'c1')).toMatchObject({ reservoir: 0, reservoirRefreshAmount: 60, reservoirRefreshInterval: 2_000 })
  expect(m.status('openai', 'c1').active).toBe(true)
})

test('un tope en el texto de un 429 se aprende y marca el ritmo desde la ventana siguiente', () => {
  const m = new RateLimitManager()
  m.enable('c1')
  m.updateFromResponseBody('tokenrouter', 'c1', TOKENROUTER_429, 429)
  expect(m.settingsOf('tokenrouter', 'c1')).toMatchObject({
    minTime: 12_000, reservoir: 0, reservoirRefreshAmount: 5, reservoirRefreshInterval: 60_000,
  })
  expect(m.learnedLimits()['tokenrouter:c1']).toMatchObject({ capRequests: 5, capWindowMs: 60_000, limit: 5 })
})

test('el tope aprendido sobrevive al retiro del limitador por el 429 siguiente', () => {
  const m = new RateLimitManager()
  m.enable('c1')
  m.updateFromResponseBody('tokenrouter', 'c1', TOKENROUTER_429, 429)
  m.updateFromHeaders('tokenrouter', 'c1', {}, 429)
  m.updateFromHeaders('tokenrouter', 'c1', { 'x-ratelimit-over-limit': 'no' }, 200)
  expect(m.settingsOf('tokenrouter', 'c1')).toMatchObject({ minTime: 12_000, reservoir: 5, reservoirRefreshAmount: 5 })
})

test('un tope nunca separa las peticiones menos que el suelo de minTime', () => {
  const m = new RateLimitManager({ minTimeBetweenRequestsMs: 30_000 })
  m.enable('c1')
  m.updateFromResponseBody('tokenrouter', 'c1', TOKENROUTER_429, 429)
  expect(m.settingsOf('tokenrouter', 'c1')?.minTime).toBe(30_000)
})

test('una respuesta que no es 429 no enseña ningún tope', () => {
  const m = new RateLimitManager()
  m.enable('c1')
  m.updateFromResponseBody('tokenrouter', 'c1', TOKENROUTER_429, 400)
  expect(m.learnedLimits()).toEqual({})
})

test('desactivar olvida lo aprendido de la credencial', () => {
  const m = new RateLimitManager()
  m.enable('c1')
  m.updateFromResponseBody('tokenrouter', 'c1', TOKENROUTER_429, 429)
  m.disable('c1')
  expect(m.isEnabled('c1')).toBe(false)
  expect(m.status('tokenrouter', 'c1').active).toBe(false)
  m.enable('c1')
  expect(m.learnedLimits()).toEqual({})
})

test('una cancelación rechaza con el DOMException de la señal, sin tocarlo', async () => {
  const m = new RateLimitManager()
  m.enable('c1')
  const controller = new AbortController()
  const pending = m.withRateLimit('openai', 'c1', null, () => new Promise(r => setTimeout(() => r('tarde'), 50)), controller.signal)
  controller.abort()
  const error = (await pending.catch(e => e)) as DOMException
  expect(error).toBeInstanceOf(DOMException)
  expect(error.name).toBe('AbortError')
})

test('los ajustes de cola se aplican al crear cada limitador', () => {
  const m = new RateLimitManager({ requestsPerMinute: 30, minTimeBetweenRequestsMs: 10, concurrentRequests: 2 })
  m.enable('c1')
  m.updateFromHeaders('openai', 'c1', { 'x-ratelimit-over-limit': 'no' }, 200)
  expect(m.settingsOf('openai', 'c1')).toMatchObject({
    maxConcurrent: 2, minTime: 10, reservoir: 30, reservoirRefreshAmount: 30, reservoirRefreshInterval: 60_000,
  })
})

// parseRetryAfterFromBody — casos de `tests/unit/rate-limit-enhanced.test.ts`.

test('parseRetryAfterFromBody lee el retryDelay de Gemini', () => {
  const body = { error: { code: 429, message: 'Resource has been exhausted', details: [{ '@type': 'google.rpc.RetryInfo', retryDelay: '33s' }] } }
  expect(parseRetryAfterFromBody(body)).toEqual({ retryAfterMs: 33_000, reason: 'rate_limit_exceeded' })
})

test('parseRetryAfterFromBody lee «retry after Ns» del mensaje de OpenAI', () => {
  const body = { error: { message: 'Rate limit reached. Please retry after 20s.', type: 'rate_limit_error' } }
  expect(parseRetryAfterFromBody(body)).toEqual({ retryAfterMs: 20_000, reason: 'rate_limit_exceeded' })
})

test('parseRetryAfterFromBody reconoce el rate_limit_error de Anthropic sin espera', () => {
  expect(parseRetryAfterFromBody({ type: 'error', error: { type: 'rate_limit_error', message: 'Too many requests' } }))
    .toEqual({ retryAfterMs: null, reason: 'rate_limit_exceeded' })
})

test('parseRetryAfterFromBody acepta texto JSON, rechaza lo que no lo es y lo vacío', () => {
  expect(parseRetryAfterFromBody(JSON.stringify({ error: { details: [{ retryDelay: '10s' }] } })).retryAfterMs).toBe(10_000)
  expect(parseRetryAfterFromBody('not json')).toEqual({ retryAfterMs: null, reason: 'unknown' })
  expect(parseRetryAfterFromBody(null).retryAfterMs).toBeNull()
  expect(parseRetryAfterFromBody(undefined).retryAfterMs).toBeNull()
})

test('lo aprendido de las cabeceras conserva el tope aprendido del cuerpo', () => {
  const m = new RateLimitManager()
  m.enable('c1')
  m.updateFromResponseBody('tokenrouter', 'c1', TOKENROUTER_429, 429)
  m.updateFromHeaders('tokenrouter', 'c1', { 'x-ratelimit-limit-requests': '100', 'x-ratelimit-remaining-requests': '40' }, 200)
  expect(m.learnedLimits()['tokenrouter:c1']).toMatchObject({ capRequests: 5, capWindowMs: 60_000, limit: 100, remaining: 40 })
})

test('Anthropic se lee por sus propias cabeceras', () => {
  const m = new RateLimitManager()
  m.enable('c1')
  m.updateFromHeaders('anthropic', 'c1', {
    'anthropic-ratelimit-requests-limit': '50',
    'anthropic-ratelimit-requests-remaining': '2',
    'anthropic-ratelimit-requests-reset': '20s',
  }, 200)
  expect(m.settingsOf('anthropic', 'c1')).toMatchObject({ reservoir: 2, reservoirRefreshAmount: 50, reservoirRefreshInterval: 20_000 })
})
