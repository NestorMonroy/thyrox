/**
 * El resumen saneado del último error del upstream — casos de CLIProxyAPI
 * `sdk/cliproxy/auth/conductor_selection_cooldown_test.go`
 * (TestExtractUpstreamErrorSummary_AuthPackageDirectSanitization) y
 * `sdk/api/handlers/handlers_error_response_test.go`
 * (TestExtractUpstreamErrorSummary_SanitizationAndTruncation), convertidos
 * por `port-tables.sh` del banco.
 */
import { describe, expect, test } from 'bun:test'
// Ruta sustituible para los controles de anulación en paralelo (`src/verify/annul_parallel.sh`).
const { extractUpstreamErrorSummary } = (await import(
  process.env.UPSTREAM_ERROR_SUMMARY_MODULE ?? '../src/proxy/upstreamErrorSummary.ts'
)) as typeof import('../src/proxy/upstreamErrorSummary.ts')

type Case = { name: string; input: string; wantMask: string; wantExact?: string; forbiddenRaw?: string }

function check(cases: Case[]) {
  for (const tc of cases) {
    test(tc.name, () => {
      const got = extractUpstreamErrorSummary(tc.input)
      expect(got).toContain(tc.wantMask)
      if (tc.wantExact) expect(got).toBe(tc.wantExact)
      if (tc.forbiddenRaw) expect(got).not.toContain(tc.forbiddenRaw)
      expect([...got].length).toBeLessThanOrEqual(256)
    })
  }
}

