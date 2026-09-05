// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import"/$bunfs/root/chunk-j956zzb7.js";import"/$bunfs/root/chunk-ycrs8y50.js";import"/$bunfs/root/chunk-td0fv71w.js";import"/$bunfs/root/chunk-0sa7g6pk.js";import"/$bunfs/root/chunk-twjxwmnx.js";import"/$bunfs/root/chunk-ffgkv432.js";import"/$bunfs/root/chunk-cw80kq1q.js";import"/$bunfs/root/chunk-sr28hb79.js";import"/$bunfs/root/chunk-b1z7jvb2.js";import"/$bunfs/root/chunk-y7x1gsy0.js";import"/$bunfs/root/chunk-xtc2dmbe.js";import"/$bunfs/root/chunk-mrh5xd2h.js";import{b,K}from"/$bunfs/root/chunk-5nyank6v.js";import"/$bunfs/root/chunk-pz607n7v.js";import"/$bunfs/root/chunk-ctshp37x.js";import"/$bunfs/root/chunk-hfch6q45.js";import"/$bunfs/root/chunk-wv4b4ave.js";import"/$bunfs/root/chunk-tdsxb2n6.js";import"/$bunfs/root/chunk-8gx3t4ng.js";import"/$bunfs/root/chunk-62em4bpm.js";import"/$bunfs/root/chunk-krz8ngz3.js";import"/$bunfs/root/chunk-8qt7d28b.js";import"/$bunfs/root/chunk-64kpb0yv.js";import"/$bunfs/root/chunk-rfwkkcpg.js";import"/$bunfs/root/chunk-9d3jb7ss.js";import"/$bunfs/root/chunk-1ce1rf2k.js";import"/$bunfs/root/chunk-zmhk2tm0.js";import"/$bunfs/root/chunk-5wwsf42p.js";import"/$bunfs/root/chunk-b6yvqj2q.js";import"/$bunfs/root/chunk-650bcxer.js";import"/$bunfs/root/chunk-5nbfs0gy.js";import"/$bunfs/root/chunk-br7qz22q.js";import"/$bunfs/root/chunk-pewb9akp.js";import"/$bunfs/root/chunk-t5j5p2ne.js";import"/$bunfs/root/chunk-fkh93x1w.js";import"/$bunfs/root/chunk-d89fbdxm.js";import"/$bunfs/root/chunk-478fqyzs.js";import"/$bunfs/root/chunk-gvnmfkwa.js";import"/$bunfs/root/chunk-n6xww8f0.js";import"/$bunfs/root/chunk-0300m3ak.js";import"/$bunfs/root/chunk-6tm4k51s.js";import"/$bunfs/root/chunk-m7yvwazd.js";import"/$bunfs/root/chunk-zmtb7sjc.js";import"/$bunfs/root/chunk-7y3dpmev.js";import"/$bunfs/root/chunk-2gy6qgxb.js";import"/$bunfs/root/chunk-0bwkdgd7.js";import{Wi}from"/$bunfs/root/chunk-8p7g3f8s.js";import"/$bunfs/root/chunk-cnazfz7b.js";import"/$bunfs/root/chunk-vvp6yg1e.js";import"/$bunfs/root/chunk-bdjm18ys.js";import"/$bunfs/root/chunk-n91qqthe.js";import"/$bunfs/root/chunk-bmjyz6e1.js";import"/$bunfs/root/chunk-rb08vpfw.js";import"/$bunfs/root/chunk-1c73sb2f.js";import"/$bunfs/root/chunk-1azd6qmg.js";import"/$bunfs/root/chunk-6x6tyk1n.js";import"/$bunfs/root/chunk-g60xv35x.js";import"/$bunfs/root/chunk-1yhkg7x0.js";import"/$bunfs/root/chunk-0wc7a0ya.js";import"/$bunfs/root/chunk-mt21y33a.js";import"/$bunfs/root/chunk-qa9rwvaj.js";import"/$bunfs/root/chunk-tsnan5t5.js";import"/$bunfs/root/chunk-g9d7r5bw.js";import"/$bunfs/root/chunk-39bh7dex.js";import"/$bunfs/root/chunk-8qtdp828.js";import"/$bunfs/root/chunk-e45krqw9.js";import"/$bunfs/root/chunk-21p4p57y.js";import"/$bunfs/root/chunk-7npsafxm.js";import"/$bunfs/root/chunk-5cm9g8n5.js";import"/$bunfs/root/chunk-g790ebfk.js";import{sce}from"/$bunfs/root/chunk-p0v7g6r3.js";import{iu}from"/$bunfs/root/chunk-q205fnh1.js";import"/$bunfs/root/chunk-jvfbjppn.js";import"/$bunfs/root/chunk-vy72srn2.js";import"/$bunfs/root/chunk-kr0dzw6h.js";import"/$bunfs/root/chunk-kssh590p.js";import"/$bunfs/root/chunk-e979sk69.js";import"/$bunfs/root/chunk-dwwp0b8c.js";import{createPublicKey as l,verify as g}from"crypto";function y(t){let r={header:!1,verify:!0,checkExpiry:!0,help:!1};for(let e=0;e<t.length;e++){let n=t[e];switch(n){case"--help":case"-h":r.help=!0;break;case"--header":r.header=!0;break;case"--verify":r.verify=!0;break;case"--no-verify":r.verify=!1;break;case"--no-check-expiry":r.checkExpiry=!1;break;case"--api-url":{let o=t[++e];if(o===void 0)throw Error("decode-token: --api-url requires a value");r.apiUrl=o;break}default:if(n.startsWith("-"))throw Error(`decode-token: unknown flag ${n}`);if(r.token!==void 0)throw Error("decode-token: at most one positional token argument");r.token=n}}return r}function w(t){let e=t.trim().replace(/^sk-ant-[a-z0-9]+-/i,"").split(".");if(e.length!==3||!e[0]||!e[1]||!e[2])throw Error("decode-token: not a JWT \u2014 expected 3 dot-separated base64url segments "+`(after stripping any sk-ant- prefix), got ${e.length}`);return{headerB64:e[0],payloadB64:e[1],signatureB64:e[2]}}function u(t,r){if(!/^[A-Za-z0-9_-]+$/.test(t))throw Error(`decode-token: ${r} is not valid base64url (unexpected characters)`);let e=Buffer.from(t,"base64url").toString("utf8"),n;try{n=K(e)}catch(o){throw Error(`decode-token: ${r} is not valid JSON: ${o}`)}if(n===null||typeof n!=="object"||Array.isArray(n))throw Error(`decode-token: ${r} is not a JSON object`);return n}var E={ES256:"EC",RS256:"RSA"};function S(t,r=Math.floor(Date.now()/1000),e=60){let{exp:n,nbf:o}=t;if(typeof n!=="number")throw Error("decode-token: token has no numeric `exp` claim");if(r>n+e)throw Error(`decode-token: token EXPIRED at ${new Date(n*1000).toISOString()} (${Math.round(r-n)}s ago)`);if(typeof o==="number"&&r+e<o)throw Error(`decode-token: token not valid until ${new Date(o*1000).toISOString()}`)}async function m(t){let r=t.header.alg,e=t.header.kid;if(typeof r!=="string"||typeof e!=="string")throw Error("decode-token: JWT header is missing `alg` or `kid` \u2014 cannot select a JWKS key");let n=E[r];if(!n)throw Error(`decode-token: unsupported alg=${r} \u2014 only ES256 and RS256 are supported`);let o;try{o=await t.fetchFn(t.jwksUrl,{...Wi({url:t.jwksUrl}),signal:AbortSignal.timeout(30000)})}catch(a){throw Error(`decode-token: failed to fetch JWKS from ${t.jwksUrl}: ${a}`)}if(!o.ok)throw Error(`decode-token: JWKS fetch returned ${o.status} ${o.statusText} for ${t.jwksUrl}`);let s=(await o.json()).keys?.find((a)=>a.kid===e);if(!s)throw Error(`decode-token: no JWKS key with kid=${e} at ${t.jwksUrl} \u2014 `+"token may be signed by a different environment (try --api-url).");if(s.kty!==n)throw Error(`decode-token: JWKS key kid=${e} has kty=${s.kty} but alg=${r} needs kty=${n}`);let c="sha256",d=r==="ES256"?{key:l({key:s,format:"jwk"}),dsaEncoding:"ieee-p1363"}:{key:l({key:s,format:"jwk"})},k=Buffer.from(`${t.headerB64}.${t.payloadB64}`,"utf8"),f=Buffer.from(t.signatureB64,"base64url");if(!g(c,k,d,f))throw Error("decode-token: signature verification FAILED");if(t.checkExpiry!==!1)S(t.payload);return{kid:e}}var h=16384,x=5000;async function v(t=process.stdin){if(t.isTTY)return"";let r=[],e=0;for await(let n of t){let o=Buffer.from(n);if(e+=o.length,e>h)throw Error(`decode-token: stdin exceeds ${h/1024} KiB; session-ingress JWTs are ~1 KB. Pass the token as an argument or set $CLAUDE_CODE_SESSION_ACCESS_TOKEN.`);r.push(o)}return Buffer.concat(r).toString("utf8")}async function _(t,r,e=process.stdin,n=x){if(t?.trim())return t.trim();let o=r.CLAUDE_CODE_SESSION_ACCESS_TOKEN?.trim();if(o)return o;let i=(await iu(v(e),n,"decode-token: reading token from stdin")).trim();if(i)return i;throw Error("decode-token: no token supplied. Pass it as an argument, pipe it on stdin, or set $CLAUDE_CODE_SESSION_ACCESS_TOKEN.")}var O=`Usage: claude self-hosted-runner decode-token [token] [options]

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
`),process.exit(1)}if(r.help)process.stdout.write(O),process.exit(0);try{let e=await _(r.token,process.env),{headerB64:n,payloadB64:o,signatureB64:i}=w(e),s=u(n,"header"),c=u(o,"payload");if(r.verify){let f=`${(r.apiUrl??sce()).replace(/\/+$/,"")}/v1/code/.well-known/jwks.json`,{kid:p}=await m({headerB64:n,payloadB64:o,signatureB64:i,header:s,payload:c,jwksUrl:f,fetchFn:fetch,checkExpiry:r.checkExpiry}),a=r.checkExpiry?"sig+exp":"sig only, exp SKIPPED";process.stderr.write(`verified (kid=${p}, ${a})
`)}let d=r.header?s:c;process.stdout.write(`${b(d,null,2)}
`),process.exit(0)}catch(e){process.stderr.write(`${e instanceof Error?e.message:e}
`),process.exit(1)}}export{S as checkTokenTime,u as decodeSegment,y as parseDecodeTokenArgs,v as readStdin,_ as resolveToken,C as selfHostedRunnerDecodeTokenMain,w as splitJwt,m as verifyAgainstJwks};
