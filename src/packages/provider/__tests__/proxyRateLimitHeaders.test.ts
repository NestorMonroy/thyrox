/**
 * Lo que el proxy aprende de un límite de tasa sin tener que alcanzarlo: el
 * reinicio de las cabeceras y el tope que un 429 declara en prosa. Casos de
 * OmniRoute (a58000c7): `tests/unit/ratelimitmanager-headers-split.test.ts`
 * (sus secciones 1 y 3; la 2 prueba la API del gestor completo) y los casos
 * puros de `tests/unit/rate-limit-learned-cap-13594.test.ts`.
 */
import { test } from 'bun:test'
import assert from 'node:assert/strict'
// Rutas sustituibles para los controles de anulación en paralelo (`src/verify/annul_parallel.sh`).
const { STANDARD_HEADERS, ANTHROPIC_HEADERS, parseResetTime, toPlainHeaders } = (await import(
  process.env.RATE_LIMIT_HEADERS_MODULE ?? '../src/proxy/resilience/rateLimitHeaders.ts'
)) as typeof import('../src/proxy/resilience/rateLimitHeaders.ts')
const { parseRequestCapFromBody, isValidRequestCap } = (await import(
  process.env.REQUEST_CAP_MODULE ?? '../src/proxy/resilience/requestCap.ts'
)) as typeof import('../src/proxy/resilience/requestCap.ts')

test("rateLimitManager/headers — parseResetTime: nullish → null", () => {
  assert.equal(parseResetTime(""), null);
  assert.equal(parseResetTime(null), null);
  assert.equal(parseResetTime("not-a-duration"), null);
});

test("rateLimitManager/headers — parseResetTime: duration strings → ms", () => {
  assert.equal(parseResetTime("30s"), 30_000);
  assert.equal(parseResetTime("500ms"), 500);
  assert.equal(parseResetTime("1m30s"), 90_000);
});

test("rateLimitManager/headers — parseResetTime: bare number → seconds*1000", () => {
  assert.equal(parseResetTime("5"), 5_000);
});

// anthropic-ratelimit-*-reset carries an RFC 3339 timestamp. parseFloat read its
// leading year, so a reset 30s away came back as 2026 * 1000 ms (~34 minutes).
test("rateLimitManager/headers — parseResetTime: RFC 3339 timestamp → ms until then", () => {
  const inThirtySeconds = new Date(Date.now() + 30_000);
  for (const value of [
    inThirtySeconds.toISOString(),
    inThirtySeconds.toISOString().replace(/\.\d{3}Z$/, "Z"),
  ]) {
    const ms = parseResetTime(value) ?? -1;
    assert.ok(ms > 28_000 && ms <= 30_000, `${value} → ${ms}`);
  }
  assert.equal(parseResetTime(new Date(Date.now() - 5_000).toISOString()), 0);
});

test("rateLimitManager/headers — parseResetTime: fractional seconds in a duration", () => {
  assert.equal(parseResetTime("2m59.56s"), 179_560);
  assert.equal(parseResetTime("1h2m3.5s"), 3_723_500);
  assert.equal(parseResetTime("7.66s"), 7_660);
});

test("rateLimitManager/headers — parseResetTime: Unix timestamp → ms until then", () => {
  const ms = parseResetTime(String(Math.floor(Date.now() / 1000) + 60)) ?? -1;
  assert.ok(ms > 58_000 && ms <= 60_000, String(ms));
});

test("rateLimitManager/headers — toPlainHeaders normalizes to a string record", () => {
  const out = toPlainHeaders({ "X-RateLimit-Remaining": "10", "Content-Type": "application/json" });
  assert.equal(typeof out, "object");
  assert.ok(out !== null && !Array.isArray(out));
  // every value is a string
  for (const v of Object.values(out)) assert.equal(typeof v, "string");
});

test("rateLimitManager/headers — STANDARD/ANTHROPIC header maps are objects with string fields", () => {
  assert.equal(typeof STANDARD_HEADERS, "object");
  assert.equal(typeof ANTHROPIC_HEADERS, "object");
  assert.equal(typeof STANDARD_HEADERS.overLimit, "string");
});