describe('paquete auth', () => check([
		{
			name:         "authorization header with bearer redacted",
			input:        "authorization: Bearer abcdef+TOPSECRET==",
			wantMask:     "Authorization: [REDACTED]",
			forbiddenRaw: "TOPSECRET",
		},
		{
			name:         "authorization header with basic redacted",
			input:        "authorization: Basic my-secret-basic-auth",
			wantMask:     "Authorization: [REDACTED]",
			forbiddenRaw: "my-secret-basic-auth",
		},
		{
			name:         "authorization header with custom scheme redacted",
			input:        "authorization: ApiKey SUPERSECRET",
			wantMask:     "Authorization: [REDACTED]",
			forbiddenRaw: "SUPERSECRET",
		},
		{
			name:         "authorization header with comma separated parameters redacted",
			input:        "Authorization: ApiKey first,SECONDSECRET",
			wantMask:     "Authorization: [REDACTED]",
			forbiddenRaw: "SECONDSECRET",
		},
		{
			name:         "authorization header with digest parameters redacted",
			input:        String.raw`Authorization: Digest username="Mufasa", realm="myrealm", nonce="NONCE", uri="/dir/index.html", response="SIG"`,
			wantMask:     "Authorization: [REDACTED]",
			forbiddenRaw: "NONCE",
		},
		{
			name:         "double quoted multi word password redacted",
			input:        String.raw`password="correct horse battery staple"`,
			wantMask:     String.raw`[REDACTED]`,
			forbiddenRaw: "correct horse battery staple",
		},
		{
			name:         "double quoted comma containing api key redacted",
			input:        String.raw`api_key="secret,value"`,
			wantMask:     String.raw`[REDACTED]`,
			forbiddenRaw: "secret,value",
		},
		{
			name:         "sk key redacted",
			input:        "invalid key sk-live-secret-key-123456",
			wantMask:     "[REDACTED]",
			forbiddenRaw: "live-secret-key",
		},
		{
			name:         "user path redacted",
			input:        "open /Users/alice/configs/auth.json: permission denied",
			wantMask:     "[REDACTED_PATH]",
			forbiddenRaw: "alice",
		},
		{
			name:         "json message containing invalid token secret redacted",
			input:        String.raw`{"code":"oops","message":"invalid token SUPERSECRET"}`,
			wantMask:     "[REDACTED]",
			forbiddenRaw: "SUPERSECRET",
		},
		{
			name:         "single quoted key kv redacted",
			input:        String.raw`'api_key'=SUPERSECRET`,
			wantMask:     "[REDACTED]",
			forbiddenRaw: "SUPERSECRET",
		},
		{
			name:         "authorization equals bearer redacted",
			input:        String.raw`authorization=Bearer SUPERSECRET`,
			wantMask:     "[REDACTED]",
			forbiddenRaw: "SUPERSECRET",
		},
		{
			name:         "unstructured invalid api key redacted",
			input:        "invalid API key SUPERSECRET",
			wantMask:     "[REDACTED]",
			forbiddenRaw: "SUPERSECRET",
		},
		{
			name:         "unstructured invalid access token redacted",
			input:        "invalid access token SUPERSECRET",
			wantMask:     "[REDACTED]",
			forbiddenRaw: "SUPERSECRET",
		},
		{
			name:         "unstructured socks5 proxy auth redacted",
			input:        "proxyconnect tcp: socks5://alice:PASSSECRET@proxy.internal:1080",
			wantMask:     "[REDACTED_AUTH]",
			forbiddenRaw: "PASSSECRET",
		},
		{
			name:         "unstructured signature url query redacted",
			input:        "request failed: https://example.com?sig=SUPERSECRET",
			wantMask:     "[REDACTED]",
			forbiddenRaw: "SUPERSECRET",
		},
		{
			name:         "json message containing invalid token secret with escaped quotes redacted",
			input:        String.raw`{"code":"oops","message":"invalid token \"SUPERSECRET\""}`,
			wantMask:     "[REDACTED]",
			forbiddenRaw: "SUPERSECRET",
		},
		{
			name:         "json message containing password with escaped quotes redacted",
			input:        String.raw`{"code":"oops","message":"password=\"abc\\\"SUPERSECRET\""}`,
			wantMask:     "[REDACTED]",
			forbiddenRaw: "SUPERSECRET",
		},
		{
			name:         "natural language api key redacted",
			input:        "upstream rejected API key: SUPERSECRET",
			wantMask:     "[REDACTED]",
			forbiddenRaw: "SUPERSECRET",
		},
		{
			name:         "natural language password is redacted",
			input:        "password is SUPERSECRET",
			wantMask:     "[REDACTED]",
			forbiddenRaw: "SUPERSECRET",
		},
		{
			name:         "mnt unix path redacted",
			input:        "open /mnt/secrets/alice: permission denied",
			wantMask:     "[REDACTED_PATH]",
			forbiddenRaw: "alice",
		},
		{
			name:         "windows path with spaces redacted",
			input:        String.raw`open C:\Users\Alice Smith\secret.txt: permission denied`,
			wantMask:     "[REDACTED_PATH]",
			forbiddenRaw: "Alice Smith",
		},
		{
			name:         "cookie header redacted",
			input:        "Cookie: sessionid=COOKIESECRET",
			wantMask:     "Cookie: [REDACTED]",
			forbiddenRaw: "COOKIESECRET",
		},
		{
			name:         "set-cookie header redacted",
			input:        "Set-Cookie: session=SETCOOKIESECRET",
			wantMask:     "Cookie: [REDACTED]",
			forbiddenRaw: "SETCOOKIESECRET",
		},
		{
			name:         "private key kv redacted",
			input:        "private_key=PRIVATEKEYSECRET",
			wantMask:     "[REDACTED]",
			forbiddenRaw: "PRIVATEKEYSECRET",
		},
		{
			name:         "uri userinfo redacted",
			input:        "https://user:PASSSECRET@example.com/api",
			wantMask:     "https://[REDACTED_AUTH]@",
			forbiddenRaw: "PASSSECRET",
		},
		{
			name:         "workspace unix path redacted",
			input:        "/workspace/tenants/alice/oauth-cache",
			wantMask:     "[REDACTED_PATH]",
			forbiddenRaw: "alice",
		},
		{
			name:         "opt unix path redacted",
			input:        String.raw`open /opt/cli-proxy/auth/alice.json: failed`,
			wantMask:     "[REDACTED_PATH]",
			forbiddenRaw: "alice",
		},
		{
			name:         "windows path redacted",
			input:        String.raw`open C:\Users\alice\secret.txt: failed`,
			wantMask:     "[REDACTED_PATH]",
			forbiddenRaw: "alice",
		},
		{
			name:         "kv secret redacted",
			input:        "failed with api_key=secret-value-123 and token: my-secret-token",
			wantMask:     "[REDACTED]",
			forbiddenRaw: "secret-value-123",
		},
		{
			name:         "incorrect api key provided redacted",
			input:        "Incorrect API key provided: SUPERSECRET",
			wantMask:     "[REDACTED]",
			forbiddenRaw: "SUPERSECRET",
		},
		{
			name:         "plural credentials redacted",
			input:        "credentials: SUPERSECRET",
			wantMask:     "[REDACTED]",
			forbiddenRaw: "SUPERSECRET",
		},
		{
			name:         "aws secret access key redacted",
			input:        "AWS_SECRET_ACCESS_KEY=SUPERSECRET",
			wantMask:     "[REDACTED]",
			forbiddenRaw: "SUPERSECRET",
		},
		{
			name:         "protocol relative uri userinfo redacted",
			input:        "//alice:PASSSECRET@example.com/api",
			wantMask:     "[REDACTED_AUTH]",
			forbiddenRaw: "PASSSECRET",
		},
		{
			name:         "run secrets unix path redacted",
			input:        "open /run/secrets/alice: permission denied",
			wantMask:     "[REDACTED_PATH]",
			forbiddenRaw: "alice",
		},
		{
			name:         "custom tenant unix path redacted",
			input:        "open /custom/tenant/alice: permission denied",
			wantMask:     "[REDACTED_PATH]",
			forbiddenRaw: "alice",
		},
		{
			name:         "windows unc path redacted",
			input:        String.raw`open \\server\share\alice\secret.txt: permission denied`,
			wantMask:     "[REDACTED_PATH]",
			forbiddenRaw: "alice",
		},
		{
			name:         "service key kv redacted",
			input:        "SERVICE_KEY=SUPERSECRET",
			wantMask:     "[REDACTED]",
			forbiddenRaw: "SUPERSECRET",
		},
		{
			name:         "openai key kv redacted",
			input:        "OPENAI_KEY=SUPERSECRET",
			wantMask:     "[REDACTED]",
			forbiddenRaw: "SUPERSECRET",
		},
		{
			name:         "x-key query param redacted",
			input:        "https://example.com?x-key=SUPERSECRET",
			wantMask:     "[REDACTED]",
			forbiddenRaw: "SUPERSECRET",
		},
		{
			name:         "unix path with spaces redacted",
			input:        "open /custom/tenant/Alice Smith/secret.txt: denied",
			wantMask:     "[REDACTED_PATH]",
			wantExact:    "open [REDACTED_PATH]: denied",
			forbiddenRaw: "Smith",
		},
		{
			name:         "unix path with unicode redacted",
			input:        "open /custom/租户/alice: denied",
			wantMask:     "[REDACTED_PATH]",
			forbiddenRaw: "alice",
		},
		{
			name:         "single segment unix path redacted",
			input:        "open /alice: permission denied",
			wantMask:     "[REDACTED_PATH]",
			forbiddenRaw: "alice",
		},
		{
			name:         "stat single segment unicode path redacted",
			input:        "stat /客户: no such file or directory",
			wantMask:     "[REDACTED_PATH]",
			forbiddenRaw: "客户",
		},
		{
			name:         "quoted path with colon and secret redacted",
			input:        String.raw`open "/tmp/customer:TOPSECRET/creds": denied`,
			wantMask:     "[REDACTED_PATH]",
			forbiddenRaw: "TOPSECRET",
		},
		{
			name:         "unquoted multi-word password redacted",
			input:        "password = correct horse battery staple",
			wantMask:     "[REDACTED]",
			forbiddenRaw: "battery staple",
		},
		{
			name:         "unquoted multi-word credentials redacted",
			input:        "credentials: alice secret",
			wantMask:     "[REDACTED]",
			forbiddenRaw: "alice secret",
		},
		{
			name:         "quoted path containing password assignment redacted",
			input:        String.raw`open "/Users/alice/password=foo/bar": denied`,
			wantMask:     "[REDACTED_PATH]",
			forbiddenRaw: "alice",
		},
		{
			name:         "unquoted path with colon and secret redacted",
			input:        "open /tmp/customer:TOPSECRET/creds: denied",
			wantMask:     "[REDACTED_PATH]",
			forbiddenRaw: "TOPSECRET",
		},
		{
			name:         "unquoted path with colon in leaf component redacted",
			input:        "open /tmp/customer:TOPSECRET: denied",
			wantMask:     "[REDACTED_PATH]",
			wantExact:    "open [REDACTED_PATH]: denied",
			forbiddenRaw: "TOPSECRET",
		},
		{
			name:         "multiple unquoted unix paths redacted",
			input:        "rename /Users/alice/source /Users/bob/private-data: denied",
			wantMask:     "[REDACTED_PATH]",
			wantExact:    "rename [REDACTED_PATH] [REDACTED_PATH]: denied",
			forbiddenRaw: "bob",
		},
		{
			name:         "non-terminal space path in multiple unix paths redacted",
			input:        "rename /Users/Alice Smith/source /Users/bob/private-data: denied",
			wantMask:     "[REDACTED_PATH]",
			wantExact:    "rename [REDACTED_PATH] [REDACTED_PATH]: denied",
			forbiddenRaw: "Alice Smith",
		},
		{
			name:         "leaf filename with space redacted",
			input:        "open /tmp/Alice Smith.txt: denied",
			wantMask:     "[REDACTED_PATH]",
			wantExact:    "open [REDACTED_PATH]: denied",
			forbiddenRaw: "Alice Smith",
		},
		{
			name:         "multiple paths with leaf filename spaces redacted",
			input:        "rename /tmp/Alice Smith /tmp/Bob Jones: denied",
			wantMask:     "[REDACTED_PATH]",
			wantExact:    "rename [REDACTED_PATH] [REDACTED_PATH]: denied",
			forbiddenRaw: "Alice Smith",
		},
		{
			name:         "unquoted path with colon space in leaf component redacted",
			input:        "open /tmp/customer: TOPSECRET: denied",
			wantMask:     "[REDACTED_PATH]",
			wantExact:    "open [REDACTED_PATH]: denied",
			forbiddenRaw: "TOPSECRET",
		},
		{
			name:         "parenthesized unquoted path redacted and parens preserved",
			input:        "open (/tmp/customer): denied",
			wantMask:     "[REDACTED_PATH]",
			wantExact:    "open ([REDACTED_PATH]): denied",
			forbiddenRaw: "customer",
		},
		{
			name:         "braced unquoted path redacted and braces preserved",
			input:        "open {/tmp/customer}: denied",
			wantMask:     "[REDACTED_PATH]",
			wantExact:    "open {[REDACTED_PATH]}: denied",
			forbiddenRaw: "customer",
		},
		{
			name:         "nested error text preserved after path",
			input:        "open /tmp/config: permission denied: retry later",
			wantMask:     "[REDACTED_PATH]",
			wantExact:    "open [REDACTED_PATH]: permission denied: retry later",
			forbiddenRaw: "config",
		},
		{
			name:         "nested known error text preserved after path",
			input:        "open /tmp/config: permission denied: access denied",
			wantMask:     "[REDACTED_PATH]",
			wantExact:    "open [REDACTED_PATH]: permission denied: access denied",
			forbiddenRaw: "config",
		},
		{
			name:         "uppercase connector between paths preserved",
			input:        "copy /tmp/a   TO\t/tmp/b: denied",
			wantMask:     "[REDACTED_PATH]",
			wantExact:    "copy [REDACTED_PATH]   TO\t[REDACTED_PATH]: denied",
			forbiddenRaw: "",
		},
		{
			name:         "long connector string bounded to 256 runes",
			input:        ("a").repeat(300) + " to /tmp/x: denied",
			wantMask:     "...",
			forbiddenRaw: "x",
		},
]))

