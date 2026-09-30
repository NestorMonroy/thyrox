/**
 * El clasificador de errores del proxy — porte de OmniRoute
 * (`open-sse/services/errorClassifier.ts`, a58000c7). Los casos son los de sus
 * pruebas (`tests/unit/error-classifier.test.ts`, `errorClassifier-noauth-403-6315`,
 * `errorclassifier-antigravity-403`, `empty-content-stopreason-3572`,
 * `14160-antigravity-empty-stop-completion`, `diagnostics-fake-success-13461`),
 * con el registro de proveedores sustituido por los rasgos que la tabla
 * `TRAITS` declara, medidos en `open-sse/config/providers/registry/`.
 */
import { describe, expect, test } from 'bun:test'
import type { ProviderTraits } from '../src/proxy/resilience/errorClassifier.ts'
// Rutas sustituibles para los controles de anulación en paralelo
// (`src/verify/annul_parallel.sh`): cada variante es una copia del módulo.
const {
  blamesRequest,
  classifyFakeSuccessBody,
  classifyProviderError,
  containsModelUnavailableMessage,
  isAnthropicOAuthProvider,
  isAnthropicRequestNotAllowed,
  isCloudflareChallengeInterstitial,
  isCloudflareFingerprintRejection,
  isContextOverflow,
  isEmptyContentResponse,
  isGeoBlockedError,
  isResourceNotFoundResponse,
  PROVIDER_ERROR_TYPES: T,
} = (await import(process.env.ERROR_CLASSIFIER_MODULE ?? '../src/proxy/resilience/errorClassifier.ts')) as typeof import('../src/proxy/resilience/errorClassifier.ts')
const { isCreditsExhausted, isSubscriptionQuotaText } = (await import(
  process.env.ERROR_SIGNALS_MODULE ?? '../src/proxy/resilience/errorSignals.ts'
)) as typeof import('../src/proxy/resilience/errorSignals.ts')

const TRAITS: Record<string, ProviderTraits> = {
  codex: { authType: 'oauth' },
  openai: { authType: 'apikey' },
  glm: { authType: 'apikey', surface: 'glm openai' },
  'kimi-coding': { authType: 'oauth' },
  claude: { authType: 'oauth', surface: 'default claude' },
  'duckduckgo-web': { authType: 'none', surface: 'duckduckgo-web openai' },
  opencode: { authType: 'apikey', surface: 'opencode openai' },
  antigravity: { authType: 'oauth', surface: 'antigravity antigravity' },
  'chatgpt-web': { authType: 'apikey', surface: 'chatgpt-web openai' },
  'v0-vercel': { authType: 'apikey', surface: 'default openai' },
}
const traitsOf = (provider: string) => TRAITS[provider]
const classify = (status: number, body: unknown, provider?: string | null) =>
  classifyProviderError(status, body, provider, { traitsOf })

