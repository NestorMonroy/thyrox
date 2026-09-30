// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{Z}from"/$bunfs/root/chunk-dbjks79r.js";import{xi}from"/$bunfs/root/chunk-8zkbpy2r.js";import{RMe}from"/$bunfs/root/chunk-2qv6xw2q.js";import{_i,Jc}from"/$bunfs/root/chunk-ewsr9rhf.js";function l$n(o,e){if(o.type!=="pending")return!1;let n=_i(o.name);return!e.some((t)=>Jc(t,o.name,n))}async function c$n(o,e,n){let{maxWaitMs:t,until:s,pollMs:l=50}=n,i=(r)=>r.clients.some((c)=>e(c,r));if(!i(o()))return;let p=Date.now()+t;while(Date.now()<p){await Z(l);let r=o();if(s?.(r)||!i(r))return}}function Q1o(o){return o.some(Gtn)}function Gtn(o){return"role"in o.config&&o.config.role==="comms"}function Lot(o){return o.mcpInfo?.role==="comms"}function f8(o){if(xi())return o.filter((e)=>!Lot(e));return o}async function mMe(o){if(!xi())return;await c$n(o,(e,n)=>l$n(e,n.tools)&&!Gtn(e),{maxWaitMs:RMe})}
export{l$n,c$n,Q1o,Gtn,Lot,f8,mMe};
