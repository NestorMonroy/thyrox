// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import"/$bunfs/root/chunk-r0g511s6.js";import"/$bunfs/root/chunk-8a7jwk3w.js";import"/$bunfs/root/chunk-r8601mcq.js";import"/$bunfs/root/chunk-jmxayrtv.js";import"/$bunfs/root/chunk-1p8thh7t.js";import"/$bunfs/root/chunk-78nzsrc6.js";import"/$bunfs/root/chunk-yqdggex4.js";import"/$bunfs/root/chunk-bxegdt3f.js";import"/$bunfs/root/chunk-k6vqz9fa.js";import"/$bunfs/root/chunk-m3vzz9tz.js";import"/$bunfs/root/chunk-1m0n2kwr.js";import"/$bunfs/root/chunk-06whp1c5.js";import{S,V}from"/$bunfs/root/chunk-mh9y4c2z.js";import"/$bunfs/root/chunk-w8jp0t25.js";import"/$bunfs/root/chunk-kqpqzcmv.js";import"/$bunfs/root/chunk-r1xh498w.js";import"/$bunfs/root/chunk-0d0nn4ae.js";import"/$bunfs/root/chunk-kxdybkam.js";import"/$bunfs/root/chunk-71zhb9jr.js";import"/$bunfs/root/chunk-y9tkdj4c.js";import"/$bunfs/root/chunk-9c9242q9.js";import"/$bunfs/root/chunk-32f2qmtc.js";import"/$bunfs/root/chunk-v7vff0yy.js";import"/$bunfs/root/chunk-j44ptfw0.js";import"/$bunfs/root/chunk-v916jarm.js";import"/$bunfs/root/chunk-k9hc9pe5.js";import"/$bunfs/root/chunk-55s6k4f0.js";import"/$bunfs/root/chunk-cy8hxjse.js";import"/$bunfs/root/chunk-b41q7ss6.js";import"/$bunfs/root/chunk-cbshpytk.js";import"/$bunfs/root/chunk-ke36szyq.js";import"/$bunfs/root/chunk-8bd42nrb.js";import"/$bunfs/root/chunk-z4h5ym44.js";import"/$bunfs/root/chunk-zqzrgb20.js";import"/$bunfs/root/chunk-ctrs6tfh.js";import"/$bunfs/root/chunk-cgc6ah4n.js";import"/$bunfs/root/chunk-eqgyf4er.js";import"/$bunfs/root/chunk-p3hagek4.js";import"/$bunfs/root/chunk-j6rfmzxq.js";import"/$bunfs/root/chunk-xnx53tr1.js";import"/$bunfs/root/chunk-te0qwtpy.js";import"/$bunfs/root/chunk-ah1kb8zv.js";import"/$bunfs/root/chunk-pspwb82p.js";import"/$bunfs/root/chunk-ry2xbn1t.js";import"/$bunfs/root/chunk-pabcf0cd.js";import"/$bunfs/root/chunk-qj81qj0a.js";import{As}from"/$bunfs/root/chunk-7fpmaq7k.js";import"/$bunfs/root/chunk-1wrntbps.js";import"/$bunfs/root/chunk-9ep9p4b1.js";import"/$bunfs/root/chunk-x7ckrg92.js";import"/$bunfs/root/chunk-tjx05rry.js";import"/$bunfs/root/chunk-2zwmhqkx.js";import"/$bunfs/root/chunk-3ec9hd6z.js";import"/$bunfs/root/chunk-xrr6v9m7.js";import"/$bunfs/root/chunk-01khvgez.js";import"/$bunfs/root/chunk-0qxfa76c.js";import"/$bunfs/root/chunk-01t8d9d8.js";import"/$bunfs/root/chunk-j0wk3h85.js";import"/$bunfs/root/chunk-1n3yp4cx.js";import"/$bunfs/root/chunk-8as7yv62.js";import"/$bunfs/root/chunk-7kse1ekq.js";import"/$bunfs/root/chunk-8q8hj6xj.js";import"/$bunfs/root/chunk-9fs3bhky.js";import"/$bunfs/root/chunk-ebp189k1.js";import"/$bunfs/root/chunk-x0xqzpn1.js";import"/$bunfs/root/chunk-20w6hca0.js";import"/$bunfs/root/chunk-q1rcf2nb.js";import"/$bunfs/root/chunk-s10h1zk9.js";import"/$bunfs/root/chunk-5pwrzqzk.js";import{Ace}from"/$bunfs/root/chunk-yntnahb9.js";import{cu}from"/$bunfs/root/chunk-k5yw9yvh.js";import"/$bunfs/root/chunk-vyay8w7r.js";import"/$bunfs/root/chunk-6e8gaqd9.js";import"/$bunfs/root/chunk-pb41yc27.js";import"/$bunfs/root/chunk-vm29tqmf.js";import"/$bunfs/root/chunk-rpnwkr8a.js";import"/$bunfs/root/chunk-aedbr8zd.js";import"/$bunfs/root/chunk-5w2ggns2.js";import"/$bunfs/root/chunk-vmja0gjy.js";import{createPublicKey as l,verify as g}from"crypto";function y(t){let r={header:!1,verify:!0,checkExpiry:!0,help:!1};for(let e=0;e<t.length;e++){let n=t[e];switch(n){case"--help":case"-h":r.help=!0;break;case"--header":r.header=!0;break;case"--verify":r.verify=!0;break;case"--no-verify":r.verify=!1;break;case"--no-check-expiry":r.checkExpiry=!1;break;case"--api-url":{let o=t[++e];if(o===void 0)throw Error("decode-token: --api-url requires a value");r.apiUrl=o;break}default:if(n.startsWith("-"))throw Error(`decode-token: unknown flag ${n}`);if(r.token!==void 0)throw Error("decode-token: at most one positional token argument");r.token=n}}return r}function w(t){let e=t.trim().replace(/^sk-ant-[a-z0-9]+-/i,"").split(".");if(e.length!==3||!e[0]||!e[1]||!e[2])throw Error("decode-token: not a JWT \u2014 expected 3 dot-separated base64url segments "+`(after stripping any sk-ant- prefix), got ${e.length}`);return{headerB64:e[0],payloadB64:e[1],signatureB64:e[2]}}function u(t,r){if(!/^[A-Za-z0-9_-]+$/.test(t))throw Error(`decode-token: ${r} is not valid base64url (unexpected characters)`);let e=Buffer.from(t,"base64url").toString("utf8"),n;try{n=V(e)}catch(o){throw Error(`decode-token: ${r} is not valid JSON: ${o}`)}if(n===null||typeof n!=="object"||Array.isArray(n))throw Error(`decode-token: ${r} is not a JSON object`);return n}var E={ES256:"EC",RS256:"RSA"};function m(t,r=Math.floor(Date.now()/1000),e=60){let{exp:n,nbf:o}=t;if(typeof n!=="number")throw Error("decode-token: token has no numeric `exp` claim");if(r>n+e)throw Error(`decode-token: token EXPIRED at ${new Date(n*1000).toISOString()} (${Math.round(r-n)}s ago)`);if(typeof o==="number"&&r+e<o)throw Error(`decode-token: token not valid until ${new Date(o*1000).toISOString()}`)}async function x(t){let r=t.header.alg,e=t.header.kid;if(typeof r!=="string"||typeof e!=="string")throw Error("decode-token: JWT header is missing `alg` or `kid` \u2014 cannot select a JWKS key");let n=E[r];if(!n)throw Error(`decode-token: unsupported alg=${r} \u2014 only ES256 and RS256 are supported`);let o;try{o=await t.fetchFn(t.jwksUrl,{...As({url:t.jwksUrl}),signal:AbortSignal.timeout(30000)})}catch(a){throw Error(`decode-token: failed to fetch JWKS from ${t.jwksUrl}: ${a}`)}if(!o.ok)throw Error(`decode-token: JWKS fetch returned ${o.status} ${o.statusText} for ${t.jwksUrl}`);let s=(await o.json()).keys?.find((a)=>a.kid===e);if(!s)throw Error(`decode-token: no JWKS key with kid=${e} at ${t.jwksUrl} \u2014 `+"token may be signed by a different environment (try --api-url).");if(s.kty!==n)throw Error(`decode-token: JWKS key kid=${e} has kty=${s.kty} but alg=${r} needs kty=${n}`);let c="sha256",d=r==="ES256"?{key:l({key:s,format:"jwk"}),dsaEncoding:"ieee-p1363"}:{key:l({key:s,format:"jwk"})},k=Buffer.from(`${t.headerB64}.${t.payloadB64}`,"utf8"),f=Buffer.from(t.signatureB64,"base64url");if(!g(c,k,d,f))throw Error("decode-token: signature verification FAILED");if(t.checkExpiry!==!1)m(t.payload);return{kid:e}}var h=16384,b=5000;async function v(t=process.stdin){if(t.isTTY)return"";let r=[],e=0;for await(let n of t){let o=Buffer.from(n);if(e+=o.length,e>h)throw Error(`decode-token: stdin exceeds ${h/1024} KiB; session-ingress JWTs are ~1 KB. Pass the token as an argument or set $CLAUDE_CODE_SESSION_ACCESS_TOKEN.`);r.push(o)}return Buffer.concat(r).toString("utf8")}async function _(t,r,e=process.stdin,n=b){if(t?.trim())return t.trim();let o=r.CLAUDE_CODE_SESSION_ACCESS_TOKEN?.trim();if(o)return o;let i=(await cu(v(e),n,"decode-token: reading token from stdin")).trim();if(i)return i;throw Error("decode-token: no token supplied. Pass it as an argument, pipe it on stdin, or set $CLAUDE_CODE_SESSION_ACCESS_TOKEN.")}var O=`Usage: claude self-hosted-runner decode-token [token] [options]

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
`;async function C(t){let r;try{r=y(t)}catch(e){process.stderr.write(`${e instanceof Error?e.message:e}
`),process.exit(1)}if(r.help)process.stdout.write(O),process.exit(0);try{let e=await _(r.token,process.env),{headerB64:n,payloadB64:o,signatureB64:i}=w(e),s=u(n,"header"),c=u(o,"payload");if(r.verify){let f=`${(r.apiUrl??Ace()).replace(/\/+$/,"")}/v1/code/.well-known/jwks.json`,{kid:p}=await x({headerB64:n,payloadB64:o,signatureB64:i,header:s,payload:c,jwksUrl:f,fetchFn:fetch,checkExpiry:r.checkExpiry}),a=r.checkExpiry?"sig+exp":"sig only, exp SKIPPED";process.stderr.write(`verified (kid=${p}, ${a})
`)}let d=r.header?s:c;process.stdout.write(`${S(d,null,2)}
`),process.exit(0)}catch(e){process.stderr.write(`${e instanceof Error?e.message:e}
`),process.exit(1)}}export{C as selfHostedRunnerDecodeTokenMain};
