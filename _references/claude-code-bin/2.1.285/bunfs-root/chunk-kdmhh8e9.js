// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{Z}from"/$bunfs/root/chunk-dmpcy5p5.js";import{Zi}from"/$bunfs/root/chunk-nn1jvg99.js";import{lte}from"/$bunfs/root/chunk-mnj8v2t1.js";import{Us,Pc}from"/$bunfs/root/chunk-7a1w42qw.js";function $jn(o,e){if(o.type!=="pending")return!1;let n=Us(o.name);return!e.some((t)=>Pc(t,o.name,n))}async function Fjn(o,e,n){let{maxWaitMs:t,until:s,pollMs:l=50}=n,i=(r)=>r.clients.some((c)=>e(c,r));if(!i(o()))return;let p=Date.now()+t;while(Date.now()<p){await Z(l);let r=o();if(s?.(r)||!i(r))return}}function iXo(o){return o.some(Usn)}function Usn(o){return"role"in o.config&&o.config.role==="comms"}function Iat(o){return o.mcpInfo?.role==="comms"}function gX(o){if(Zi())return o.filter((e)=>!Iat(e));return o}async function DLe(o){if(!Zi())return;await Fjn(o,(e,n)=>$jn(e,n.tools)&&!Usn(e),{maxWaitMs:lte})}
export{$jn,Fjn,iXo,Usn,Iat,gX,DLe};
