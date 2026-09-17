// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import"/$bunfs/root/chunk-h1nnaadz.js";import"/$bunfs/root/chunk-tep8see7.js";import"/$bunfs/root/chunk-3btyksgt.js";import"/$bunfs/root/chunk-64dkx51v.js";import"/$bunfs/root/chunk-akpzg2yh.js";import"/$bunfs/root/chunk-g5h2a16k.js";import"/$bunfs/root/chunk-53a5hn9r.js";import"/$bunfs/root/chunk-hxy982f9.js";import"/$bunfs/root/chunk-w8gsn0hm.js";import"/$bunfs/root/chunk-ecxh3hga.js";import"/$bunfs/root/chunk-j96jysac.js";import"/$bunfs/root/chunk-4cmy5sqz.js";import"/$bunfs/root/chunk-ja309z9r.js";import"/$bunfs/root/chunk-p7hrkaq4.js";import{w,J}from"/$bunfs/root/chunk-r2c9k9kh.js";import"/$bunfs/root/chunk-yy7a4xwv.js";import"/$bunfs/root/chunk-b565vq97.js";import"/$bunfs/root/chunk-1jxsqt67.js";import"/$bunfs/root/chunk-b5k761bj.js";import"/$bunfs/root/chunk-zbq9bkhj.js";import"/$bunfs/root/chunk-qpc977f4.js";import"/$bunfs/root/chunk-marw4shk.js";import"/$bunfs/root/chunk-27bj2wbx.js";import"/$bunfs/root/chunk-q77993h4.js";import"/$bunfs/root/chunk-1mz51xz6.js";import"/$bunfs/root/chunk-dz2zqf8q.js";import"/$bunfs/root/chunk-e5k4mpe1.js";import"/$bunfs/root/chunk-hk70qp2z.js";import"/$bunfs/root/chunk-pc40tvt4.js";import"/$bunfs/root/chunk-y669ewnb.js";import"/$bunfs/root/chunk-mw9kp8vw.js";import"/$bunfs/root/chunk-hf9yhhhe.js";import"/$bunfs/root/chunk-z0202m3z.js";import"/$bunfs/root/chunk-tjpyqt9m.js";import"/$bunfs/root/chunk-deawgr1z.js";import"/$bunfs/root/chunk-esk1bxsv.js";import"/$bunfs/root/chunk-1nwhka6x.js";import"/$bunfs/root/chunk-m0am9fba.js";import"/$bunfs/root/chunk-7xhd9gmf.js";import"/$bunfs/root/chunk-ztn29w9x.js";import"/$bunfs/root/chunk-qk2a968b.js";import"/$bunfs/root/chunk-af9dczt1.js";import"/$bunfs/root/chunk-dnseeje8.js";import"/$bunfs/root/chunk-w3jka8th.js";import{ci}from"/$bunfs/root/chunk-a8zb1cc5.js";import"/$bunfs/root/chunk-zsdbd62x.js";import"/$bunfs/root/chunk-qfxegd6m.js";import"/$bunfs/root/chunk-da71yq24.js";import"/$bunfs/root/chunk-4jd7d9ec.js";import"/$bunfs/root/chunk-mtq3m0rn.js";import"/$bunfs/root/chunk-4s3p78tq.js";import"/$bunfs/root/chunk-4qm801kz.js";import"/$bunfs/root/chunk-p8ybpsqa.js";import"/$bunfs/root/chunk-55cbxff7.js";import"/$bunfs/root/chunk-b1ctzpp7.js";import"/$bunfs/root/chunk-tbpkh1zy.js";import"/$bunfs/root/chunk-843kre03.js";import"/$bunfs/root/chunk-3x88vsy7.js";import"/$bunfs/root/chunk-8jxxned0.js";import"/$bunfs/root/chunk-x31r83nz.js";import"/$bunfs/root/chunk-71zbyxdf.js";import"/$bunfs/root/chunk-20q5babf.js";import"/$bunfs/root/chunk-sw4c8z6t.js";import"/$bunfs/root/chunk-ebvrj09e.js";import"/$bunfs/root/chunk-gg61tmje.js";import"/$bunfs/root/chunk-j7xqd34f.js";import"/$bunfs/root/chunk-7q5pgenh.js";import"/$bunfs/root/chunk-6ab20r20.js";import"/$bunfs/root/chunk-hv6090k5.js";import{nbe}from"/$bunfs/root/chunk-x6fxb4j3.js";import{tl}from"/$bunfs/root/chunk-rzwqxt3v.js";import"/$bunfs/root/chunk-dphd06tg.js";import"/$bunfs/root/chunk-1tx1d40g.js";import"/$bunfs/root/chunk-8nk4yw0p.js";import"/$bunfs/root/chunk-dde73rk7.js";import"/$bunfs/root/chunk-jwwerfky.js";import"/$bunfs/root/chunk-pdqfh5em.js";import"/$bunfs/root/chunk-p6031f67.js";import"/$bunfs/root/chunk-ssw4v7fk.js";import"/$bunfs/root/chunk-c113sjy3.js";import"/$bunfs/root/chunk-kardmssy.js";import"/$bunfs/root/chunk-0pqqmh0e.js";import"/$bunfs/root/chunk-hyjn4arn.js";import{createPublicKey as l,verify as g}from"crypto";function y(t){let r={header:!1,verify:!0,checkExpiry:!0,help:!1};for(let e=0;e<t.length;e++){let n=t[e];switch(n){case"--help":case"-h":r.help=!0;break;case"--header":r.header=!0;break;case"--verify":r.verify=!0;break;case"--no-verify":r.verify=!1;break;case"--no-check-expiry":r.checkExpiry=!1;break;case"--api-url":{let o=t[++e];if(o===void 0)throw Error("decode-token: --api-url requires a value");r.apiUrl=o;break}default:if(n.startsWith("-"))throw Error(`decode-token: unknown flag ${n}`);if(r.token!==void 0)throw Error("decode-token: at most one positional token argument");r.token=n}}return r}function E(t){let e=t.trim().replace(/^sk-ant-[a-z0-9]+-/i,"").split(".");if(e.length!==3||!e[0]||!e[1]||!e[2])throw Error("decode-token: not a JWT \u2014 expected 3 dot-separated base64url segments "+`(after stripping any sk-ant- prefix), got ${e.length}`);return{headerB64:e[0],payloadB64:e[1],signatureB64:e[2]}}function u(t,r){if(!/^[A-Za-z0-9_-]+$/.test(t))throw Error(`decode-token: ${r} is not valid base64url (unexpected characters)`);let e=Buffer.from(t,"base64url").toString("utf8"),n;try{n=J(e)}catch(o){throw Error(`decode-token: ${r} is not valid JSON: ${o}`)}if(n===null||typeof n!=="object"||Array.isArray(n))throw Error(`decode-token: ${r} is not a JSON object`);return n}var S={ES256:"EC",RS256:"RSA"};function m(t,r=Math.floor(Date.now()/1000),e=60){let{exp:n,nbf:o}=t;if(typeof n!=="number")throw Error("decode-token: token has no numeric `exp` claim");if(r>n+e)throw Error(`decode-token: token EXPIRED at ${new Date(n*1000).toISOString()} (${Math.round(r-n)}s ago)`);if(typeof o==="number"&&r+e<o)throw Error(`decode-token: token not valid until ${new Date(o*1000).toISOString()}`)}async function x(t){let r=t.header.alg,e=t.header.kid;if(typeof r!=="string"||typeof e!=="string")throw Error("decode-token: JWT header is missing `alg` or `kid` \u2014 cannot select a JWKS key");let n=S[r];if(!n)throw Error(`decode-token: unsupported alg=${r} \u2014 only ES256 and RS256 are supported`);let o;try{o=await t.fetchFn(t.jwksUrl,{...ci({url:t.jwksUrl}),signal:AbortSignal.timeout(30000)})}catch(a){throw Error(`decode-token: failed to fetch JWKS from ${t.jwksUrl}: ${a}`)}if(!o.ok)throw Error(`decode-token: JWKS fetch returned ${o.status} ${o.statusText} for ${t.jwksUrl}`);let s=(await o.json()).keys?.find((a)=>a.kid===e);if(!s)throw Error(`decode-token: no JWKS key with kid=${e} at ${t.jwksUrl} \u2014 `+"token may be signed by a different environment (try --api-url).");if(s.kty!==n)throw Error(`decode-token: JWKS key kid=${e} has kty=${s.kty} but alg=${r} needs kty=${n}`);let c="sha256",d=r==="ES256"?{key:l({key:s,format:"jwk"}),dsaEncoding:"ieee-p1363"}:{key:l({key:s,format:"jwk"})},k=Buffer.from(`${t.headerB64}.${t.payloadB64}`,"utf8"),f=Buffer.from(t.signatureB64,"base64url");if(!g(c,k,d,f))throw Error("decode-token: signature verification FAILED");if(t.checkExpiry!==!1)m(t.payload);return{kid:e}}var h=16384,b=5000;async function v(t=process.stdin){if(t.isTTY)return"";let r=[],e=0;for await(let n of t){let o=Buffer.from(n);if(e+=o.length,e>h)throw Error(`decode-token: stdin exceeds ${h/1024} KiB; session-ingress JWTs are ~1 KB. Pass the token as an argument or set $CLAUDE_CODE_SESSION_ACCESS_TOKEN.`);r.push(o)}return Buffer.concat(r).toString("utf8")}async function _(t,r,e=process.stdin,n=b){if(t?.trim())return t.trim();let o=r.CLAUDE_CODE_SESSION_ACCESS_TOKEN?.trim();if(o)return o;let i=(await tl(v(e),n,"decode-token: reading token from stdin")).trim();if(i)return i;throw Error("decode-token: no token supplied. Pass it as an argument, pipe it on stdin, or set $CLAUDE_CODE_SESSION_ACCESS_TOKEN.")}var O=`Usage: claude self-hosted-runner decode-token [token] [options]

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
`),process.exit(1)}if(r.help)process.stdout.write(O),process.exit(0);try{let e=await _(r.token,process.env),{headerB64:n,payloadB64:o,signatureB64:i}=E(e),s=u(n,"header"),c=u(o,"payload");if(r.verify){let f=`${(r.apiUrl??nbe()).replace(/\/+$/,"")}/v1/code/.well-known/jwks.json`,{kid:p}=await x({headerB64:n,payloadB64:o,signatureB64:i,header:s,payload:c,jwksUrl:f,fetchFn:fetch,checkExpiry:r.checkExpiry}),a=r.checkExpiry?"sig+exp":"sig only, exp SKIPPED";process.stderr.write(`verified (kid=${p}, ${a})
`)}let d=r.header?s:c;process.stdout.write(`${w(d,null,2)}
`),process.exit(0)}catch(e){process.stderr.write(`${e instanceof Error?e.message:e}
`),process.exit(1)}}export{C as selfHostedRunnerDecodeTokenMain};
