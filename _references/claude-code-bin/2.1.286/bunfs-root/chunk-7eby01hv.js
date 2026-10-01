// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{Z}from"/$bunfs/root/chunk-bg5yf16b.js";import{aa}from"/$bunfs/root/chunk-pvn9g3xk.js";import{rne}from"/$bunfs/root/chunk-wp8qbz9d.js";import{Bs,Ec}from"/$bunfs/root/chunk-fngseewt.js";function NVn(o,e){if(o.type!=="pending")return!1;let n=Bs(o.name);return!e.some((t)=>Ec(t,o.name,n))}async function $Vn(o,e,n){let{maxWaitMs:t,until:s,pollMs:l=50}=n,i=(r)=>r.clients.some((c)=>e(c,r));if(!i(o()))return;let p=Date.now()+t;while(Date.now()<p){await Z(l);let r=o();if(s?.(r)||!i(r))return}}function VZo(o){return o.some(adn)}function adn(o){return"role"in o.config&&o.config.role==="comms"}function Rdt(o){return o.mcpInfo?.role==="comms"}function nJ(o){if(aa())return o.filter((e)=>!Rdt(e));return o}async function W$e(o){if(!aa())return;await $Vn(o,(e,n)=>NVn(e,n.tools)&&!adn(e),{maxWaitMs:rne})}
export{NVn,$Vn,VZo,adn,Rdt,nJ,W$e};