describe('manejadores', () => check([
		{
			name:         "authorization header with bearer and topsecret redacted",
			input:        "authorization: Bearer abcdef+TOPSECRET==",
			wantMask:     "Authorization: [REDACTED]",
			forbiddenRaw: "TOPSECRET",
		},
		{
			name:         "authorization header with custom scheme redacted",
			input:        "authorization: ApiKey SUPERSECRET",
			wantMask:     "Authorization: [REDACTED]",
			forbiddenRaw: "SUPERSECRET",
		},
		{
			name:         "authorization header with comma separated parameters redacted",
			input:        "Authorization: ApiKey first,SECONDSECRET",
			wantMask:     "Authorization: [REDACTED]",
			forbiddenRaw: "SECONDSECRET",
		},
		{
			name:         "authorization header with digest parameters redacted",
			input:        String.raw`Authorization: Digest username="Mufasa", realm="myrealm", nonce="NONCE", uri="/dir/index.html", response="SIG"`,
			wantMask:     "Authorization: [REDACTED]",
			forbiddenRaw: "NONCE",
		},
		{
			name:         "double quoted multi word password redacted",
			input:        String.raw`password="correct horse battery staple"`,
			wantMask:     String.raw`[REDACTED]`,
			forbiddenRaw: "correct horse battery staple",
		},
		{
			name:         "double quoted comma containing api key redacted",
			input:        String.raw`api_key="secret,value"`,
			wantMask:     String.raw`[REDACTED]`,
			forbiddenRaw: "secret,value",
		},
		{
			name:         "bearer token redacted",
			input:        "upstream returned error: Bearer abcdef+TOPSECRET==",
			wantMask:     "Bearer [REDACTED]",
			forbiddenRaw: "TOPSECRET",
		},
		{
			name:         "sk key redacted",
			input:        "invalid key sk-live-secret-key-123456",
			wantMask:     "[REDACTED]",
			forbiddenRaw: "live-secret-key",
		},
		{
			name:         "user path redacted",
			input:        "open /Users/alice/configs/auth.json: permission denied",
			wantMask:     "[REDACTED_PATH]",
			forbiddenRaw: "alice",
		},
		{
			name:         "kv secret redacted",
			input:        "failed with api_key=secret-value-123 and token: my-secret-token",
			wantMask:     "[REDACTED]",
			forbiddenRaw: "secret-value-123",
		},
		{
			name:         "unstructured invalid api key redacted",
			input:        "invalid API key SUPERSECRET",
			wantMask:     "[REDACTED]",
			forbiddenRaw: "SUPERSECRET",
		},
		{
			name:         "unstructured invalid access token redacted",
			input:        "invalid access token SUPERSECRET",
			wantMask:     "[REDACTED]",
			forbiddenRaw: "SUPERSECRET",
		},
		{
			name:         "unstructured socks5 proxy auth redacted",
			input:        "proxyconnect tcp: socks5://alice:PASSSECRET@proxy.internal:1080",
			wantMask:     "[REDACTED_AUTH]",
			forbiddenRaw: "PASSSECRET",
		},
		{
			name:         "unstructured signature url query redacted",
			input:        "request failed: https://example.com?sig=SUPERSECRET",
			wantMask:     "[REDACTED]",
			forbiddenRaw: "SUPERSECRET",
		},
		{
			name:     "json code and message extracted",
			input:    String.raw`{"error":{"type":"service_unavailable_error","code":"server_is_overloaded","message":"Our servers are currently overloaded. Please try again later."}}`,
			wantMask: "Our servers are currently overloaded. Please try again later.",
		},
		{
			name:     "code prefix with json handled",
			input:    String.raw`auth_unavailable: {"error":{"code":"server_is_overloaded","message":"Overloaded"}}`,
			wantMask: "Overloaded",
		},
		{
			name:         "json message containing invalid token secret redacted",
			input:        String.raw`{"code":"oops","message":"invalid token SUPERSECRET"}`,
			wantMask:     "[REDACTED]",
			forbiddenRaw: "SUPERSECRET",
		},
		{
			name:         "single quoted key kv redacted",
			input:        String.raw`'api_key'=SUPERSECRET`,
			wantMask:     "[REDACTED]",
			forbiddenRaw: "SUPERSECRET",
		},
		{
			name:         "authorization equals bearer redacted",
			input:        String.raw`authorization=Bearer SUPERSECRET`,
			wantMask:     "[REDACTED]",
			forbiddenRaw: "SUPERSECRET",
		},
		{
			name:         "json message containing invalid token secret with escaped quotes redacted",
			input:        String.raw`{"code":"oops","message":"invalid token \"SUPERSECRET\""}`,
			wantMask:     "[REDACTED]",
			forbiddenRaw: "SUPERSECRET",
		},
		{
			name:         "json message containing password with escaped quotes redacted",
			input:        String.raw`{"code":"oops","message":"password=\"abc\\\"SUPERSECRET\""}`,
			wantMask:     "[REDACTED]",
			forbiddenRaw: "SUPERSECRET",
		},
		{
			name:         "natural language api key redacted",
			input:        "upstream rejected API key: SUPERSECRET",
			wantMask:     "[REDACTED]",
			forbiddenRaw: "SUPERSECRET",
		},
		{
			name:         "natural language password is redacted",
			input:        "password is SUPERSECRET",
			wantMask:     "[REDACTED]",
			forbiddenRaw: "SUPERSECRET",
		},
		{
			name:         "mnt unix path redacted",
			input:        "open /mnt/secrets/alice: permission denied",
			wantMask:     "[REDACTED_PATH]",
			forbiddenRaw: "alice",
		},
		{
			name:         "windows path with spaces redacted",
			input:        String.raw`open C:\Users\Alice Smith\secret.txt: permission denied`,
			wantMask:     "[REDACTED_PATH]",
			forbiddenRaw: "Alice Smith",
		},
		{
			name:         "cookie header redacted",
			input:        "Cookie: sessionid=COOKIESECRET",
			wantMask:     "Cookie: [REDACTED]",
			forbiddenRaw: "COOKIESECRET",
		},
		{
			name:         "set-cookie header redacted",
			input:        "Set-Cookie: session=SETCOOKIESECRET",
			wantMask:     "Cookie: [REDACTED]",
			forbiddenRaw: "SETCOOKIESECRET",
		},
		{
			name:         "private key kv redacted",
			input:        "private_key=PRIVATEKEYSECRET",
			wantMask:     "[REDACTED]",
			forbiddenRaw: "PRIVATEKEYSECRET",
		},
		{
			name:         "uri userinfo redacted",
			input:        "https://user:PASSSECRET@example.com/api",
			wantMask:     "https://[REDACTED_AUTH]@",
			forbiddenRaw: "PASSSECRET",
		},
		{
			name:         "workspace unix path redacted",
			input:        "/workspace/tenants/alice/oauth-cache",
			wantMask:     "[REDACTED_PATH]",
			forbiddenRaw: "alice",
		},
		{
			name:         "opt unix path redacted",
			input:        String.raw`open /opt/cli-proxy/auth/alice.json: failed`,
			wantMask:     "[REDACTED_PATH]",
			forbiddenRaw: "alice",
		},
		{
			name:         "windows path redacted",
			input:        String.raw`open C:\Users\alice\secret.txt: failed`,
			wantMask:     "[REDACTED_PATH]",
			forbiddenRaw: "alice",
		},
		{
			name:         "incorrect api key provided redacted",
			input:        "Incorrect API key provided: SUPERSECRET",
			wantMask:     "[REDACTED]",
			forbiddenRaw: "SUPERSECRET",
		},
		{
			name:         "plural credentials redacted",
			input:        "credentials: SUPERSECRET",
			wantMask:     "[REDACTED]",
			forbiddenRaw: "SUPERSECRET",
		},
		{
			name:         "aws secret access key redacted",
			input:        "AWS_SECRET_ACCESS_KEY=SUPERSECRET",
			wantMask:     "[REDACTED]",
			forbiddenRaw: "SUPERSECRET",
		},
		{
			name:         "protocol relative uri userinfo redacted",
			input:        "//alice:PASSSECRET@example.com/api",
			wantMask:     "[REDACTED_AUTH]",
			forbiddenRaw: "PASSSECRET",
		},
		{
			name:         "run secrets unix path redacted",
			input:        "open /run/secrets/alice: permission denied",
			wantMask:     "[REDACTED_PATH]",
			forbiddenRaw: "alice",
		},
		{
			name:         "custom tenant unix path redacted",
			input:        "open /custom/tenant/alice: permission denied",
			wantMask:     "[REDACTED_PATH]",
			forbiddenRaw: "alice",
		},
		{
			name:         "windows unc path redacted",
			input:        String.raw`open \\server\share\alice\secret.txt: permission denied`,
			wantMask:     "[REDACTED_PATH]",
			forbiddenRaw: "alice",
		},
		{
			name:         "service key kv redacted",
			input:        "SERVICE_KEY=SUPERSECRET",
			wantMask:     "[REDACTED]",
			forbiddenRaw: "SUPERSECRET",
		},
		{
			name:         "openai key kv redacted",
			input:        "OPENAI_KEY=SUPERSECRET",
			wantMask:     "[REDACTED]",
			forbiddenRaw: "SUPERSECRET",
		},
		{
			name:         "x-key query param redacted",
			input:        "https://example.com?x-key=SUPERSECRET",
			wantMask:     "[REDACTED]",
			forbiddenRaw: "SUPERSECRET",
		},
		{
			name:         "unix path with spaces redacted",
			input:        "open /custom/tenant/Alice Smith/secret.txt: denied",
			wantMask:     "[REDACTED_PATH]",
			wantExact:    "open [REDACTED_PATH]: denied",
			forbiddenRaw: "Smith",
		},
		{
			name:         "unix path with unicode redacted",
			input:        "open /custom/租户/alice: denied",
			wantMask:     "[REDACTED_PATH]",
			forbiddenRaw: "alice",
		},
		{
			name:         "single segment unix path redacted",
			input:        "open /alice: permission denied",
			wantMask:     "[REDACTED_PATH]",
			forbiddenRaw: "alice",
		},
		{
			name:         "stat single segment unicode path redacted",
			input:        "stat /客户: no such file or directory",
			wantMask:     "[REDACTED_PATH]",
			forbiddenRaw: "客户",
		},
		{
			name:         "quoted path with colon and secret redacted",
			input:        String.raw`open "/tmp/customer:TOPSECRET/creds": denied`,
			wantMask:     "[REDACTED_PATH]",
			forbiddenRaw: "TOPSECRET",
		},
		{
			name:         "unquoted multi-word password redacted",
			input:        "password = correct horse battery staple",
			wantMask:     "[REDACTED]",
			forbiddenRaw: "battery staple",
		},
		{
			name:         "unquoted multi-word credentials redacted",
			input:        "credentials: alice secret",
			wantMask:     "[REDACTED]",
			forbiddenRaw: "alice secret",
		},
		{
			name:         "quoted path containing password assignment redacted",
			input:        String.raw`open "/Users/alice/password=foo/bar": denied`,
			wantMask:     "[REDACTED_PATH]",
			forbiddenRaw: "alice",
		},
		{
			name:         "unquoted path with colon and secret redacted",
			input:        "open /tmp/customer:TOPSECRET/creds: denied",
			wantMask:     "[REDACTED_PATH]",
			forbiddenRaw: "TOPSECRET",
		},
		{
			name:         "unquoted path with colon in leaf component redacted",
			input:        "open /tmp/customer:TOPSECRET: denied",
			wantMask:     "[REDACTED_PATH]",
			wantExact:    "open [REDACTED_PATH]: denied",
			forbiddenRaw: "TOPSECRET",
		},
		{
			name:         "multiple unquoted unix paths redacted",
			input:        "rename /Users/alice/source /Users/bob/private-data: denied",
			wantMask:     "[REDACTED_PATH]",
			wantExact:    "rename [REDACTED_PATH] [REDACTED_PATH]: denied",
			forbiddenRaw: "bob",
		},
		{
			name:         "non-terminal space path in multiple unix paths redacted",
			input:        "rename /Users/Alice Smith/source /Users/bob/private-data: denied",
			wantMask:     "[REDACTED_PATH]",
			wantExact:    "rename [REDACTED_PATH] [REDACTED_PATH]: denied",
			forbiddenRaw: "Alice Smith",
		},
		{
			name:         "leaf filename with space redacted",
			input:        "open /tmp/Alice Smith.txt: denied",
			wantMask:     "[REDACTED_PATH]",
			wantExact:    "open [REDACTED_PATH]: denied",
			forbiddenRaw: "Alice Smith",
		},
		{
			name:         "multiple paths with leaf filename spaces redacted",
			input:        "rename /tmp/Alice Smith /tmp/Bob Jones: denied",
			wantMask:     "[REDACTED_PATH]",
			wantExact:    "rename [REDACTED_PATH] [REDACTED_PATH]: denied",
			forbiddenRaw: "Alice Smith",
		},
		{
			name:         "unquoted path with colon space in leaf component redacted",
			input:        "open /tmp/customer: TOPSECRET: denied",
			wantMask:     "[REDACTED_PATH]",
			wantExact:    "open [REDACTED_PATH]: denied",
			forbiddenRaw: "TOPSECRET",
		},
		{
			name:         "parenthesized unquoted path redacted and parens preserved",
			input:        "open (/tmp/customer): denied",
			wantMask:     "[REDACTED_PATH]",
			wantExact:    "open ([REDACTED_PATH]): denied",
			forbiddenRaw: "customer",
		},
		{
			name:         "braced unquoted path redacted and braces preserved",
			input:        "open {/tmp/customer}: denied",
			wantMask:     "[REDACTED_PATH]",
			wantExact:    "open {[REDACTED_PATH]}: denied",
			forbiddenRaw: "customer",
		},
		{
			name:         "nested error text preserved after path",
			input:        "open /tmp/config: permission denied: retry later",
			wantMask:     "[REDACTED_PATH]",
			wantExact:    "open [REDACTED_PATH]: permission denied: retry later",
			forbiddenRaw: "config",
		},
		{
			name:         "nested known error text preserved after path",
			input:        "open /tmp/config: permission denied: access denied",
			wantMask:     "[REDACTED_PATH]",
			wantExact:    "open [REDACTED_PATH]: permission denied: access denied",
			forbiddenRaw: "config",
		},
		{
			name:         "uppercase connector between paths preserved",
			input:        "copy /tmp/a   TO\t/tmp/b: denied",
			wantMask:     "[REDACTED_PATH]",
			wantExact:    "copy [REDACTED_PATH]   TO\t[REDACTED_PATH]: denied",
			forbiddenRaw: "",
		},
		{
			name:         "long connector string bounded to 256 runes",
			input:        ("a").repeat(300) + " to /tmp/x: denied",
			wantMask:     "...",
			forbiddenRaw: "x",
		},
		{
			name:     "long utf-8 text truncated to 256 runes",
			input:    ("你好世界🌟").repeat(80),
			wantMask: "...",
		},
]))

