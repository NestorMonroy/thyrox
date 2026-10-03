// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
function bue(n,e){return n.flatMap((r,t)=>t?[e(t),r]:[r])}function G(n,e){let r=0;for(let t of n)r+=+!!e(t);return r}function FR(n,e){if(n===e)return!0;if(n===void 0||e===void 0||n.length!==e.length)return!1;for(let r=0;r<n.length;r++)if(n[r]!==e[r])return!1;return!0}function U(n){return[...new Set(n)]}function li(n){if(!Array.isArray(n))return[];return n.every((e)=>typeof e==="string")?n:n.filter((e)=>typeof e==="string")}function EKr(n,e){let r=Math.min(n.length,e.length),t=0;while(t<r&&n[t]===e[t])t++;return t}
export{bue,G,FR,U,li,EKr};
