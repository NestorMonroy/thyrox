// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
function zZ(n,e){return n.flatMap((r,t)=>t?[e(t),r]:[r])}function J(n,e){let r=0;for(let t of n)r+=+!!e(t);return r}function te(n){return[...new Set(n)]}function Z2e(n,e){return n.map((t,o)=>e(t,o))}function TRe(n,e){if(e.length!==n.length)return;return[...e]}function mc(n){if(!Array.isArray(n))return[];return n.every((e)=>typeof e==="string")?n:n.filter((e)=>typeof e==="string")}
export{zZ,J,te,Z2e,TRe,mc};
