// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import"/$bunfs/root/chunk-0cfsneza.js";import"/$bunfs/root/chunk-dj0a6j9w.js";import"/$bunfs/root/chunk-dwaez71m.js";import"/$bunfs/root/chunk-ctczby4m.js";import"/$bunfs/root/chunk-bg5yf16b.js";import"/$bunfs/root/chunk-4dvekan0.js";import"/$bunfs/root/chunk-xz4v1m80.js";import"/$bunfs/root/chunk-8zh80t3g.js";import"/$bunfs/root/chunk-za1a5k6s.js";import"/$bunfs/root/chunk-v5r4yd9z.js";import"/$bunfs/root/chunk-9wvhp90s.js";import"/$bunfs/root/chunk-hbjpbz2q.js";import"/$bunfs/root/chunk-616rkgbc.js";import{b,Q}from"/$bunfs/root/chunk-6w550002.js";import"/$bunfs/root/chunk-99bwgrc6.js";import"/$bunfs/root/chunk-xjjs8j5r.js";import"/$bunfs/root/chunk-pn8bw28z.js";import"/$bunfs/root/chunk-hqt9kt0y.js";import"/$bunfs/root/chunk-cea3c58j.js";import"/$bunfs/root/chunk-3j80tytz.js";import"/$bunfs/root/chunk-sg1zq61w.js";import"/$bunfs/root/chunk-r27mnwfc.js";import"/$bunfs/root/chunk-gm7a1q0z.js";import"/$bunfs/root/chunk-vqc3jzpc.js";import"/$bunfs/root/chunk-159k5j1y.js";import"/$bunfs/root/chunk-v67w5hxq.js";import"/$bunfs/root/chunk-hd8cteey.js";import"/$bunfs/root/chunk-wk88sc60.js";import"/$bunfs/root/chunk-gzy4gw5z.js";import"/$bunfs/root/chunk-72z9esnx.js";import"/$bunfs/root/chunk-af9697mk.js";import"/$bunfs/root/chunk-sx8b1rzm.js";import"/$bunfs/root/chunk-a8hvh7yb.js";import"/$bunfs/root/chunk-qrvgaype.js";import"/$bunfs/root/chunk-e0kf4km8.js";import"/$bunfs/root/chunk-qzr619dd.js";import"/$bunfs/root/chunk-ky4en5r8.js";import"/$bunfs/root/chunk-fresvh3b.js";import"/$bunfs/root/chunk-dsxed40r.js";import"/$bunfs/root/chunk-x87h0mb8.js";import"/$bunfs/root/chunk-qpcfar25.js";import"/$bunfs/root/chunk-jp4b4n09.js";import"/$bunfs/root/chunk-abdftc9s.js";import"/$bunfs/root/chunk-byfkk95g.js";import"/$bunfs/root/chunk-3fx39wvj.js";import"/$bunfs/root/chunk-xxhrne1v.js";import"/$bunfs/root/chunk-j27hwf9z.js";import"/$bunfs/root/chunk-jbfd8z35.js";import"/$bunfs/root/chunk-sygqycmd.js";import"/$bunfs/root/chunk-h538pb3s.js";import{Ci}from"/$bunfs/root/chunk-cbbn560v.js";import"/$bunfs/root/chunk-4hjp8tw4.js";import"/$bunfs/root/chunk-qyzcm587.js";import"/$bunfs/root/chunk-ssek2nzf.js";import"/$bunfs/root/chunk-ne76aw40.js";import"/$bunfs/root/chunk-qbrmgrn3.js";import"/$bunfs/root/chunk-fkamvb6d.js";import"/$bunfs/root/chunk-z05n00bf.js";import"/$bunfs/root/chunk-xyn7z27x.js";import"/$bunfs/root/chunk-6cvgqsg4.js";import"/$bunfs/root/chunk-77r3ndma.js";import"/$bunfs/root/chunk-0wj52kch.js";import"/$bunfs/root/chunk-5cpw166p.js";import"/$bunfs/root/chunk-5rxa78mt.js";import"/$bunfs/root/chunk-av210xrn.js";import"/$bunfs/root/chunk-xb9gk5ty.js";import"/$bunfs/root/chunk-emacy6cx.js";import"/$bunfs/root/chunk-qhhdtf1y.js";import"/$bunfs/root/chunk-h62skk5a.js";import"/$bunfs/root/chunk-y6zh5p1t.js";import"/$bunfs/root/chunk-v1zj6cf5.js";import"/$bunfs/root/chunk-vhdpagqc.js";import"/$bunfs/root/chunk-y4jwayag.js";import"/$bunfs/root/chunk-p4dz1hva.js";import"/$bunfs/root/chunk-ywx8e53p.js";import"/$bunfs/root/chunk-j074gkdr.js";import"/$bunfs/root/chunk-8d79ynng.js";import"/$bunfs/root/chunk-t6fyc0vw.js";import"/$bunfs/root/chunk-yg955rx8.js";import"/$bunfs/root/chunk-jacnhntq.js";import{zMe}from"/$bunfs/root/chunk-v14nr0xa.js";import{qa}from"/$bunfs/root/chunk-mthzcbwz.js";import"/$bunfs/root/chunk-b7kxbgpq.js";import"/$bunfs/root/chunk-je15msha.js";import"/$bunfs/root/chunk-bffq7q3f.js";import"/$bunfs/root/chunk-cf03eapq.js";import"/$bunfs/root/chunk-fngseewt.js";import"/$bunfs/root/chunk-dxpdda9r.js";import"/$bunfs/root/chunk-e19m0xs0.js";import"/$bunfs/root/chunk-s0cxb520.js";import"/$bunfs/root/chunk-g3d91q8e.js";import"/$bunfs/root/chunk-6g5dctck.js";import"/$bunfs/root/chunk-gpjcjmkd.js";import"/$bunfs/root/chunk-7e9bymbc.js";import"/$bunfs/root/chunk-nptqjrtp.js";import{createPublicKey as l,verify as g}from"crypto";function y(t){let r={header:!1,verify:!0,checkExpiry:!0,help:!1};for(let e=0;e<t.length;e++){let n=t[e];switch(n){case"--help":case"-h":r.help=!0;break;case"--header":r.header=!0;break;case"--verify":r.verify=!0;break;case"--no-verify":r.verify=!1;break;case"--no-check-expiry":r.checkExpiry=!1;break;case"--api-url":{let o=t[++e];if(o===void 0)throw Error("decode-token: --api-url requires a value");r.apiUrl=o;break}default:if(n.startsWith("-"))throw Error(`decode-token: unknown flag ${n}`);if(r.token!==void 0)throw Error("decode-token: at most one positional token argument");r.token=n}}return r}function w(t){let e=t.trim().replace(/^sk-ant-[a-z0-9]+-/i,"").split(".");if(e.length!==3||!e[0]||!e[1]||!e[2])throw Error("decode-token: not a JWT \u2014 expected 3 dot-separated base64url segments "+`(after stripping any sk-ant- prefix), got ${e.length}`);return{headerB64:e[0],payloadB64:e[1],signatureB64:e[2]}}function u(t,r){if(!/^[A-Za-z0-9_-]+$/.test(t))throw Error(`decode-token: ${r} is not valid base64url (unexpected characters)`);let e=Buffer.from(t,"base64url").toString("utf8"),n;try{n=Q(e)}catch(o){throw Error(`decode-token: ${r} is not valid JSON: ${o}`)}if(n===null||typeof n!=="object"||Array.isArray(n))throw Error(`decode-token: ${r} is not a JSON object`);return n}var E={ES256:"EC",RS256:"RSA"};function S(t,r=Math.floor(Date.now()/1000),e=60){let{exp:n,nbf:o}=t;if(typeof n!=="number")throw Error("decode-token: token has no numeric `exp` claim");if(r>n+e)throw Error(`decode-token: token EXPIRED at ${new Date(n*1000).toISOString()} (${Math.round(r-n)}s ago)`);if(typeof o==="number"&&r+e<o)throw Error(`decode-token: token not valid until ${new Date(o*1000).toISOString()}`)}async function m(t){let r=t.header.alg,e=t.header.kid;if(typeof r!=="string"||typeof e!=="string")throw Error("decode-token: JWT header is missing `alg` or `kid` \u2014 cannot select a JWKS key");let n=E[r];if(!n)throw Error(`decode-token: unsupported alg=${r} \u2014 only ES256 and RS256 are supported`);let o;try{o=await t.fetchFn(t.jwksUrl,{...Ci({url:t.jwksUrl}),signal:AbortSignal.timeout(30000)})}catch(a){throw Error(`decode-token: failed to fetch JWKS from ${t.jwksUrl}: ${a}`)}if(!o.ok)throw Error(`decode-token: JWKS fetch returned ${o.status} ${o.statusText} for ${t.jwksUrl}`);let s=(await o.json()).keys?.find((a)=>a.kid===e);if(!s)throw Error(`decode-token: no JWKS key with kid=${e} at ${t.jwksUrl} \u2014 `+"token may be signed by a different environment (try --api-url).");if(s.kty!==n)throw Error(`decode-token: JWKS key kid=${e} has kty=${s.kty} but alg=${r} needs kty=${n}`);let c="sha256",d=r==="ES256"?{key:l({key:s,format:"jwk"}),dsaEncoding:"ieee-p1363"}:{key:l({key:s,format:"jwk"})},k=Buffer.from(`${t.headerB64}.${t.payloadB64}`,"utf8"),f=Buffer.from(t.signatureB64,"base64url");if(!g(c,k,d,f))throw Error("decode-token: signature verification FAILED");if(t.checkExpiry!==!1)S(t.payload);return{kid:e}}var h=16384,x=5000;async function v(t=process.stdin){if(t.isTTY)return"";let r=[],e=0;for await(let n of t){let o=Buffer.from(n);if(e+=o.length,e>h)throw Error(`decode-token: stdin exceeds ${h/1024} KiB; session-ingress JWTs are ~1 KB. Pass the token as an argument or set $CLAUDE_CODE_SESSION_ACCESS_TOKEN.`);r.push(o)}return Buffer.concat(r).toString("utf8")}async function _(t,r,e=process.stdin,n=x){if(t?.trim())return t.trim();let o=r.CLAUDE_CODE_SESSION_ACCESS_TOKEN?.trim();if(o)return o;let i=(await qa(v(e),n,"decode-token: reading token from stdin")).trim();if(i)return i;throw Error("decode-token: no token supplied. Pass it as an argument, pipe it on stdin, or set $CLAUDE_CODE_SESSION_ACCESS_TOKEN.")}var O=`Usage: claude self-hosted-runner decode-token [token] [options]

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
`),process.exit(1)}if(r.help)process.stdout.write(O),process.exit(0);try{let e=await _(r.token,process.env),{headerB64:n,payloadB64:o,signatureB64:i}=w(e),s=u(n,"header"),c=u(o,"payload");if(r.verify){let f=`${(r.apiUrl??zMe()).replace(/\/+$/,"")}/v1/code/.well-known/jwks.json`,{kid:p}=await m({headerB64:n,payloadB64:o,signatureB64:i,header:s,payload:c,jwksUrl:f,fetchFn:fetch,checkExpiry:r.checkExpiry}),a=r.checkExpiry?"sig+exp":"sig only, exp SKIPPED";process.stderr.write(`verified (kid=${p}, ${a})
`)}let d=r.header?s:c;process.stdout.write(`${b(d,null,2)}
`),process.exit(0)}catch(e){process.stderr.write(`${e instanceof Error?e.message:e}
`),process.exit(1)}}export{C as selfHostedRunnerDecodeTokenMain};
