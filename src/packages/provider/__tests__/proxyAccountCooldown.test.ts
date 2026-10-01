/**
 * El enfriamiento por credencial del proxy — porte de `checkFallbackError` de
 * OmniRoute (`open-sse/services/accountFallback.ts`, a58000c7). Los casos son
 * los de `tests/unit/account-fallback-service.test.ts` que caen dentro del
 * núcleo portado: señales de baja, créditos, cuota diaria y por hora, pistas
 * de reintento, 400 de acceso al modelo y el aviso del supervisor. La
 * categoría de cada proveedor la declara `TRAITS`, como en el clasificador.
 */
import { test } from 'bun:test'
import assert from 'node:assert/strict'
import type { ProviderTraits } from '../src/proxy/resilience/errorClassifier.ts'
import type { ProviderProfile } from '../src/proxy/resilience/accountCooldown.ts'
// Ruta sustituible para los controles de anulación en paralelo (`src/verify/annul_parallel.sh`).
const M = (await import(
  process.env.ACCOUNT_COOLDOWN_MODULE ?? '../src/proxy/resilience/accountCooldown.ts'
)) as typeof import('../src/proxy/resilience/accountCooldown.ts')
const { RateLimitReason, COOLDOWN_MS, isDailyQuotaExhausted, getMsUntilTomorrow, classifyErrorText, parseRetryFromErrorText, isProviderModelUnsupported400 } = M

const TRAITS: Record<string, ProviderTraits> = { codex: { authType: 'oauth' }, openai: { authType: 'apikey' } }
const checkFallbackError = (...args: Parameters<typeof M.checkFallbackError>) => {
  const [status, text, level = 0, model = null, provider = null, headers = null, profile = null, structured = null] = args
  return M.checkFallbackError(status, text, level, model, provider, headers, profile, structured, { traitsOf: p => TRAITS[p] })
}
const accountFallback = { isDailyQuotaExhausted, getMsUntilTomorrow, classifyErrorText }

/** Build a full ProviderProfile from partial overrides (test helper). */
function makeProfile(overrides: Record<string, unknown> = {}): ProviderProfile {
  return {
    baseCooldownMs: 125,
    useUpstreamRetryHints: false,
    maxBackoffSteps: 3,
    failureThreshold: 60,
    resetTimeoutMs: 5000,
    transientCooldown: 125,
    rateLimitCooldown: 125,
    maxBackoffLevel: 3,
    circuitBreakerThreshold: 60,
    circuitBreakerReset: 5000,
    providerFailureThreshold: 5,
    providerFailureWindowMs: 300000,
    providerCooldownMs: 60000,
    ...overrides,
  };
}

function withMockedNow(now: number, fn: () => void) {
  const originalNow = Date.now;
  Date.now = () => now;
  try {
    return fn();
  } finally {
    Date.now = originalNow;
  }
}


test("parseRetryFromErrorText parses both compact reset formats", () => {
  assert.equal(parseRetryFromErrorText("Your quota will reset after 2h30m14s"), 9_014_000);
  assert.equal(parseRetryFromErrorText("The pool will reset after 45m"), 2_700_000);
  assert.equal(parseRetryFromErrorText("This will reset after 30s"), 30_000);
  assert.equal(parseRetryFromErrorText("No reset metadata"), null);
});

test("parseRetryFromErrorText parses Antigravity 'Resets in XhYmZs' phrasing", () => {
  assert.equal(
    parseRetryFromErrorText(
      "Individual quota reached. Contact your administrator to enable overages. " +
        "Resets in 164h27m24s."
    ),
    (164 * 3600 + 27 * 60 + 24) * 1000
  );
  assert.equal(parseRetryFromErrorText("Resets in 2h7m23s"), 7_643_000);
  assert.equal(parseRetryFromErrorText("Reset in 45m"), 2_700_000);
});

test("parseRetryFromErrorText caps extreme reset windows at 30 days", () => {
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  // 100 days → capped to 30
  assert.equal(parseRetryFromErrorText("Resets in 2400h"), thirtyDaysMs);
  // Absurd value → capped
  assert.equal(parseRetryFromErrorText("Resets in 999999h"), thirtyDaysMs);
});


