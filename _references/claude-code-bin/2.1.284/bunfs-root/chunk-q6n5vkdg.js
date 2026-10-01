// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import"/$bunfs/root/chunk-3xweah4t.js";import"/$bunfs/root/chunk-37s48y77.js";import"/$bunfs/root/chunk-czwr6846.js";import"/$bunfs/root/chunk-31aa9k3a.js";import"/$bunfs/root/chunk-bz96yhka.js";import"/$bunfs/root/chunk-zy97v06w.js";import"/$bunfs/root/chunk-0j2vcydt.js";import"/$bunfs/root/chunk-yr0jgjsq.js";import"/$bunfs/root/chunk-k40f9rxb.js";import"/$bunfs/root/chunk-6v8fhz43.js";import"/$bunfs/root/chunk-8whxj5sg.js";import"/$bunfs/root/chunk-8zeg9165.js";import"/$bunfs/root/chunk-d37h8mav.js";import"/$bunfs/root/chunk-0pd7kjzx.js";import{b,J}from"/$bunfs/root/chunk-6b6gfk00.js";import"/$bunfs/root/chunk-7jxsf4cd.js";import"/$bunfs/root/chunk-k6n2tyj0.js";import"/$bunfs/root/chunk-320rdak1.js";import"/$bunfs/root/chunk-msjd5xeg.js";import"/$bunfs/root/chunk-7ckg8258.js";import"/$bunfs/root/chunk-h9xec3e4.js";import"/$bunfs/root/chunk-wt82nr44.js";import"/$bunfs/root/chunk-q5gkv7dz.js";import"/$bunfs/root/chunk-hf1cte62.js";import"/$bunfs/root/chunk-e1ahn80a.js";import"/$bunfs/root/chunk-h4npc7kp.js";import"/$bunfs/root/chunk-2rw92xpq.js";import"/$bunfs/root/chunk-abz0wvam.js";import"/$bunfs/root/chunk-gc37yxcb.js";import"/$bunfs/root/chunk-3xxkkv4v.js";import"/$bunfs/root/chunk-h6tt1g8k.js";import"/$bunfs/root/chunk-wan25qy3.js";import"/$bunfs/root/chunk-fybh7qze.js";import"/$bunfs/root/chunk-8jfh2rja.js";import"/$bunfs/root/chunk-1qy944sj.js";import"/$bunfs/root/chunk-kpm3vnff.js";import"/$bunfs/root/chunk-6hfhp7ca.js";import"/$bunfs/root/chunk-qcjafqk2.js";import"/$bunfs/root/chunk-hqy3a2gr.js";import"/$bunfs/root/chunk-ka4gnw3m.js";import"/$bunfs/root/chunk-x15v86ew.js";import"/$bunfs/root/chunk-rx56hxr8.js";import"/$bunfs/root/chunk-1zd4bz7m.js";import"/$bunfs/root/chunk-m399t3d8.js";import"/$bunfs/root/chunk-p1be706c.js";import"/$bunfs/root/chunk-r03mjfax.js";import"/$bunfs/root/chunk-kaskbbn0.js";import"/$bunfs/root/chunk-12vsw1j8.js";import"/$bunfs/root/chunk-v7906md2.js";import{bi}from"/$bunfs/root/chunk-bkr619pr.js";import"/$bunfs/root/chunk-swk3rjnt.js";import"/$bunfs/root/chunk-5z16fazy.js";import"/$bunfs/root/chunk-2rwe9v5c.js";import"/$bunfs/root/chunk-akb28a3m.js";import"/$bunfs/root/chunk-232c8jv2.js";import"/$bunfs/root/chunk-45j14f09.js";import"/$bunfs/root/chunk-5amhd006.js";import"/$bunfs/root/chunk-gqk3xdpc.js";import"/$bunfs/root/chunk-j70276wn.js";import"/$bunfs/root/chunk-6w7z3vez.js";import"/$bunfs/root/chunk-1rswn9n0.js";import"/$bunfs/root/chunk-023680d9.js";import"/$bunfs/root/chunk-n7t5rsss.js";import"/$bunfs/root/chunk-6vdt0hv3.js";import"/$bunfs/root/chunk-00mawwda.js";import"/$bunfs/root/chunk-vfge45b6.js";import"/$bunfs/root/chunk-qwx8d9cf.js";import"/$bunfs/root/chunk-ttv57pbg.js";import"/$bunfs/root/chunk-3zz7efen.js";import"/$bunfs/root/chunk-2b10qw5j.js";import"/$bunfs/root/chunk-dx46xds7.js";import"/$bunfs/root/chunk-6vtp2w5r.js";import"/$bunfs/root/chunk-cap10ns2.js";import"/$bunfs/root/chunk-b271vmpk.js";import"/$bunfs/root/chunk-8qxwgk4m.js";import"/$bunfs/root/chunk-w8rs8ehp.js";import{jOe}from"/$bunfs/root/chunk-7kta8qkf.js";import{nl}from"/$bunfs/root/chunk-06kfy1ax.js";import"/$bunfs/root/chunk-mz1dwgfm.js";import"/$bunfs/root/chunk-drw7d2f5.js";import"/$bunfs/root/chunk-46s09b52.js";import"/$bunfs/root/chunk-00nkznxh.js";import"/$bunfs/root/chunk-pbs1taz0.js";import"/$bunfs/root/chunk-g2fq1s1e.js";import"/$bunfs/root/chunk-9a48b7ac.js";import"/$bunfs/root/chunk-pd4sjd3m.js";import"/$bunfs/root/chunk-4w7hfzb9.js";import"/$bunfs/root/chunk-1kg329b6.js";import"/$bunfs/root/chunk-asz3893d.js";import"/$bunfs/root/chunk-yg7hj4df.js";import"/$bunfs/root/chunk-v96ev9bk.js";import"/$bunfs/root/chunk-vtvzrtws.js";import{createPublicKey as l,verify as g}from"crypto";function y(t){let r={header:!1,verify:!0,checkExpiry:!0,help:!1};for(let e=0;e<t.length;e++){let n=t[e];switch(n){case"--help":case"-h":r.help=!0;break;case"--header":r.header=!0;break;case"--verify":r.verify=!0;break;case"--no-verify":r.verify=!1;break;case"--no-check-expiry":r.checkExpiry=!1;break;case"--api-url":{let o=t[++e];if(o===void 0)throw Error("decode-token: --api-url requires a value");r.apiUrl=o;break}default:if(n.startsWith("-"))throw Error(`decode-token: unknown flag ${n}`);if(r.token!==void 0)throw Error("decode-token: at most one positional token argument");r.token=n}}return r}function w(t){let e=t.trim().replace(/^sk-ant-[a-z0-9]+-/i,"").split(".");if(e.length!==3||!e[0]||!e[1]||!e[2])throw Error("decode-token: not a JWT \u2014 expected 3 dot-separated base64url segments "+`(after stripping any sk-ant- prefix), got ${e.length}`);return{headerB64:e[0],payloadB64:e[1],signatureB64:e[2]}}function u(t,r){if(!/^[A-Za-z0-9_-]+$/.test(t))throw Error(`decode-token: ${r} is not valid base64url (unexpected characters)`);let e=Buffer.from(t,"base64url").toString("utf8"),n;try{n=J(e)}catch(o){throw Error(`decode-token: ${r} is not valid JSON: ${o}`)}if(n===null||typeof n!=="object"||Array.isArray(n))throw Error(`decode-token: ${r} is not a JSON object`);return n}var E={ES256:"EC",RS256:"RSA"};function S(t,r=Math.floor(Date.now()/1000),e=60){let{exp:n,nbf:o}=t;if(typeof n!=="number")throw Error("decode-token: token has no numeric `exp` claim");if(r>n+e)throw Error(`decode-token: token EXPIRED at ${new Date(n*1000).toISOString()} (${Math.round(r-n)}s ago)`);if(typeof o==="number"&&r+e<o)throw Error(`decode-token: token not valid until ${new Date(o*1000).toISOString()}`)}async function m(t){let r=t.header.alg,e=t.header.kid;if(typeof r!=="string"||typeof e!=="string")throw Error("decode-token: JWT header is missing `alg` or `kid` \u2014 cannot select a JWKS key");let n=E[r];if(!n)throw Error(`decode-token: unsupported alg=${r} \u2014 only ES256 and RS256 are supported`);let o;try{o=await t.fetchFn(t.jwksUrl,{...bi({url:t.jwksUrl}),signal:AbortSignal.timeout(30000)})}catch(a){throw Error(`decode-token: failed to fetch JWKS from ${t.jwksUrl}: ${a}`)}if(!o.ok)throw Error(`decode-token: JWKS fetch returned ${o.status} ${o.statusText} for ${t.jwksUrl}`);let s=(await o.json()).keys?.find((a)=>a.kid===e);if(!s)throw Error(`decode-token: no JWKS key with kid=${e} at ${t.jwksUrl} \u2014 `+"token may be signed by a different environment (try --api-url).");if(s.kty!==n)throw Error(`decode-token: JWKS key kid=${e} has kty=${s.kty} but alg=${r} needs kty=${n}`);let c="sha256",d=r==="ES256"?{key:l({key:s,format:"jwk"}),dsaEncoding:"ieee-p1363"}:{key:l({key:s,format:"jwk"})},k=Buffer.from(`${t.headerB64}.${t.payloadB64}`,"utf8"),f=Buffer.from(t.signatureB64,"base64url");if(!g(c,k,d,f))throw Error("decode-token: signature verification FAILED");if(t.checkExpiry!==!1)S(t.payload);return{kid:e}}var h=16384,x=5000;async function v(t=process.stdin){if(t.isTTY)return"";let r=[],e=0;for await(let n of t){let o=Buffer.from(n);if(e+=o.length,e>h)throw Error(`decode-token: stdin exceeds ${h/1024} KiB; session-ingress JWTs are ~1 KB. Pass the token as an argument or set $CLAUDE_CODE_SESSION_ACCESS_TOKEN.`);r.push(o)}return Buffer.concat(r).toString("utf8")}async function _(t,r,e=process.stdin,n=x){if(t?.trim())return t.trim();let o=r.CLAUDE_CODE_SESSION_ACCESS_TOKEN?.trim();if(o)return o;let i=(await nl(v(e),n,"decode-token: reading token from stdin")).trim();if(i)return i;throw Error("decode-token: no token supplied. Pass it as an argument, pipe it on stdin, or set $CLAUDE_CODE_SESSION_ACCESS_TOKEN.")}var O=`Usage: claude self-hosted-runner decode-token [token] [options]

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
`),process.exit(1)}if(r.help)process.stdout.write(O),process.exit(0);try{let e=await _(r.token,process.env),{headerB64:n,payloadB64:o,signatureB64:i}=w(e),s=u(n,"header"),c=u(o,"payload");if(r.verify){let f=`${(r.apiUrl??jOe()).replace(/\/+$/,"")}/v1/code/.well-known/jwks.json`,{kid:p}=await m({headerB64:n,payloadB64:o,signatureB64:i,header:s,payload:c,jwksUrl:f,fetchFn:fetch,checkExpiry:r.checkExpiry}),a=r.checkExpiry?"sig+exp":"sig only, exp SKIPPED";process.stderr.write(`verified (kid=${p}, ${a})
`)}let d=r.header?s:c;process.stdout.write(`${b(d,null,2)}
`),process.exit(0)}catch(e){process.stderr.write(`${e instanceof Error?e.message:e}
`),process.exit(1)}}export{C as selfHostedRunnerDecodeTokenMain};
