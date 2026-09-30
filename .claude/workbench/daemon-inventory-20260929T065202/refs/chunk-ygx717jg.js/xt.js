==== xt: 1 definicion(es) de nivel superior
---- chunk-ygx717jg.js function xt [61621,61969)
async function xt(){let e=a.CLAUDE_BG_CLAIM_AUTH;delete process.env.CLAUDE_BG_CLAIM_AUTH;let r=a.CLAUDE_BG_SOCKET_TOKENS_PATH;if(delete process.env.CLAUDE_BG_SOCKET_TOKENS_PATH,!r)return e;let s=await hYe(r);if(await q(r).catch(()=>{}),!s?.claimAuth)t("[bg-spare] tokens file unreadable; claim gate degraded",{level:"warn"});return s?.claimAuth??e}
