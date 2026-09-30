// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{GW}from"/$bunfs/root/chunk-sentf9c1.js";import{S,$a}from"/$bunfs/root/chunk-nbcqw6vp.js";var d=/[\x7f-\x9f]/g,t=(e)=>e.replace(d,(r)=>`\\u${r.charCodeAt(0).toString(16).padStart(4,"0")}`),c=/[\x00-\x1f\x7f-\x9f]/g;function L5t(e){return e.replace(c,"")}function N5t(e,{verbose:r}){if(Object.keys(e).length===0)return"";let n=GW(e);if(n!==null)return n;return Object.entries(e).map(([o,i])=>{let s=t(S(i));return`${t($a(o).slice(1,-1))}: ${s}`}).join(", ")}
export{L5t,N5t};
