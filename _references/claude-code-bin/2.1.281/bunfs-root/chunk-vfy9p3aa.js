// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
function dRt(n,i){let t=n.get(i);if(t)return t;let e=o(i),r;for(let[u,a]of n){let s=o(u);if(!s.includes("*")){if(s===e)return a}else if(r===void 0&&m(s,e))r=a}return r}function o(n){if(!n.startsWith("domain:"))return n;return`domain:${n.slice(7).toLowerCase().replace(/(?<=[^*.])\.+(?=(:\d+)?$)/,"")}`}function m(n,i){if(!n.startsWith("domain:")||!i.startsWith("domain:"))return!1;if(n==="domain:*")return!0;let t;if(n.startsWith("domain:*."))t=`^domain:(?:[^.:]+\\.)+${c(n.slice(9))}$`;else t=`^domain:${c(n.slice(7))}$`;return new RegExp(t,"i").test(i)}function c(n){return n.split("*").map((i)=>i.replace(/[.+?^${}()|[\]\\]/g,"\\$&")).join("[^.:]*")}function ypo(n,i){let t=o(`domain:${n}`),e=o(`domain:${i}`);return t.includes("*")?m(t,e):t===e}
export{dRt,ypo};