test("checkFallbackError marks deactivated accounts as permanent auth failures", () => {
  const result = checkFallbackError(401, "This account has been deactivated");
  assert.equal(result.shouldFallback, true);
  assert.equal(result.reason, RateLimitReason.AUTH_ERROR);
  assert.equal(result.permanent, true);
  assert.ok(result.cooldownMs >= 300 * 24 * 60 * 60 * 1000);
});

test("checkFallbackError classifies 'free tier of the model has been exhausted' as quota exhausted", () => {
  const result = checkFallbackError(429, "free tier of the model has been exhausted");
  assert.equal(result.shouldFallback, true);
  assert.equal(result.reason, RateLimitReason.QUOTA_EXHAUSTED);
  assert.equal(result.creditsExhausted, true);
});

test("checkFallbackError treats non-429 exhausted credits as long quota cooldowns", () => {
  const result = checkFallbackError(402, "credit_balance_too_low");
  assert.equal(result.shouldFallback, true);
  assert.equal(result.reason, RateLimitReason.QUOTA_EXHAUSTED);
  assert.equal(result.creditsExhausted, true);
  assert.equal(result.cooldownMs, COOLDOWN_MS.paymentRequired ?? 3600 * 1000);
});

test("checkFallbackError keeps API-key 429 exhausted-credit text on the resilience cooldown path", () => {
  const result = checkFallbackError(
    429,
    "credit_balance_too_low",
    0,
    null,
    "openai",
    null,
    makeProfile()
  );

  assert.equal(result.shouldFallback, true);
  assert.equal(result.reason, RateLimitReason.RATE_LIMIT_EXCEEDED);
  assert.equal(result.creditsExhausted, undefined);
  assert.equal(result.cooldownMs, 125);
});

test("checkFallbackError preserves OAuth 429 exhausted-credit semantics", () => {
  const result = checkFallbackError(
    429,
    "credit_balance_too_low",
    0,
    null,
    "codex",
    null,
    makeProfile()
  );

  assert.equal(result.shouldFallback, true);
  assert.equal(result.reason, RateLimitReason.QUOTA_EXHAUSTED);
  assert.equal(result.creditsExhausted, true);
  assert.equal(result.cooldownMs, COOLDOWN_MS.paymentRequired ?? 3600 * 1000);
});

test("#6638: checkFallbackError classifies API-key 429 explicit quota text as quota_exhausted", () => {
  const result = checkFallbackError(429, "quota exceeded", 0, null, "openai", null, makeProfile());

  assert.equal(result.shouldFallback, true);
  assert.equal(result.reason, RateLimitReason.QUOTA_EXHAUSTED);
  assert.equal(result.cooldownMs, 125);
});

test("checkFallbackError honors Retry-After header for rate limits", () => {
  withMockedNow(1_700_000_000_000, () => {
    const headers = new Headers({ "retry-after": "120" });
    const result = checkFallbackError(429, "Rate limit hit", 3, null, "openai", headers);

    assert.equal(result.shouldFallback, true);
    assert.equal(result.reason, RateLimitReason.RATE_LIMIT_EXCEEDED);
    assert.equal(result.newBackoffLevel, 0);
    assert.equal(result.cooldownMs, 120_000);
  });
});

test("checkFallbackError honors x-ratelimit-reset for transient 5xx errors", () => {
  withMockedNow(1_700_000_000_000, () => {
    const resetSeconds = Math.floor((Date.now() + 90_000) / 1000);
    const headers = new Headers({ "x-ratelimit-reset": String(resetSeconds) });
    const result = checkFallbackError(503, "upstream unavailable", 1, null, "openai", headers);

    assert.equal(result.shouldFallback, true);
    assert.equal(result.reason, RateLimitReason.SERVER_ERROR);
    assert.equal(result.newBackoffLevel, 0);
    assert.ok(result.cooldownMs >= 89_000);
    assert.ok(result.cooldownMs <= 90_000);
  });
});

test("checkFallbackError keeps generic 400 client errors terminal", () => {
  const result = checkFallbackError(400, "bad request payload");
  assert.deepEqual(result, {
    shouldFallback: false,
    cooldownMs: 0,
    reason: RateLimitReason.UNKNOWN,
  });
});

test("checkFallbackError treats a genuine 400 model-access error as combo fallback", () => {
  const result = checkFallbackError(400, "The model `foo` does not exist or is not available");
  assert.equal(result.shouldFallback, true);
  assert.equal(result.reason, RateLimitReason.MODEL_CAPACITY);
});