describe('classifyProviderError', () => {
  test('401: desactivada, plana, oauth inválido y modelo no admitido', () => {
    expect(classify(401, JSON.stringify({ error: { message: 'account_deactivated: this account has been disabled' } }))).toBe(T.ACCOUNT_DEACTIVATED)
    expect(classify(401, { error: { message: 'token expired' } })).toBe(T.UNAUTHORIZED)
    expect(classify(401, 'Invalid authentication credentials')).toBe(T.OAUTH_INVALID_TOKEN)
    expect(classify(401, 'Model minimax-m3-free is not supported')).toBe(T.MODEL_NOT_FOUND)
  })

  test('402 y señales de facturación en 400/403', () => {
    expect(classify(402, { error: { message: 'payment required' } })).toBe(T.QUOTA_EXHAUSTED)
    expect(classify(400, { error: { message: 'insufficient_quota: exceeded your current quota' } })).toBe(T.QUOTA_EXHAUSTED)
    expect(classify(400, { error: { message: 'The free tier of the model has been exhausted.' } })).toBe(T.QUOTA_EXHAUSTED)
    expect(classify(403, { error: { message: "You've reached your usage limit for this billing cycle. Your quota will be refreshed in the next cycle." } }, 'kimi-coding')).toBe(T.QUOTA_EXHAUSTED)
    expect(classify(403, 'Your Grok usage balance exhausted', 'xai')).toBe(T.QUOTA_EXHAUSTED)
  })

  test('429: límite, cuota por categoría y cuota diaria', () => {
    expect(classify(429, { error: { message: 'too many requests' } })).toBe(T.RATE_LIMITED)
    expect(classify(429, { error: { message: 'insufficient_quota: exceeded your current quota' } })).toBe(T.QUOTA_EXHAUSTED)
    expect(classify(429, { error: { message: 'insufficient_quota: exceeded your current quota' } }, 'openai')).toBe(T.RATE_LIMITED)
    expect(classify(429, { error: { message: 'insufficient_quota: exceeded your current quota' } }, 'codex')).toBe(T.QUOTA_EXHAUSTED)
    expect(classify(429, JSON.stringify({ error: { message: "You have exceeded today's quota for model moonshotai/Kimi-K2.5, please try again tomorrow" } }), 'openai')).toBe(T.RATE_LIMITED)
    expect(classify(429, { error: { message: 'You have reached your daily quota limit' } }, 'codex')).toBe(T.QUOTA_EXHAUSTED)
    expect(classify(429, 'usage limit reached', 'unregistered')).toBe(T.RATE_LIMITED)
  })

  test('403 de proyecto recuperable, plano, clave de API y sin credencial', () => {
    expect(classify(403, { error: { message: 'Cloud Code Private API has not been used in project 12345 before or it is disabled.' } })).toBe(T.PROJECT_ROUTE_ERROR)
    expect(classify(403, JSON.stringify({ error: { message: 'API has not been used in project abc-xyz before' } }))).toBe(T.PROJECT_ROUTE_ERROR)
    expect(classify(403, { error: { message: 'The caller does not have permission' } })).toBe(T.FORBIDDEN)
    expect(classify(403, { error: { message: 'The caller does not have permission' } }, 'glm')).toBeNull()
    expect(classify(403, 'forbidden', 'openai')).toBeNull()
    expect(classify(403, { error: 'Request blocked', type: 'access_denied' }, 'duckduckgo-web')).toBeNull()
    expect(classify(403, 'forbidden', 'unregistered')).toBeNull()
  })

  test('403 de Cloud Code y Kiro no banean; la baja real sí se detecta', () => {
    expect(classify(403, { error: { code: 403, status: 'PERMISSION_DENIED', message: 'Cloud AI Companion API has not been used in project 123 before or it is disabled.' } }, 'antigravity')).toBe(T.PROJECT_ROUTE_ERROR)
    expect(classify(403, { error: { status: 'PERMISSION_DENIED', details: [{ reason: 'SERVICE_DISABLED' }] } }, 'gemini-cli')).toBe(T.PROJECT_ROUTE_ERROR)
    expect(classify(403, 'forbidden', 'antigravity-cloudcode')).toBe(T.PROJECT_ROUTE_ERROR)
    expect(classify(403, 'This service has been disabled in this account for violation of policy.', 'antigravity')).toBe(T.ACCOUNT_DEACTIVATED)
    expect(classify(403, 'User is not authorized to make this call', 'kiro')).toBe(T.PROJECT_ROUTE_ERROR)
  })

  test('404: modelo, o recurso de la petición', () => {
    expect(classify(404, { error: { message: 'model v0-1.5-md not found' } })).toBe(T.MODEL_NOT_FOUND)
    expect(classify(404, { error: { message: 'Not Found' } }, 'v0-vercel')).toBe(T.MODEL_NOT_FOUND)
    const files = { error: { message: '[404]: Files [file-be30851bd1614656872e725e] were not found', type: 'invalid_request_error', code: 'model_not_found' } }
    expect(isResourceNotFoundResponse(files)).toBe(true)
    expect(classify(404, files, 'codex')).toBeNull()
    for (const body of [
      { error: { message: 'input_file file_id does not exist' } },
      { error: { message: 'Response resp_123 was not found' } },
      { error: { message: 'vector_store vs_123 not found' } },
      'Upload upload_123 does not exist',
    ]) {
      expect(isResourceNotFoundResponse(body)).toBe(true)
      expect(classify(404, body, 'openai')).toBeNull()
    }
  })

  test('Cloudflare 1010 y desafío gestionado: huella, nunca prohibido', () => {
    const nested = JSON.stringify({ error: { message: '[openai/deepseek-v4-flash-free] [403]: {"type":"https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-1xxx-errors/error-1010/","title":"Error 1010: Access denied","status":403,"detail":"The site owner has blocked access based on your browser\'s signature.","instance":"a283cb68eb52bda8","error_code":1010,"error_name":"browser_signature_banned"}' } })
    expect(classify(403, nested, 'opencode')).toBe(T.FINGERPRINT_REJECTION)
    expect(classify(403, JSON.stringify({ error: { message: '[403] {"error_name":"browser_signature_banned"}' } }))).toBe(T.FINGERPRINT_REJECTION)
    expect(classify(403, { error: { message: 'you do not have permission' } })).toBe(T.FORBIDDEN)
    const challenge = [
      '<!DOCTYPE html><html lang="en-US"><head><title>Just a moment...</title></head><body>',
      '<span id="challenge-error-text">Enable JavaScript and cookies to continue</span>',
      "<script>(function(){window._cf_chl_opt = {cType: 'managed',cZone: 'chatgpt.com'};",
      "a.src = '/cdn-cgi/challenge-platform/h/g/orchestrate/chl_page/v1?ray=a38b1a06cd3ea3e3';",
      '})();</script></body></html>',
    ].join('')
    expect(classify(403, challenge, 'codex')).toBe(T.FINGERPRINT_REJECTION)
    expect(classify(403, JSON.stringify({ error: { message: `[codex/gpt-5.6-sol] [403]: ${challenge}` } }), 'codex')).toBe(T.FINGERPRINT_REJECTION)
  })

  test('los 403 terminales siguen terminales', () => {
    expect(classify(403, { error: { message: 'you do not have permission' } }, 'codex')).toBe(T.FORBIDDEN)
    expect(classify(403, JSON.stringify({ error: 'SENTINEL_BLOCKED' }), 'chatgpt-web')).toBe(T.FORBIDDEN)
    expect(classify(403, 'Turnstile required', 'chatgpt-web')).toBe(T.FORBIDDEN)
  })

  test('el nivel gratuito de OpenCode rehúsa la petición, no la cuenta', () => {
    expect(classify(403, 'The free tier can only be used from the opencode client', 'opencode')).toBe(T.PROJECT_ROUTE_ERROR)
    expect(classify(403, 'The free tier can only be used from the opencode client', 'openai')).toBeNull()
  })

  test('Anthropic OAuth «Request not allowed» rechaza la petición', () => {
    const body = JSON.stringify({ type: 'error', error: { type: 'permission_error', message: 'Request not allowed' } })
    expect(classify(403, body, 'claude')).toBe(T.REQUEST_REJECTED)
    expect(classify(403, '[403]: Request not allowed', 'claude')).toBe(T.REQUEST_REJECTED)
    const other = JSON.stringify({ error: { message: 'Request not allowed' } })
    expect(classify(403, other, 'codex')).toBe(T.FORBIDDEN)
    expect(classify(403, other, undefined)).toBe(T.FORBIDDEN)
    expect(classify(403, { error: { message: 'you do not have permission' } }, 'claude')).toBe(T.FORBIDDEN)
    expect(classify(403, JSON.stringify({ error: { message: 'account_deactivated: this account has been disabled' } }), 'claude')).toBe(T.ACCOUNT_DEACTIVATED)
  })

  test('el proveedor anthropic con credencial OAuth es la superficie de suscripción de Anthropic', () => {
    const body = 'Request not allowed'
    expect(classifyProviderError(403, body, 'anthropic', { traitsOf: () => ({ authType: 'oauth' }) })).toBe(T.REQUEST_REJECTED)
    expect(classifyProviderError(403, body, 'anthropic', { traitsOf: () => ({ authType: 'apikey' }) })).toBeNull()
  })

  test('bloqueo regional sólo en las superficies de Google', () => {
    const body = 'User location is not supported for the API use.'
    expect(classify(400, body, 'antigravity')).toBe(T.GEO_BLOCKED)
    expect(classify(400, body, 'gemini')).toBe(T.GEO_BLOCKED)
    expect(classifyProviderError(400, body, 'nuevo', { traitsOf: () => ({ surface: 'antigravity' }) })).toBe(T.GEO_BLOCKED)
    expect(classify(400, body, 'openai')).toBeNull()
    expect(classify(400, body)).toBeNull()
  })

  test('422 BYOP, 5xx y 400 de contexto o de modelo', () => {
    expect(classify(422, JSON.stringify({ error: { message: 'GCP_PROJECT_REQUIRED: …', type: 'gcp_project_required', code: 'gcp_project_required' } }), 'antigravity')).toBe(T.GCP_PROJECT_REQUIRED)
    expect(classify(422, JSON.stringify({ error: { code: 'missing_project_id', message: 'Missing Google projectId' } }), 'antigravity')).toBeNull()
    expect(classify(503, 'unavailable')).toBe(T.SERVER_ERROR)
    expect(classify(400, 'prompt is too long: 210000 tokens > 200000 maximum context')).toBe(T.CONTEXT_OVERFLOW)
    expect(classify(400, 'model "gpt-9" is not supported')).toBe(T.MODEL_NOT_FOUND)
    expect(classify(400, 'bad json')).toBeNull()
  })

  test('las señales de baja que el operador añade cuentan como las propias', () => {
    expect(classifyProviderError(401, 'suspended by fraud team', null, { bannedSignals: ['suspended by fraud team'] })).toBe(T.ACCOUNT_DEACTIVATED)
    expect(classifyProviderError(401, 'suspended by fraud team', null)).toBe(T.UNAUTHORIZED)
  })
})

