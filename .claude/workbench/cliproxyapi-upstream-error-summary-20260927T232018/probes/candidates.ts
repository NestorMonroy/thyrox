// Imprime el resumen de cada candidato con el módulo de UPSTREAM_ERROR_SUMMARY_MODULE.
const { extractUpstreamErrorSummary } = (await import(process.env.UPSTREAM_ERROR_SUMMARY_MODULE!)) as typeof import('../../../../src/packages/provider/src/proxy/upstreamErrorSummary.ts')
const candidates = [
  '{"error":{"code":"rate_limit","message":"Too many requests"}}',
  'HTTP 429: {"error":{"message":"slow down"}}',
  '{"code":"bad_request","message":"oops"}',
  'GET https://api.test/v1?sig=abc123&x=1 failed',
  'GET https://api.test/v1?x=1&access_token=abc123 failed',
  'upload failed: could not read /srv/app/config.json',
  'loaded config.json from/srv/app/secrets.env ok',
  'upstream said sk-abcdef123456 is revoked',
  'provider rejected sk-abcdefghijkl',
  'invalid api key abc123xyz',
  'expired token abc.def.ghi',
  'x /etc/passwd leaked',
  'denied /etc/passwd',
  'GET https://api.test/v1?sig=a|b c',
  'read `/etc/app.conf failed',
]
for (const c of candidates) console.log(JSON.stringify(extractUpstreamErrorSummary(c)))