test("checkFallbackError does NOT treat a bad-credential 400 as model-access fallback", () => {
  // Phrased so it would otherwise match MODEL_ACCESS_DENIED_PATTERNS ("...api key
  // ... model"), but the bad-credential signal must keep it terminal so the real
  // auth error surfaces instead of silently exhausting every combo target.
  const result = checkFallbackError(400, "Invalid API key provided for model gpt-4o");
  assert.deepEqual(result, {
    shouldFallback: false,
    cooldownMs: 0,
    reason: RateLimitReason.UNKNOWN,
  });
});

test("checkFallbackError still honors structured model_not_found even with credential-like text", () => {
  // Structured codes are authoritative and unaffected by the credential guard.
  const result = checkFallbackError(400, "unauthorized-ish blob", 0, null, "openai", null, null, {
    code: "model_not_found",
  });
  assert.equal(result.shouldFallback, true);
  assert.equal(result.reason, RateLimitReason.MODEL_CAPACITY);
});


test("isDailyQuotaExhausted detects today's quota errors", () => {
  const { isDailyQuotaExhausted } = accountFallback;
  assert.equal(isDailyQuotaExhausted("You have exceeded today's quota for model X"), true);
  assert.equal(isDailyQuotaExhausted("exceeded your daily quota"), true);
  assert.equal(isDailyQuotaExhausted("Please try again tomorrow"), true);
  assert.equal(isDailyQuotaExhausted("rate limit exceeded"), false);
  assert.equal(isDailyQuotaExhausted(""), false);
  assert.equal(isDailyQuotaExhausted(null as unknown as string), false);
});

test("getMsUntilTomorrow returns positive value less than 24 hours", () => {
  const { getMsUntilTomorrow } = accountFallback;
  const ms = getMsUntilTomorrow();
  assert.ok(ms > 0, "should be positive");
  assert.ok(ms <= 24 * 60 * 60 * 1000, "should be <= 24 hours");
});

test("checkFallbackError locks model until tomorrow for non-429 daily quota exhaustion", () => {
  const result = checkFallbackError(
    402,
    "You have exceeded today's quota for model moonshotai/Kimi-K2.5, please try again tomorrow"
  );
  assert.equal(result.shouldFallback, true);
  assert.equal(result.reason, RateLimitReason.QUOTA_EXHAUSTED);
  assert.equal(result.dailyQuotaExhausted, true);
  assert.ok(result.cooldownMs > 0, "cooldown should be positive");
  assert.ok(result.cooldownMs <= 24 * 60 * 60 * 1000, "cooldown should be <= 24 hours");
});

test("checkFallbackError routes API-key 429 'try again tomorrow' through resilience cooldown", () => {
  const result = checkFallbackError(
    429,
    "Please try again tomorrow",
    0,
    null,
    "openai",
    null,
    makeProfile()
  );
  assert.equal(result.shouldFallback, true);
  assert.equal(result.dailyQuotaExhausted, undefined);
  assert.equal(result.cooldownMs, 125);
});

test("#6638: checkFallbackError routes API-key 429 'daily quota' text as quota_exhausted", () => {
  const result = checkFallbackError(
    429,
    "You have exceeded your daily quota",
    0,
    null,
    "openai",
    null,
    makeProfile()
  );
  assert.equal(result.shouldFallback, true);
  assert.equal(result.dailyQuotaExhausted, true);
  assert.equal(result.reason, RateLimitReason.QUOTA_EXHAUSTED);
});

test("checkFallbackError preserves OAuth 429 daily quota semantics", () => {
  const result = checkFallbackError(
    429,
    "You have exceeded your daily quota",
    0,
    null,
    "codex",
    null,
    makeProfile()
  );

  assert.equal(result.shouldFallback, true);
  assert.equal(result.reason, RateLimitReason.QUOTA_EXHAUSTED);
  assert.equal(result.dailyQuotaExhausted, true);
  assert.ok(result.cooldownMs > 0);
});

// ModelScope daily quota lockout tests (commit 0456a1f5)