describe('los predicados', () => {
  test('huella de Cloudflare: sólo las formas con clave', () => {
    for (const yes of ['error_code: 1010', 'error_code = 1010', '"error_code": "1010"', 'https://.../cloudflare-1xxx-errors/error-1010/',
      String.raw`{"error":{"message":"[403]: {\"error_code\":1010}"}}`, 'BROWSER_SIGNATURE_BANNED', 'fingerprint_rejection',
      'error-1010', 'error-1010/', '[403] error-1010', 'Cloudflare error-1010: Access denied', '(error-1010)',
      'error code: 1010', 'error-code = 1010', '{"error_code":1010,"error_name":"browser_signature_banned"}']) {
      expect(isCloudflareFingerprintRejection(yes)).toBe(true)
    }
    for (const no of ['{"error_code":10101}', 'error 10101: something else', '1010', 'retry after 1010 seconds',
      'model foo-1010 is not supported', 'project 1010 has not been used', 'error_code:10101', 'HTTP 1019', 'limit 101 tokens',
      'error-10101', '/error_10109/', 'errorcode1010x', 'error_code:1010x', 'error-1010_tail', 'my_error-1010', 'xerror-1010',
      'my_error_code: 1010', 'twitter_error_code 1010', 'error 1010 something else']) {
      expect(isCloudflareFingerprintRejection(no)).toBe(false)
    }
  })

  test('desafío de Cloudflare: marcadores completos, nunca la palabra suelta', () => {
    expect(isCloudflareChallengeInterstitial("window._cf_chl_opt = {cType: 'managed'}")).toBe(true)
    expect(isCloudflareChallengeInterstitial('/cdn-cgi/challenge-platform/h/g/orchestrate/chl_page/v1')).toBe(true)
    expect(isCloudflareChallengeInterstitial('<span id="challenge-error-text">')).toBe(true)
    expect(isCloudflareChallengeInterstitial(String.raw`<span id=\"challenge-error-text\">`)).toBe(true)
    expect(isCloudflareChallengeInterstitial('this request failed a security challenge, please retry')).toBe(false)
    expect(isCloudflareChallengeInterstitial('{"error":"challenge_required","detail":"solve a challenge"}')).toBe(false)
    expect(isCloudflareChallengeInterstitial('challenge-platform')).toBe(false)
    expect(isCloudflareChallengeInterstitial('')).toBe(false)
  })

  test('Anthropic, contexto, modelo y región', () => {
    expect(isAnthropicRequestNotAllowed('Request not allowed')).toBe(true)
    expect(isAnthropicRequestNotAllowed('{"message":"request NOT allowed"}')).toBe(true)
    expect(isAnthropicRequestNotAllowed('requests not allowed here')).toBe(false)
    expect(isAnthropicRequestNotAllowed('')).toBe(false)
    expect(isAnthropicOAuthProvider('claude')).toBe(true)
    expect(isAnthropicOAuthProvider('CLAUDE')).toBe(true)
    expect(isAnthropicOAuthProvider('anthropic')).toBe(false)
    expect(isAnthropicOAuthProvider(null)).toBe(false)
    expect(isContextOverflow('request exceeds context window')).toBe(true)
    expect(isContextOverflow('plain auth error')).toBe(false)
    expect(containsModelUnavailableMessage('Model minimax-m3-free is not supported')).toBe(true)
    expect(containsModelUnavailableMessage('the model\nis not supported')).toBe(false)
    expect(isGeoBlockedError('Not available in your region')).toBe(true)
    expect(isGeoBlockedError('rate limited')).toBe(false)
  })
})

