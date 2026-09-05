// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{EQ as S,FQ as v}from"/$bunfs/root/_403.js";import{a0a as E,g0a as b}from"/$bunfs/root/_442.js";import"/$bunfs/root/_445.js";import"/$bunfs/root/_668.js";import"/$bunfs/root/_669.js";import"/$bunfs/root/_670.js";import"/$bunfs/root/_671.js";import"/$bunfs/root/_672.js";import"/$bunfs/root/_673.js";import"/$bunfs/root/_674.js";import"/$bunfs/root/_675.js";import"/$bunfs/root/_676.js";import"/$bunfs/root/_677.js";import"/$bunfs/root/_678.js";import"/$bunfs/root/_679.js";import"/$bunfs/root/_680.js";import"/$bunfs/root/_681.js";import"/$bunfs/root/_682.js";import"/$bunfs/root/_683.js";import"/$bunfs/root/_684.js";import"/$bunfs/root/_685.js";import"/$bunfs/root/_686.js";import"/$bunfs/root/_687.js";import"/$bunfs/root/_688.js";import"/$bunfs/root/_689.js";import"/$bunfs/root/_690.js";import"/$bunfs/root/_691.js";import"/$bunfs/root/_692.js";import"/$bunfs/root/_693.js";import"/$bunfs/root/_694.js";import"/$bunfs/root/_695.js";import"/$bunfs/root/_696.js";import"/$bunfs/root/_697.js";import"/$bunfs/root/_698.js";import"/$bunfs/root/_699.js";import"/$bunfs/root/_700.js";import"/$bunfs/root/_701.js";import"/$bunfs/root/_702.js";import"/$bunfs/root/_703.js";import"/$bunfs/root/_704.js";import"/$bunfs/root/_705.js";import"/$bunfs/root/_706.js";import"/$bunfs/root/_707.js";import"/$bunfs/root/_708.js";import"/$bunfs/root/_709.js";import"/$bunfs/root/_710.js";import"/$bunfs/root/_711.js";import"/$bunfs/root/_712.js";import"/$bunfs/root/_713.js";import"/$bunfs/root/_714.js";import"/$bunfs/root/_715.js";import"/$bunfs/root/_716.js";import"/$bunfs/root/_717.js";import{QQc as w,WQc as x}from"/$bunfs/root/_718.js";import"/$bunfs/root/_719.js";import"/$bunfs/root/_720.js";import"/$bunfs/root/_721.js";import"/$bunfs/root/_722.js";import"/$bunfs/root/_728.js";import"/$bunfs/root/_745.js";import"/$bunfs/root/_746.js";import"/$bunfs/root/_747.js";import"/$bunfs/root/_748.js";import"/$bunfs/root/_749.js";import"/$bunfs/root/_750.js";import"/$bunfs/root/_751.js";import"/$bunfs/root/_752.js";import"/$bunfs/root/_753.js";import"/$bunfs/root/_754.js";import"/$bunfs/root/_755.js";import"/$bunfs/root/_756.js";import"/$bunfs/root/_757.js";import"/$bunfs/root/_758.js";import"/$bunfs/root/_759.js";import"/$bunfs/root/_766.js";import"/$bunfs/root/_767.js";import"/$bunfs/root/_769.js";import"/$bunfs/root/_770.js";import"/$bunfs/root/_771.js";import"/$bunfs/root/_772.js";import"/$bunfs/root/_773.js";import"/$bunfs/root/_774.js";import"/$bunfs/root/_775.js";import"/$bunfs/root/_776.js";import"/$bunfs/root/_777.js";import"/$bunfs/root/_778.js";import"/$bunfs/root/_779.js";import"/$bunfs/root/_780.js";import"/$bunfs/root/_789.js";import"/$bunfs/root/_790.js";import"/$bunfs/root/_791.js";import"/$bunfs/root/_795.js";import"/$bunfs/root/_799.js";import"/$bunfs/root/_804.js";import"/$bunfs/root/_805.js";import"/$bunfs/root/_806.js";import"/$bunfs/root/_807.js";import"/$bunfs/root/_808.js";import"/$bunfs/root/_809.js";import"/$bunfs/root/_810.js";import"/$bunfs/root/_811.js";import"/$bunfs/root/_812.js";import"/$bunfs/root/_813.js";import"/$bunfs/root/_814.js";import"/$bunfs/root/_815.js";import"/$bunfs/root/_816.js";import"/$bunfs/root/_817.js";import"/$bunfs/root/_818.js";import"/$bunfs/root/_819.js";import{mgd as g,qgd as y,ugd as m}from"/$bunfs/root/_820.js";import"/$bunfs/root/_821.js";import"/$bunfs/root/_822.js";import"/$bunfs/root/_823.js";import"/$bunfs/root/_824.js";import"/$bunfs/root/_825.js";import"/$bunfs/root/_826.js";import"/$bunfs/root/_827.js";import"/$bunfs/root/_828.js";import"/$bunfs/root/_829.js";import"/$bunfs/root/_830.js";import"/$bunfs/root/_831.js";import"/$bunfs/root/_832.js";import"/$bunfs/root/_833.js";import"/$bunfs/root/_834.js";import"/$bunfs/root/_835.js";import"/$bunfs/root/_836.js";import"/$bunfs/root/_837.js";b();x();m();v();import{createPublicKey as l,verify as _}from"crypto";function O(t){let r={header:!1,verify:!0,checkExpiry:!0,help:!1};for(let e=0;e<t.length;e++){let n=t[e];switch(n){case"--help":case"-h":r.help=!0;break;case"--header":r.header=!0;break;case"--verify":r.verify=!0;break;case"--no-verify":r.verify=!1;break;case"--no-check-expiry":r.checkExpiry=!1;break;case"--api-url":{let o=t[++e];if(o===void 0)throw Error("decode-token: --api-url requires a value");r.apiUrl=o;break}default:if(n.startsWith("-"))throw Error(`decode-token: unknown flag ${n}`);if(r.token!==void 0)throw Error("decode-token: at most one positional token argument");r.token=n}}return r}function T(t){let e=t.trim().replace(/^sk-ant-[a-z0-9]+-/i,"").split(".");if(e.length!==3||!e[0]||!e[1]||!e[2])throw Error("decode-token: not a JWT \u2014 expected 3 dot-separated base64url segments "+`(after stripping any sk-ant- prefix), got ${e.length}`);return{headerB64:e[0],payloadB64:e[1],signatureB64:e[2]}}function u(t,r){if(!/^[A-Za-z0-9_-]+$/.test(t))throw Error(`decode-token: ${r} is not valid base64url (unexpected characters)`);let e=Buffer.from(t,"base64url").toString("utf8"),n;try{n=y(e)}catch(o){throw Error(`decode-token: ${r} is not valid JSON: ${o}`)}if(n===null||typeof n!=="object"||Array.isArray(n))throw Error(`decode-token: ${r} is not a JSON object`);return n}var A={ES256:"EC",RS256:"RSA"};function D(t,r=Math.floor(Date.now()/1000),e=60){let{exp:n,nbf:o}=t;if(typeof n!=="number")throw Error("decode-token: token has no numeric `exp` claim");if(r>n+e)throw Error(`decode-token: token EXPIRED at ${new Date(n*1000).toISOString()} (${Math.round(r-n)}s ago)`);if(typeof o==="number"&&r+e<o)throw Error(`decode-token: token not valid until ${new Date(o*1000).toISOString()}`)}async function j(t){let r=t.header.alg,e=t.header.kid;if(typeof r!=="string"||typeof e!=="string")throw Error("decode-token: JWT header is missing `alg` or `kid` \u2014 cannot select a JWKS key");let n=A[r];if(!n)throw Error(`decode-token: unsupported alg=${r} \u2014 only ES256 and RS256 are supported`);let o;try{o=await t.fetchFn(t.jwksUrl,{...w({url:t.jwksUrl}),signal:AbortSignal.timeout(30000)})}catch(a){throw Error(`decode-token: failed to fetch JWKS from ${t.jwksUrl}: ${a}`)}if(!o.ok)throw Error(`decode-token: JWKS fetch returned ${o.status} ${o.statusText} for ${t.jwksUrl}`);let s=(await o.json()).keys?.find((a)=>a.kid===e);if(!s)throw Error(`decode-token: no JWKS key with kid=${e} at ${t.jwksUrl} \u2014 `+"token may be signed by a different environment (try --api-url).");if(s.kty!==n)throw Error(`decode-token: JWKS key kid=${e} has kty=${s.kty} but alg=${r} needs kty=${n}`);let c="sha256",d=r==="ES256"?{key:l({key:s,format:"jwk"}),dsaEncoding:"ieee-p1363"}:{key:l({key:s,format:"jwk"})},k=Buffer.from(`${t.headerB64}.${t.payloadB64}`,"utf8"),f=Buffer.from(t.signatureB64,"base64url");if(!_(c,k,d,f))throw Error("decode-token: signature verification FAILED");if(t.checkExpiry!==!1)D(t.payload);return{kid:e}}var h=16384,B=5000;async function C(t=process.stdin){if(t.isTTY)return"";let r=[],e=0;for await(let n of t){let o=Buffer.from(n);if(e+=o.length,e>h)throw Error(`decode-token: stdin exceeds ${h/1024} KiB; session-ingress JWTs are ~1 KB. Pass the token as an argument or set $CLAUDE_CODE_SESSION_ACCESS_TOKEN.`);r.push(o)}return Buffer.concat(r).toString("utf8")}async function J(t,r,e=process.stdin,n=B){if(t?.trim())return t.trim();let o=r.CLAUDE_CODE_SESSION_ACCESS_TOKEN?.trim();if(o)return o;let i=(await S(C(e),n,"decode-token: reading token from stdin")).trim();if(i)return i;throw Error("decode-token: no token supplied. Pass it as an argument, pipe it on stdin, or set $CLAUDE_CODE_SESSION_ACCESS_TOKEN.")}var K=`Usage: claude self-hosted-runner decode-token [token] [options]