// Casos propios: las ramas que las tablas de la referencia no ejercitan, cada
// uno elegido porque cae exactamente cuando se retira su rama.
describe('casos propios', () => {
  const cases: [string, string, string][] = [
    ['el resumen de un JSON es código y mensaje', '{"error":{"code":"rate_limit","message":"Too many requests"}}', 'rate_limit: Too many requests'],
    ['un prefijo corto antes del JSON no impide leerlo', 'HTTP 429: {"error":{"message":"slow down"}}', 'slow down'],
    ['sin objeto error, el código y el mensaje de la raíz', '{"code":"bad_request","message":"oops"}', 'bad_request: oops'],
    ['la clave de consulta se corta en su propio valor', 'GET https://api.test/v1?sig=a|b c', 'GET https://api.test/v1?sig=[REDACTED]'],
    ['una ruta con extensión tras una comilla invertida sin cerrar', 'read `/etc/app.conf failed', 'read `[REDACTED_PATH] failed'],
    ['una clave sk- en medio del texto', 'upstream said sk-abcdef123456 is revoked', 'upstream said sk-[REDACTED] is revoked'],
    ['un token inválido nombrado', 'invalid api key abc123xyz', 'invalid token: [REDACTED]'],
    ['el espacio no ASCII no abre una ruta, como en RE2', 'x /etc/passwd leaked', 'x /etc/passwd leaked'],
    ['ni cierra el prefijo del error', 'denied /etc/passwd', 'denied /etc/passwd'],
  ]
  for (const [name, raw, want] of cases) {
    test(name, () => expect(extractUpstreamErrorSummary(raw)).toBe(want))
  }
})