test("checkFallbackError classifies hour quota errors correctly", () => {
  // For OAuth providers (e.g., codex), hour quota errors should be QUOTA_EXHAUSTED
  const result1 = checkFallbackError(
    429,
    "Coding Plan hour quota has been exceeded",
    0,
    null,
    "codex"
  );
  assert.equal(result1.shouldFallback, true);
  assert.equal(result1.reason, RateLimitReason.QUOTA_EXHAUSTED);

  const result2 = checkFallbackError(429, "hour quota exceeded", 0, null, "codex");
  assert.equal(result2.shouldFallback, true);
  assert.equal(result2.reason, RateLimitReason.QUOTA_EXHAUSTED);

  const result3 = checkFallbackError(429, "Your hour quota is exceeded", 0, null, "codex");
  assert.equal(result3.shouldFallback, true);
  assert.equal(result3.reason, RateLimitReason.QUOTA_EXHAUSTED);

  const result4 = checkFallbackError(429, "hour quota depleted", 0, null, "codex");
  assert.equal(result4.shouldFallback, true);
  assert.equal(result4.reason, RateLimitReason.QUOTA_EXHAUSTED);

  // For API-key providers with 402 status, hour quota errors should be QUOTA_EXHAUSTED
  const result5 = checkFallbackError(402, "hour quota has been exceeded", 0, null, "openai");
  assert.equal(result5.shouldFallback, true);
  assert.equal(result5.reason, RateLimitReason.QUOTA_EXHAUSTED);

  const result6 = checkFallbackError(
    403,
    "Coding Plan hour quota has been exceeded",
    0,
    null,
    "openai"
  );
  assert.equal(result6.shouldFallback, true);
  assert.equal(result6.reason, RateLimitReason.QUOTA_EXHAUSTED);
});

// Test for classifyErrorText function with hour quota
test("classifyErrorText handles hour quota messages", () => {
  const { classifyErrorText } = accountFallback;

  assert.equal(
    classifyErrorText("Coding Plan hour quota has been exceeded"),
    RateLimitReason.QUOTA_EXHAUSTED
  );
  assert.equal(classifyErrorText("hour quota exceeded"), RateLimitReason.QUOTA_EXHAUSTED);
  assert.equal(classifyErrorText("Your hour quota is exceeded"), RateLimitReason.QUOTA_EXHAUSTED);
  assert.equal(classifyErrorText("hour quota has been exceeded"), RateLimitReason.QUOTA_EXHAUSTED);
  assert.equal(classifyErrorText("quota has been exceeded"), RateLimitReason.QUOTA_EXHAUSTED);
});

// ─── Model Access Denied (structured error codes + regex fallback) ─────

test("checkFallbackError detects model access denied via structured error code (OpenAI)", () => {
  const result = checkFallbackError(
    400,
    "The model `gpt-5` does not exist",
    0,
    null,
    "openai",
    null,
    null,
    { code: "model_not_found", type: null }
  );
  assert.equal(result.shouldFallback, true);
  assert.equal(result.cooldownMs, 0);
  assert.equal(result.reason, RateLimitReason.MODEL_CAPACITY);
});

test("checkFallbackError detects model access denied via structured error type (Anthropic not_found_error)", () => {
  const result = checkFallbackError(
    400,
    "model: claude-sonnet-4-7-20260515",
    0,
    null,
    "anthropic",
    null,
    null,
    { code: null, type: "not_found_error" }
  );
  assert.equal(result.shouldFallback, true);
  assert.equal(result.cooldownMs, 0);
  assert.equal(result.reason, RateLimitReason.MODEL_CAPACITY);
});

test("checkFallbackError detects model access denied via structured error type (Anthropic permission_error) when the message confirms the model", () => {
  const result = checkFallbackError(
    400,
    "you do not have access to the requested model",
    0,
    null,
    "anthropic",
    null,
    null,
    { code: null, type: "permission_error" }
  );
  assert.equal(result.shouldFallback, true);
  assert.equal(result.cooldownMs, 0);
  assert.equal(result.reason, RateLimitReason.MODEL_CAPACITY);
});

test("checkFallbackError does NOT fallback on a permission_error that is a key/feature scope issue (not model access)", () => {
  // permission_error is ambiguous on Anthropic — also raised for API-key scope,
  // org restrictions and feature gating. Without a model-related message it must
  // surface the real error instead of silently exhausting every combo target.
  const result = checkFallbackError(
    400,
    "Your API key does not have permission to use the Message Batches API",
    0,
    null,
    "anthropic",
    null,
    null,
    { code: null, type: "permission_error" }
  );
  assert.equal(result.shouldFallback, false);
});