Decode a session-ingress JWT (CLAUDE_CODE_SESSION_ACCESS_TOKEN) and print its
claims as JSON to stdout. Strips any sk-ant-cc- / sk-ant-si- prefix
automatically. Pipe to jq to extract a single claim.

Token source (first non-empty wins):
  1. Positional argument
  2. $CLAUDE_CODE_SESSION_ACCESS_TOKEN
  3. Piped stdin

Signature verification against <api-url>/v1/code/.well-known/jwks.json is ON
by default, as is the exp/nbf check (60s skew). Prints "verified (kid=\u2026,
sig+exp)" to stderr on success; exits 1 on verification failure, expiry, or
JWKS fetch error. Does NOT pin iss/aud/token-type \u2014 compare those from the
decoded claims if your auth model depends on them.

Options:
  --header           Print the JWT header instead of the claims.
  --no-verify        Skip signature verification and the JWKS fetch. For
                     offline inspection only \u2014 do NOT feed the output to an
                     auth decision.
  --no-check-expiry  Skip the exp/nbf check (signature still verified). For
                     forensics ("was this token ever issued by us?").
  --api-url <url>    API base URL for JWKS fetch (default: $ANTHROPIC_BASE_URL
                     or the built-in default).
  --verify           (Deprecated \u2014 verification is the default. Kept so older
                     wrapper scripts don't break.)
  --help, -h         Show this help.

Examples:
  # In an --exec-path wrapper: who created this session? Signature is
  # verified by default, so a tampered token exits non-zero here.
  # Use jq -re (not -r) when the claim gates an auth decision \u2014 jq -r prints
  # the literal string "null" and exits 0 when the claim is missing.
  creator=$(claude self-hosted-runner decode-token | jq -re .act.email) \\
    || { echo "session JWT: no creator identity or verification failed" >&2; exit 1; }

  # Offline inspection (no network, no auth decision)
  claude self-hosted-runner decode-token --no-verify

  # Decode a different token by piping it (unset the env var first)
  echo "$SOME_TOKEN" | env -u CLAUDE_CODE_SESSION_ACCESS_TOKEN \\
    claude self-hosted-runner decode-token --no-verify
`;async function W(t){let r;try{r=O(t)}catch(e){process.stderr.write(`${e instanceof Error?e.message:e}
`),process.exit(1)}if(r.help)process.stdout.write(K),process.exit(0);try{let e=await J(r.token,process.env),{headerB64:n,payloadB64:o,signatureB64:i}=T(e),s=u(n,"header"),c=u(o,"payload");if(r.verify){let f=`${(r.apiUrl??E()).replace(/\/+$/,"")}/v1/code/.well-known/jwks.json`,{kid:p}=await j({headerB64:n,payloadB64:o,signatureB64:i,header:s,payload:c,jwksUrl:f,fetchFn:fetch,checkExpiry:r.checkExpiry}),a=r.checkExpiry?"sig+exp":"sig only, exp SKIPPED";process.stderr.write(`verified (kid=${p}, ${a})
`)}let d=r.header?s:c;process.stdout.write(`${g(d,null,2)}
`),process.exit(0)}catch(e){process.stderr.write(`${e instanceof Error?e.message:e}
`),process.exit(1)}}export{D as checkTokenTime,u as decodeSegment,O as parseDecodeTokenArgs,C as readStdin,J as resolveToken,W as selfHostedRunnerDecodeTokenMain,T as splitJwt,j as verifyAgainstJwks};