describe('isEmptyContentResponse', () => {
  test('forma Messages', () => {
    expect(isEmptyContentResponse({ type: 'message', role: 'assistant', content: [], stop_reason: 'max_tokens', usage: { output_tokens: 1 } })).toBe(false)
    expect(isEmptyContentResponse({ content: [], stop_reason: 'tool_use' })).toBe(false)
    expect(isEmptyContentResponse({ content: [] })).toBe(true)
    expect(isEmptyContentResponse({ content: [], stop_reason: null })).toBe(true)
    expect(isEmptyContentResponse({ content: [], stop_reason: 'end_turn' })).toBe(true)
    expect(isEmptyContentResponse({ content: [{ type: 'text', text: 'hi' }] })).toBe(false)
  })

  test('forma OpenAI', () => {
    expect(isEmptyContentResponse({ choices: [{ index: 0, message: { content: '' }, finish_reason: 'length' }] })).toBe(false)
    expect(isEmptyContentResponse({ choices: [{ index: 0, delta: { content: '' }, finish_reason: 'length' }] })).toBe(false)
    expect(isEmptyContentResponse({ choices: [{ index: 0, message: { content: '' }, finish_reason: 'stop' }] })).toBe(true)
    expect(isEmptyContentResponse({ choices: [{ index: 0, message: { content: '' }, finish_reason: 'content_filter' }] })).toBe(false)
    expect(isEmptyContentResponse({ choices: [{ message: { content: 'hi' }, finish_reason: 'length' }] })).toBe(false)
    expect(isEmptyContentResponse({ choices: [] })).toBe(true)
    expect(isEmptyContentResponse({ choices: [{ message: { content: '', reasoning: 'thinking' } }] })).toBe(false)
    expect(isEmptyContentResponse({ choices: [{ message: { content: '', tool_calls: [{ id: 'a' }] } }] })).toBe(false)
  })

  test('las APIs de primera parte admiten una parada normal vacía', () => {
    const emptyStop = { choices: [{ message: { role: 'assistant', content: '' }, finish_reason: 'stop' }] }
    expect(isEmptyContentResponse(emptyStop, { provider: 'antigravity' })).toBe(false)
    expect(isEmptyContentResponse({ content: [], stop_reason: 'end_turn' }, { provider: 'antigravity' })).toBe(false)
    expect(isEmptyContentResponse(emptyStop, { provider: 'pollinations' })).toBe(true)
    expect(isEmptyContentResponse({ content: [], stop_reason: 'end_turn' }, { provider: 'some-scraper' })).toBe(true)
    expect(isEmptyContentResponse({ choices: [{ message: { content: '' } }] }, { provider: 'antigravity' })).toBe(true)
  })

  test('texto y contenido sueltos', () => {
    expect(isEmptyContentResponse({ text: '  ' })).toBe(true)
    expect(isEmptyContentResponse({ content: null })).toBe(true)
    expect(isEmptyContentResponse({ content: 'hola' })).toBe(false)
    expect(isEmptyContentResponse('texto')).toBe(false)
    expect(isEmptyContentResponse({})).toBe(false)
  })
})

