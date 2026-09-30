// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import"/$bunfs/root/chunk-p5tw5mpf.js";import"/$bunfs/root/chunk-2j44ssk9.js";import"/$bunfs/root/chunk-vyyazxfq.js";import"/$bunfs/root/chunk-ern0s5ks.js";import"/$bunfs/root/chunk-jxwbd5gq.js";import"/$bunfs/root/chunk-yqm14hey.js";import"/$bunfs/root/chunk-4cnes656.js";import"/$bunfs/root/chunk-djetmnb8.js";import"/$bunfs/root/chunk-bnk68ax9.js";import"/$bunfs/root/chunk-b1cxch1w.js";import"/$bunfs/root/chunk-v49zfq06.js";import"/$bunfs/root/chunk-s1pmhfks.js";import"/$bunfs/root/chunk-nvht7ckf.js";import"/$bunfs/root/chunk-8nz62976.js";import{b,J}from"/$bunfs/root/chunk-zkn0228z.js";import"/$bunfs/root/chunk-19wkka67.js";import"/$bunfs/root/chunk-vq0drrah.js";import"/$bunfs/root/chunk-fmsbxtrp.js";import"/$bunfs/root/chunk-d96wy6r5.js";import"/$bunfs/root/chunk-4qt52w0w.js";import"/$bunfs/root/chunk-vrkqvgpe.js";import"/$bunfs/root/chunk-ab7mw5d9.js";import"/$bunfs/root/chunk-d09a8ccq.js";import"/$bunfs/root/chunk-1ay853f5.js";import"/$bunfs/root/chunk-379zyrv7.js";import"/$bunfs/root/chunk-qbkceaaj.js";import"/$bunfs/root/chunk-jwddn0q9.js";import"/$bunfs/root/chunk-4f2vnxsj.js";import"/$bunfs/root/chunk-crqvdanj.js";import"/$bunfs/root/chunk-pbnxt79v.js";import"/$bunfs/root/chunk-4vrsxfkn.js";import"/$bunfs/root/chunk-sb0sw3zd.js";import"/$bunfs/root/chunk-f5egm5fk.js";import"/$bunfs/root/chunk-mf83r1w7.js";import"/$bunfs/root/chunk-797phdpb.js";import"/$bunfs/root/chunk-3xbb0kgg.js";import"/$bunfs/root/chunk-wf6ne59j.js";import"/$bunfs/root/chunk-nhz4atva.js";import"/$bunfs/root/chunk-m8ebe51k.js";import"/$bunfs/root/chunk-4v1yym3m.js";import"/$bunfs/root/chunk-n043szf8.js";import"/$bunfs/root/chunk-8w2y72gy.js";import"/$bunfs/root/chunk-nzbykwxn.js";import"/$bunfs/root/chunk-sctj0cwn.js";import"/$bunfs/root/chunk-z0m8rp11.js";import"/$bunfs/root/chunk-ckctvm5v.js";import"/$bunfs/root/chunk-8t4prm0f.js";import"/$bunfs/root/chunk-4h0c4z04.js";import"/$bunfs/root/chunk-w920nhmq.js";import{yi}from"/$bunfs/root/chunk-0jw7026c.js";import"/$bunfs/root/chunk-t6pwageh.js";import"/$bunfs/root/chunk-56zaf0jn.js";import"/$bunfs/root/chunk-vmq4raye.js";import"/$bunfs/root/chunk-x5vr5vwm.js";import"/$bunfs/root/chunk-t0sp7zte.js";import"/$bunfs/root/chunk-bydh8jk1.js";import"/$bunfs/root/chunk-q8a07cv0.js";import"/$bunfs/root/chunk-4gwepcrh.js";import"/$bunfs/root/chunk-r5p5y4t8.js";import"/$bunfs/root/chunk-3cvbcwb5.js";import"/$bunfs/root/chunk-yebwkm0h.js";import"/$bunfs/root/chunk-47q8f7xm.js";import"/$bunfs/root/chunk-mmqkf96q.js";import"/$bunfs/root/chunk-n9sxb5zy.js";import"/$bunfs/root/chunk-vpxas6dq.js";import"/$bunfs/root/chunk-krqtcw03.js";import"/$bunfs/root/chunk-0yw1fewm.js";import"/$bunfs/root/chunk-f31sk9qj.js";import"/$bunfs/root/chunk-0grnxhq4.js";import"/$bunfs/root/chunk-ghnt4hjj.js";import"/$bunfs/root/chunk-2vygpg3s.js";import"/$bunfs/root/chunk-5mcqvwzx.js";import"/$bunfs/root/chunk-jzycvw5e.js";import"/$bunfs/root/chunk-fvmr4qjr.js";import"/$bunfs/root/chunk-xnq3esr9.js";import"/$bunfs/root/chunk-qmew55s4.js";import{xPe}from"/$bunfs/root/chunk-x9y6bvmb.js";import{Ya}from"/$bunfs/root/chunk-p9p7d515.js";import"/$bunfs/root/chunk-z2jrw0c8.js";import"/$bunfs/root/chunk-d9gd9m0n.js";import"/$bunfs/root/chunk-f3bx5v1a.js";import"/$bunfs/root/chunk-41vsymfs.js";import"/$bunfs/root/chunk-s7awe3vb.js";import"/$bunfs/root/chunk-tp36n59y.js";import"/$bunfs/root/chunk-dnk17b78.js";import"/$bunfs/root/chunk-xn8f4n02.js";import"/$bunfs/root/chunk-efenkdyy.js";import"/$bunfs/root/chunk-p19h7m67.js";import"/$bunfs/root/chunk-7k1142rf.js";import"/$bunfs/root/chunk-7h88gd3q.js";import"/$bunfs/root/chunk-m0scnq2s.js";import"/$bunfs/root/chunk-hxxjxc5v.js";import"/$bunfs/root/chunk-34s7cqpd.js";import{createPublicKey as l,verify as g}from"crypto";function y(t){let r={header:!1,verify:!0,checkExpiry:!0,help:!1};for(let e=0;e<t.length;e++){let n=t[e];switch(n){case"--help":case"-h":r.help=!0;break;case"--header":r.header=!0;break;case"--verify":r.verify=!0;break;case"--no-verify":r.verify=!1;break;case"--no-check-expiry":r.checkExpiry=!1;break;case"--api-url":{let o=t[++e];if(o===void 0)throw Error("decode-token: --api-url requires a value");r.apiUrl=o;break}default:if(n.startsWith("-"))throw Error(`decode-token: unknown flag ${n}`);if(r.token!==void 0)throw Error("decode-token: at most one positional token argument");r.token=n}}return r}function w(t){let e=t.trim().replace(/^sk-ant-[a-z0-9]+-/i,"").split(".");if(e.length!==3||!e[0]||!e[1]||!e[2])throw Error("decode-token: not a JWT \u2014 expected 3 dot-separated base64url segments "+`(after stripping any sk-ant- prefix), got ${e.length}`);return{headerB64:e[0],payloadB64:e[1],signatureB64:e[2]}}function u(t,r){if(!/^[A-Za-z0-9_-]+$/.test(t))throw Error(`decode-token: ${r} is not valid base64url (unexpected characters)`);let e=Buffer.from(t,"base64url").toString("utf8"),n;try{n=J(e)}catch(o){throw Error(`decode-token: ${r} is not valid JSON: ${o}`)}if(n===null||typeof n!=="object"||Array.isArray(n))throw Error(`decode-token: ${r} is not a JSON object`);return n}var E={ES256:"EC",RS256:"RSA"};function S(t,r=Math.floor(Date.now()/1000),e=60){let{exp:n,nbf:o}=t;if(typeof n!=="number")throw Error("decode-token: token has no numeric `exp` claim");if(r>n+e)throw Error(`decode-token: token EXPIRED at ${new Date(n*1000).toISOString()} (${Math.round(r-n)}s ago)`);if(typeof o==="number"&&r+e<o)throw Error(`decode-token: token not valid until ${new Date(o*1000).toISOString()}`)}async function m(t){let r=t.header.alg,e=t.header.kid;if(typeof r!=="string"||typeof e!=="string")throw Error("decode-token: JWT header is missing `alg` or `kid` \u2014 cannot select a JWKS key");let n=E[r];if(!n)throw Error(`decode-token: unsupported alg=${r} \u2014 only ES256 and RS256 are supported`);let o;try{o=await t.fetchFn(t.jwksUrl,{...yi({url:t.jwksUrl}),signal:AbortSignal.timeout(30000)})}catch(a){throw Error(`decode-token: failed to fetch JWKS from ${t.jwksUrl}: ${a}`)}if(!o.ok)throw Error(`decode-token: JWKS fetch returned ${o.status} ${o.statusText} for ${t.jwksUrl}`);let s=(await o.json()).keys?.find((a)=>a.kid===e);if(!s)throw Error(`decode-token: no JWKS key with kid=${e} at ${t.jwksUrl} \u2014 `+"token may be signed by a different environment (try --api-url).");if(s.kty!==n)throw Error(`decode-token: JWKS key kid=${e} has kty=${s.kty} but alg=${r} needs kty=${n}`);let c="sha256",d=r==="ES256"?{key:l({key:s,format:"jwk"}),dsaEncoding:"ieee-p1363"}:{key:l({key:s,format:"jwk"})},k=Buffer.from(`${t.headerB64}.${t.payloadB64}`,"utf8"),f=Buffer.from(t.signatureB64,"base64url");if(!g(c,k,d,f))throw Error("decode-token: signature verification FAILED");if(t.checkExpiry!==!1)S(t.payload);return{kid:e}}var h=16384,x=5000;async function v(t=process.stdin){if(t.isTTY)return"";let r=[],e=0;for await(let n of t){let o=Buffer.from(n);if(e+=o.length,e>h)throw Error(`decode-token: stdin exceeds ${h/1024} KiB; session-ingress JWTs are ~1 KB. Pass the token as an argument or set $CLAUDE_CODE_SESSION_ACCESS_TOKEN.`);r.push(o)}return Buffer.concat(r).toString("utf8")}async function _(t,r,e=process.stdin,n=x){if(t?.trim())return t.trim();let o=r.CLAUDE_CODE_SESSION_ACCESS_TOKEN?.trim();if(o)return o;let i=(await Ya(v(e),n,"decode-token: reading token from stdin")).trim();if(i)return i;throw Error("decode-token: no token supplied. Pass it as an argument, pipe it on stdin, or set $CLAUDE_CODE_SESSION_ACCESS_TOKEN.")}var O=`Usage: claude self-hosted-runner decode-token [token] [options]

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
`),process.exit(1)}if(r.help)process.stdout.write(O),process.exit(0);try{let e=await _(r.token,process.env),{headerB64:n,payloadB64:o,signatureB64:i}=w(e),s=u(n,"header"),c=u(o,"payload");if(r.verify){let f=`${(r.apiUrl??xPe()).replace(/\/+$/,"")}/v1/code/.well-known/jwks.json`,{kid:p}=await m({headerB64:n,payloadB64:o,signatureB64:i,header:s,payload:c,jwksUrl:f,fetchFn:fetch,checkExpiry:r.checkExpiry}),a=r.checkExpiry?"sig+exp":"sig only, exp SKIPPED";process.stderr.write(`verified (kid=${p}, ${a})
`)}let d=r.header?s:c;process.stdout.write(`${b(d,null,2)}
`),process.exit(0)}catch(e){process.stderr.write(`${e instanceof Error?e.message:e}
`),process.exit(1)}}export{C as selfHostedRunnerDecodeTokenMain};