test("checkFallbackError detects model access denied via regex fallback (invalid model)", () => {
  const result = checkFallbackError(
    400,
    "Invalid model: gpt-5-turbo",
    0,
    null,
    "some-provider",
    null,
    null
  );
  assert.equal(result.shouldFallback, true);
  assert.equal(result.cooldownMs, 0);
  assert.equal(result.reason, RateLimitReason.MODEL_CAPACITY);
});

test("checkFallbackError does NOT fallback on generic 400 without model access denied", () => {
  const result = checkFallbackError(400, "bad request payload", 0, null, "openai", null, null);
  assert.equal(result.shouldFallback, false);
});

test("checkFallbackError ignores structured error with unrelated code on 400", () => {
  const result = checkFallbackError(400, "something went wrong", 0, null, "openai", null, null, {
    code: "invalid_api_key",
    type: null,
  });
  // "invalid_api_key" is not in MODEL_ACCESS_DENIED_CODES,
  // no MODEL_ACCESS_DENIED_PATTERNS match either → shouldFallback: false
  assert.equal(result.shouldFallback, false);
});

// ─── Gemini RPM 429 Classification (CREDITS_EXHAUSTED_SIGNALS fix) ─────


test("G-02: X-Omni-Fallback-Hint connection_cooldown on 503 returns 5s cooldown + skipProviderBreaker", () => {
  const headers = new Headers({ "X-Omni-Fallback-Hint": "connection_cooldown" });
  const result = checkFallbackError(
    503,
    "9router is not running (state: stopped)",
    0,
    null,
    "9router",
    headers
  );
  assert.equal(result.shouldFallback, true);
  assert.equal(result.cooldownMs, 5_000);
  assert.equal(result.skipProviderBreaker, true);
  assert.equal(result.newBackoffLevel, 0);
  assert.equal(result.reason, "service_not_running");
});

test("G-02: X-Omni-Fallback-Hint connection_cooldown header lookup is case-insensitive (lowercase header key)", () => {
  // Headers object normalises keys to lowercase — test the plain-object path
  const headers: Record<string, string> = { "x-omni-fallback-hint": "connection_cooldown" };
  const result = checkFallbackError(
    503,
    "9router is not running (state: stopped)",
    0,
    null,
    "9router",
    headers
  );
  assert.equal(result.skipProviderBreaker, true);
  assert.equal(result.cooldownMs, 5_000);
});

test("G-02: hint header is ignored for non-503 status codes", () => {
  const headers = new Headers({ "X-Omni-Fallback-Hint": "connection_cooldown" });
  // 502 should NOT trigger the hint path even if the header is present
  const result = checkFallbackError(502, "bad gateway", 0, null, "9router", headers);
  assert.equal(result.skipProviderBreaker, undefined); // normal path, no skip flag
});

test("G-02: 503 without hint header follows normal circuit-breaker path", () => {
  // A plain 503 from a real upstream must still feed the circuit breaker
  const result = checkFallbackError(503, "service unavailable", 0, null, "openai", null);
  assert.equal(result.skipProviderBreaker, undefined);
  assert.ok(result.cooldownMs > 0);
});


// Casos de `tests/unit/gemini-deprecated-model-lockout.test.ts`: un modelo retirado se bloquea un día.
const GEMINI_DEPRECATED_404 =
  '[404]: This model models/gemini-2.5-flash is no longer available to new users. '
  + 'Please update your code to use models/gemini-3.6-flash for the latest features and improvements.'
const END_OF_LIFE_410 =
  '[410]: {"type":"about:blank","title":"Gone","status":410,"detail":"The model '
  + "'minimaxai/minimax-m2.7' has reached its end of life on 2026-07-27T00:00:00Z and is no longer available.\"}\n"

test('checkFallbackError locks a deprecated Gemini model for 24h, not a short backoff', () => {
  const result = checkFallbackError(404, GEMINI_DEPRECATED_404, 0, 'gemini-2.5-flash', 'gemini')
  assert.equal(result.shouldFallback, true)
  assert.equal(result.reason, 'not_found')
  assert.equal(result.cooldownMs, 24 * 60 * 60 * 1000)
  assert.equal(result.quotaResetHintMs, 24 * 60 * 60 * 1000)
})

