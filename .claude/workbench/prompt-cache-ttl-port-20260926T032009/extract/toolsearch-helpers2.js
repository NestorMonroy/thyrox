function Q5n(e,n,r,s,g){if(e.length===0)return 0;try{let h=await IE(e,n,{activeAgents:r,allAgents:r},s,g);if(h===0)return null;return Math.max(0,h-mN)}catch{return null}}

Y5n=new K(()=>new syt);function X5n(e,n,r,s,g){let h=e.filter((B)=>Ife(B)),b=h.map((B)=>B.name).join(","),w=Y5n.of(W().host),M=w.lookup(b);if(M!==void 0)return M;let F=Q5n(h,n,r,s,g);return w.remembe

K5n=2.5;function ryt(e){let n=gg(e,GR(Uin(e))),r=gEe()/100;return Math.floor(n*r)}function V5n(e){return Math.floor(ryt(e)*K5n)}class syt{counts=new Map;lookup(e){return this.counts.get(e)}remember(e

mEe=10;function gEe(){let e=process.env.ENABLE_TOOL_SEARCH;if(!e)return mEe;if(e==="auto")return mEe;let n=TAr(e);if(n!==null)return n;return mEe}var K5n=2.5;function ryt(e){let n=gg(e,GR(Uin(e))),r=

function TAr(e){if(!e.startsWith("auto:"))return null;let r=e.slice(5),o=wc(r);if(isNaN(o))return t(`Invalid ENABLE_TOOL_SEARCH value "${e}": expected auto:N where N is a number.`),null;return Math.max(0,Math.min(100,o))}

// Ife: no hallado

function z8(e){let r=e.toLowerCase(),o=g();for(let i of o)if(r.includes(i.toLowerCase()))return!1;return!0}

function W8(e){if(De()!=="vertex")return!1;let r=Jn(e).replace(/[@-]\d{8}$/,"");if(/^claude-3(-|$)/.test(r))return!0;return/^claude-(opus|sonnet|haiku)-\d/.test(r)&&!mBn(r,E)}

function qpe(e,n){let r=Fpn();if(r.size===0)return!0;return!r.get(vh(e))?.has(n)}

function hh(){let e=Ait();if(e==="standard"){if(Na().claim("tool_search_optimistic_decision"))t(`[ToolSearch:optimistic] mode=${e}, ENABLE_TOOL_SEARCH=${a.ENABLE_TOOL_SEARCH}, result=false`);return!1}if(!a.ENABLE_TOOL_SEARCH&&!u()&&De()==="firstParty"&&!ks()){if(Na().claim("tool_search_optimistic_decision"))t(`[ToolSearch:optimistic] disabled: ANTHROPIC_BASE_URL=${a.ANTHROPIC_BASE_URL} is not a first-party Anthropic host. Set ENABLE_TOOL_SEARCH=true (or auto / auto:N) if your proxy forwards tool_reference blocks.`);return!1}if(Na().claim("tool_search_optimistic_decision"))t(`[ToolSearch:optimistic] mode=${e}, ENABLE_TOOL_SEARCH=${a.ENABLE_TOOL_SEARCH}, result=true`);return!0}

// CX: no hallado

function Ait(){if(BHt())return"standard";if(u())return"tst";let e=process.env.ENABLE_TOOL_SEARCH,r=e?TAr(e):null;if(r===0)return"tst";if(r===100)return"standard";if(m(e))return"tst-auto";if(Oe(e))return"tst";if(ko(e))return"standard";return"tst"}

// Uin: no hallado

// GR: no hallado

// gg: no hallado

// Ma: no hallado