describe('classifyFakeSuccessBody', () => {
  test('sólo en la lista, contenido corto y señal dominante', () => {
    expect(classifyFakeSuccessBody('Insufficient balance. Please top up your account.', 'pollinations')).toBe(T.QUOTA_EXHAUSTED)
    expect(classifyFakeSuccessBody('Your account has been suspended.', 'perplexity-web')).toBe(T.ACCOUNT_DEACTIVATED)
    expect(classifyFakeSuccessBody('Insufficient balance. Please top up your account.', 'openai')).toBeNull()
    expect(classifyFakeSuccessBody(`${'Credits are a way to pay for usage. '.repeat(12)}out of credits`, 'pollinations')).toBeNull()
    expect(classifyFakeSuccessBody('Hello! How can I help you today?', 'perplexity-web')).toBeNull()
    expect(classifyFakeSuccessBody('out of credits', null)).toBeNull()
  })
})

describe('blamesRequest', () => {
  test('lo que culpa a la petición deja la credencial sin enfriar', () => {
    expect(blamesRequest(400, 'bad json')).toBe(true)
    expect(blamesRequest(413, 'too large')).toBe(true)
    expect(blamesRequest(400, 'prompt is too long: maximum context')).toBe(true)
    expect(blamesRequest(404, { error: { message: 'Response resp_123 was not found' } })).toBe(true)
    expect(blamesRequest(403, 'Request not allowed', 'claude', { traitsOf })).toBe(true)
    expect(blamesRequest(403, '{"error_code":1010}', 'opencode', { traitsOf })).toBe(true)
    expect(blamesRequest(400, 'User location is not supported', 'gemini')).toBe(true)
  })

  test('lo que culpa a la credencial o al proveedor, no', () => {
    expect(blamesRequest(200, '')).toBe(false)
    expect(blamesRequest(404, 'model not found')).toBe(false)
    expect(blamesRequest(429, 'too many requests')).toBe(false)
    expect(blamesRequest(401, 'token expired')).toBe(false)
    expect(blamesRequest(403, 'forbidden', 'openai', { traitsOf })).toBe(false)
    expect(blamesRequest(400, 'insufficient_quota')).toBe(false)
    expect(blamesRequest(402, 'payment required')).toBe(false)
    expect(blamesRequest(500, 'boom')).toBe(false)
    expect(blamesRequest(422, 'gcp_project_required', 'antigravity')).toBe(false)
  })
})

describe('las señales de texto', () => {
  test('la frase de límite de cuenta sólo es cuota de suscripción en claude', () => {
    const phrase = "this request would exceed your account's rate limit"
    expect(isSubscriptionQuotaText(phrase, 'claude')).toBe(true)
    expect(isSubscriptionQuotaText(phrase, 'openai')).toBe(false)
    expect(isSubscriptionQuotaText('usage limit reached', null)).toBe(true)
  })

  test('la bolsa compartida de Grok cuenta como créditos agotados', () => {
    expect(isCreditsExhausted('usage balance exhausted')).toBe(true)
    expect(isCreditsExhausted('Resource has been exhausted (e.g. check quota).')).toBe(false)
  })
})