test('checkFallbackError locks an end-of-life model (410) for 24h too', () => {
  const result = checkFallbackError(410, END_OF_LIFE_410, 0, 'minimaxai/minimax-m2.7', 'nvidia')
  assert.equal(result.shouldFallback, true)
  assert.equal(result.reason, 'not_found')
  assert.equal(result.cooldownMs, 24 * 60 * 60 * 1000)
})

test('a generic 404 (not a deprecation message) still falls through to the short transient cooldown', () => {
  const result = checkFallbackError(404, '[404]: Model not found, inaccessible, and/or not deployed', 0, 'some-model', 'openrouter')
  assert.equal(result.reason, 'unknown')
  assert.notEqual(result.cooldownMs, 24 * 60 * 60 * 1000)
})

// Casos de `tests/unit/account-fallback-route-restriction-403.test.ts`: una clave válida sin acceso a una ruta.
test('route-restriction 403 does NOT cool down the connection', () => {
  const result = checkFallbackError(403, 'Fire Pass API keys are not authorized for this route.', 0, null, 'fireworks')
  assert.equal(result.shouldFallback, false)
  assert.equal(result.cooldownMs, 0)
})

test('a genuine api-key 403 still triggers fallback (no over-broadening)', () => {
  const result = checkFallbackError(403, 'invalid api key', 0, null, 'fireworks')
  assert.equal(result.shouldFallback, true)
})

test('case-insensitive match on the route-restriction phrase', () => {
  const result = checkFallbackError(403, 'ERROR: Not Authorized For This Route', 0, null, 'fireworks')
  assert.equal(result.shouldFallback, false)
})

// Casos de `tests/unit/rate-limit-enhanced.test.ts`: cada fallo reintentable sube un nivel de retroceso.
test('checkFallbackError: backward compatible without model param', () => {
  const result = checkFallbackError(429, 'Rate limit hit', 0)
  assert.equal(result.shouldFallback, true)
  assert.ok(result.cooldownMs > 0)
  assert.equal(result.newBackoffLevel, 1)
  assert.equal(result.reason, RateLimitReason.RATE_LIMIT_EXCEEDED)
})

test('checkFallbackError: transient errors now apply exponential backoff', () => {
  const result = checkFallbackError(502, '', 5)
  assert.equal(result.shouldFallback, true)
  assert.equal(result.newBackoffLevel, 6)
  assert.ok(result.cooldownMs > 0)
})

// Casos propios: las dos ramas que ningún caso de la referencia distingue.
test('un 403 de clave de API enfría con retroceso y culpa a la credencial', () => {
  const result = checkFallbackError(403, 'forbidden', 0, null, 'openai')
  assert.equal(result.shouldFallback, true)
  assert.equal(result.reason, RateLimitReason.AUTH_ERROR)
  assert.ok(result.cooldownMs > 0)
})

test('un 400 que culpa a la credencial no pasa por acceso al modelo aunque nombre el modelo', () => {
  const result = checkFallbackError(400, 'Invalid API key: access denied for model gpt-4o')
  assert.deepEqual(result, { shouldFallback: false, cooldownMs: 0, reason: RateLimitReason.UNKNOWN })
})

// Casos de `tests/unit/cliproxyapi-unknown-provider-400-12800.test.ts`: el 400 del proveedor que no sirve el modelo.
test("isProviderModelUnsupported400 recognizes CLIProxyAPI 'unknown provider for model X'", () => {
  assert.equal(isProviderModelUnsupported400(400, 'unknown provider for model Qwen/Qwen3.6-27B-TEE'), true)
})

test('isProviderModelUnsupported400 does not match a genuine auth/credential error', () => {
  assert.equal(isProviderModelUnsupported400(400, 'invalid api key for model Qwen/Qwen3.6-27B-TEE'), false)
})

// Casos propios: el estado, y un texto que casa a la vez con credencial y con modelo.
test('isProviderModelUnsupported400 sólo mira un 400', () => {
  assert.equal(isProviderModelUnsupported400(404, 'unknown provider for model Qwen/Qwen3.6-27B-TEE'), false)
})

test('isProviderModelUnsupported400 deja pasar una credencial mala aunque el texto diga que el modelo no existe', () => {
  assert.equal(isProviderModelUnsupported400(400, 'Invalid API key: model gpt-x does not exist'), false)
})

test('isProviderModelUnsupported400 no cuenta el permiso de acceso, que puede ser de la cuenta', () => {
  assert.equal(isProviderModelUnsupported400(400, 'You do not have permission to access this model'), false)
})
