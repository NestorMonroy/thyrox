// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import"/$bunfs/root/chunk-c6m7kw11.js";import"/$bunfs/root/chunk-fkak21hw.js";import"/$bunfs/root/chunk-aap6zsd0.js";import"/$bunfs/root/chunk-vqpmen5t.js";import"/$bunfs/root/chunk-dmpcy5p5.js";import"/$bunfs/root/chunk-actz3rxp.js";import"/$bunfs/root/chunk-v34cw0y6.js";import"/$bunfs/root/chunk-vtytg7jt.js";import"/$bunfs/root/chunk-z10rc4tf.js";import"/$bunfs/root/chunk-qs4mqgaa.js";import"/$bunfs/root/chunk-5054mktj.js";import"/$bunfs/root/chunk-b1a55n2g.js";import"/$bunfs/root/chunk-bxhyh54r.js";import"/$bunfs/root/chunk-k3gp1qmc.js";import{b,Q}from"/$bunfs/root/chunk-055ns4k8.js";import"/$bunfs/root/chunk-jsyn1gcs.js";import"/$bunfs/root/chunk-rg63yke9.js";import"/$bunfs/root/chunk-hjabkkf1.js";import"/$bunfs/root/chunk-mpc9nxv5.js";import"/$bunfs/root/chunk-5cmjjb37.js";import"/$bunfs/root/chunk-wr9nx1kq.js";import"/$bunfs/root/chunk-gn6mgw10.js";import"/$bunfs/root/chunk-dpwtsz9f.js";import"/$bunfs/root/chunk-7y7h3m02.js";import"/$bunfs/root/chunk-srhvbygf.js";import"/$bunfs/root/chunk-1m79ycfm.js";import"/$bunfs/root/chunk-gph9jdam.js";import"/$bunfs/root/chunk-ta8ma392.js";import"/$bunfs/root/chunk-e8wvqxfe.js";import"/$bunfs/root/chunk-thv2q2wm.js";import"/$bunfs/root/chunk-23df1pks.js";import"/$bunfs/root/chunk-b55ccf0t.js";import"/$bunfs/root/chunk-rh0avczn.js";import"/$bunfs/root/chunk-39a74rgt.js";import"/$bunfs/root/chunk-agdg3czn.js";import"/$bunfs/root/chunk-nsz480sc.js";import"/$bunfs/root/chunk-bgchm1w8.js";import"/$bunfs/root/chunk-g768q95w.js";import"/$bunfs/root/chunk-a1fdkwrj.js";import"/$bunfs/root/chunk-ztarcw08.js";import"/$bunfs/root/chunk-ts15vbh8.js";import"/$bunfs/root/chunk-kmk230n6.js";import"/$bunfs/root/chunk-aqx56v12.js";import"/$bunfs/root/chunk-wrvjx900.js";import"/$bunfs/root/chunk-xzfbbx57.js";import"/$bunfs/root/chunk-n0qz83r1.js";import"/$bunfs/root/chunk-g6a51st9.js";import"/$bunfs/root/chunk-hsxc9d35.js";import"/$bunfs/root/chunk-n2v4180x.js";import"/$bunfs/root/chunk-sgn7x12n.js";import{_i}from"/$bunfs/root/chunk-e2p4d1td.js";import"/$bunfs/root/chunk-f74xvn8g.js";import"/$bunfs/root/chunk-e178kbrw.js";import"/$bunfs/root/chunk-7rw7arkc.js";import"/$bunfs/root/chunk-97mvw3mk.js";import"/$bunfs/root/chunk-wyssq993.js";import"/$bunfs/root/chunk-kn03s03j.js";import"/$bunfs/root/chunk-vegxfg9d.js";import"/$bunfs/root/chunk-yrpa7y9e.js";import"/$bunfs/root/chunk-qfbb586n.js";import"/$bunfs/root/chunk-dwzmd53c.js";import"/$bunfs/root/chunk-5d5c7e2g.js";import"/$bunfs/root/chunk-4ckr9ryx.js";import"/$bunfs/root/chunk-vd01jhy3.js";import"/$bunfs/root/chunk-mbk7s6pb.js";import"/$bunfs/root/chunk-ff0zt7cd.js";import"/$bunfs/root/chunk-6vskt3q5.js";import"/$bunfs/root/chunk-abd6nk28.js";import"/$bunfs/root/chunk-yp0c47d4.js";import"/$bunfs/root/chunk-5zcypx67.js";import"/$bunfs/root/chunk-dd2zynyc.js";import"/$bunfs/root/chunk-8dcdden3.js";import"/$bunfs/root/chunk-g1at15hs.js";import"/$bunfs/root/chunk-rpt0hvfr.js";import"/$bunfs/root/chunk-dyk026rw.js";import"/$bunfs/root/chunk-vckxp12y.js";import"/$bunfs/root/chunk-te8frg39.js";import"/$bunfs/root/chunk-4dpwzxdy.js";import{LOe}from"/$bunfs/root/chunk-f5773cr9.js";import{Ua}from"/$bunfs/root/chunk-q19trt17.js";import"/$bunfs/root/chunk-btche4n0.js";import"/$bunfs/root/chunk-gfn67bwy.js";import"/$bunfs/root/chunk-3p89rsbh.js";import"/$bunfs/root/chunk-2edt3szn.js";import"/$bunfs/root/chunk-7a1w42qw.js";import"/$bunfs/root/chunk-2wxbpvj0.js";import"/$bunfs/root/chunk-fsez7m0p.js";import"/$bunfs/root/chunk-kb9b9z9h.js";import"/$bunfs/root/chunk-n12wgbvr.js";import"/$bunfs/root/chunk-74ez0jks.js";import"/$bunfs/root/chunk-w7hspz3v.js";import"/$bunfs/root/chunk-kgxwy2cg.js";import"/$bunfs/root/chunk-9qkr126n.js";import{createPublicKey as l,verify as g}from"crypto";function y(t){let r={header:!1,verify:!0,checkExpiry:!0,help:!1};for(let e=0;e<t.length;e++){let n=t[e];switch(n){case"--help":case"-h":r.help=!0;break;case"--header":r.header=!0;break;case"--verify":r.verify=!0;break;case"--no-verify":r.verify=!1;break;case"--no-check-expiry":r.checkExpiry=!1;break;case"--api-url":{let o=t[++e];if(o===void 0)throw Error("decode-token: --api-url requires a value");r.apiUrl=o;break}default:if(n.startsWith("-"))throw Error(`decode-token: unknown flag ${n}`);if(r.token!==void 0)throw Error("decode-token: at most one positional token argument");r.token=n}}return r}function w(t){let e=t.trim().replace(/^sk-ant-[a-z0-9]+-/i,"").split(".");if(e.length!==3||!e[0]||!e[1]||!e[2])throw Error("decode-token: not a JWT \u2014 expected 3 dot-separated base64url segments "+`(after stripping any sk-ant- prefix), got ${e.length}`);return{headerB64:e[0],payloadB64:e[1],signatureB64:e[2]}}function u(t,r){if(!/^[A-Za-z0-9_-]+$/.test(t))throw Error(`decode-token: ${r} is not valid base64url (unexpected characters)`);let e=Buffer.from(t,"base64url").toString("utf8"),n;try{n=Q(e)}catch(o){throw Error(`decode-token: ${r} is not valid JSON: ${o}`)}if(n===null||typeof n!=="object"||Array.isArray(n))throw Error(`decode-token: ${r} is not a JSON object`);return n}var E={ES256:"EC",RS256:"RSA"};function S(t,r=Math.floor(Date.now()/1000),e=60){let{exp:n,nbf:o}=t;if(typeof n!=="number")throw Error("decode-token: token has no numeric `exp` claim");if(r>n+e)throw Error(`decode-token: token EXPIRED at ${new Date(n*1000).toISOString()} (${Math.round(r-n)}s ago)`);if(typeof o==="number"&&r+e<o)throw Error(`decode-token: token not valid until ${new Date(o*1000).toISOString()}`)}async function m(t){let r=t.header.alg,e=t.header.kid;if(typeof r!=="string"||typeof e!=="string")throw Error("decode-token: JWT header is missing `alg` or `kid` \u2014 cannot select a JWKS key");let n=E[r];if(!n)throw Error(`decode-token: unsupported alg=${r} \u2014 only ES256 and RS256 are supported`);let o;try{o=await t.fetchFn(t.jwksUrl,{..._i({url:t.jwksUrl}),signal:AbortSignal.timeout(30000)})}catch(a){throw Error(`decode-token: failed to fetch JWKS from ${t.jwksUrl}: ${a}`)}if(!o.ok)throw Error(`decode-token: JWKS fetch returned ${o.status} ${o.statusText} for ${t.jwksUrl}`);let s=(await o.json()).keys?.find((a)=>a.kid===e);if(!s)throw Error(`decode-token: no JWKS key with kid=${e} at ${t.jwksUrl} \u2014 `+"token may be signed by a different environment (try --api-url).");if(s.kty!==n)throw Error(`decode-token: JWKS key kid=${e} has kty=${s.kty} but alg=${r} needs kty=${n}`);let c="sha256",d=r==="ES256"?{key:l({key:s,format:"jwk"}),dsaEncoding:"ieee-p1363"}:{key:l({key:s,format:"jwk"})},k=Buffer.from(`${t.headerB64}.${t.payloadB64}`,"utf8"),f=Buffer.from(t.signatureB64,"base64url");if(!g(c,k,d,f))throw Error("decode-token: signature verification FAILED");if(t.checkExpiry!==!1)S(t.payload);return{kid:e}}var h=16384,x=5000;async function v(t=process.stdin){if(t.isTTY)return"";let r=[],e=0;for await(let n of t){let o=Buffer.from(n);if(e+=o.length,e>h)throw Error(`decode-token: stdin exceeds ${h/1024} KiB; session-ingress JWTs are ~1 KB. Pass the token as an argument or set $CLAUDE_CODE_SESSION_ACCESS_TOKEN.`);r.push(o)}return Buffer.concat(r).toString("utf8")}async function _(t,r,e=process.stdin,n=x){if(t?.trim())return t.trim();let o=r.CLAUDE_CODE_SESSION_ACCESS_TOKEN?.trim();if(o)return o;let i=(await Ua(v(e),n,"decode-token: reading token from stdin")).trim();if(i)return i;throw Error("decode-token: no token supplied. Pass it as an argument, pipe it on stdin, or set $CLAUDE_CODE_SESSION_ACCESS_TOKEN.")}var O=`Usage: claude self-hosted-runner decode-token [token] [options]

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
`),process.exit(1)}if(r.help)process.stdout.write(O),process.exit(0);try{let e=await _(r.token,process.env),{headerB64:n,payloadB64:o,signatureB64:i}=w(e),s=u(n,"header"),c=u(o,"payload");if(r.verify){let f=`${(r.apiUrl??LOe()).replace(/\/+$/,"")}/v1/code/.well-known/jwks.json`,{kid:p}=await m({headerB64:n,payloadB64:o,signatureB64:i,header:s,payload:c,jwksUrl:f,fetchFn:fetch,checkExpiry:r.checkExpiry}),a=r.checkExpiry?"sig+exp":"sig only, exp SKIPPED";process.stderr.write(`verified (kid=${p}, ${a})
`)}let d=r.header?s:c;process.stdout.write(`${b(d,null,2)}
`),process.exit(0)}catch(e){process.stderr.write(`${e instanceof Error?e.message:e}
`),process.exit(1)}}export{C as selfHostedRunnerDecodeTokenMain};