const TOKENROUTER_429 = JSON.stringify({
  error: {
    message: "You have reached the request limit: Maximum 5 requests within 1 minutes",
    type: "rate_limit_error",
  },
});

test("parseRequestCapFromBody reads hard request caps from 429 bodies", () => {
  assert.deepEqual(parseRequestCapFromBody(TOKENROUTER_429), { requests: 5, windowMs: 60_000 });
  assert.deepEqual(parseRequestCapFromBody(JSON.parse(TOKENROUTER_429)), {
    requests: 5,
    windowMs: 60_000,
  });
  assert.deepEqual(parseRequestCapFromBody("429: Maximum 100 requests within 30 seconds"), {
    requests: 100,
    windowMs: 30_000,
  });
  assert.deepEqual(parseRequestCapFromBody("Rate limit exceeded: 60 requests per minute"), {
    requests: 60,
    windowMs: 60_000,
  });
  assert.deepEqual(parseRequestCapFromBody("You hit the limit of 10 requests per 2 minutes"), {
    requests: 10,
    windowMs: 120_000,
  });
  assert.deepEqual(parseRequestCapFromBody("Rate limit: 20 RPM"), {
    requests: 20,
    windowMs: 60_000,
  });
  assert.deepEqual(parseRequestCapFromBody("Rate limit: 20 rpm, current usage: 4 rpm"), {
    requests: 20,
    windowMs: 60_000,
  });
  assert.deepEqual(parseRequestCapFromBody("quota: 1000 requests per hour"), {
    requests: 1000,
    windowMs: 3_600_000,
  });
});

test("parseRequestCapFromBody ignores bodies without a request cap", () => {
  assert.equal(parseRequestCapFromBody("Rate limit exceeded. Please retry after 20s."), null);
  assert.equal(parseRequestCapFromBody(""), null);
  assert.equal(parseRequestCapFromBody(null), null);
  assert.equal(parseRequestCapFromBody({ error: { message: "overloaded" } }), null);
  assert.equal(parseRequestCapFromBody("Maximum 0 requests within 1 minutes"), null);
  assert.equal(parseRequestCapFromBody("processed 5 requests in 3 days"), null);
  // usage statements are not ceilings
  assert.equal(parseRequestCapFromBody("You made 120 requests in 1 minute; the limit is 60"), null);
  assert.equal(parseRequestCapFromBody("Your 3 requests in 10 seconds exceeded the plan"), null);
  assert.equal(
    parseRequestCapFromBody("Rate limit exceeded: you sent 120 requests in 1 minute"),
    null
  );
  assert.equal(parseRequestCapFromBody("Generate: 7 requests per minute"), null);
  // the rpm shorthand needs a cap word before the figure too, or a low usage
  // figure pins the connection; a cap word after it is deliberately not enough
  assert.equal(parseRequestCapFromBody("Current usage: 4 rpm"), null);
  assert.equal(parseRequestCapFromBody("Rate limit hit: you have made 3 rpm"), null);
  assert.equal(parseRequestCapFromBody("Throttled: 20 RPM exceeded"), null);
});

test("isValidRequestCap bounds what the restore path accepts", () => {
  assert.equal(isValidRequestCap({ requests: 5, windowMs: 60_000 }), true);
  assert.equal(isValidRequestCap({ requests: 0, windowMs: 60_000 }), false);
  assert.equal(isValidRequestCap({ requests: 2.5, windowMs: 60_000 }), false);
  assert.equal(isValidRequestCap({ requests: 5, windowMs: 1e12 }), false);
  assert.equal(isValidRequestCap({ requests: 5, windowMs: 10 }), false);
  assert.equal(isValidRequestCap({ requests: 5, windowMs: Number.NaN }), false);
});

test('toPlainHeaders lleva a minúscula los nombres de un Map', () => {
  assert.deepEqual(toPlainHeaders(new Map([['X-RateLimit-Limit-Requests', '5']])), { 'x-ratelimit-limit-requests': '5' })
})
