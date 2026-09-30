// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{Z}from"/$bunfs/root/chunk-bz96yhka.js";import{ea}from"/$bunfs/root/chunk-k4mbn7f5.js";import{Ete}from"/$bunfs/root/chunk-7mjdzab1.js";import{js,$c}from"/$bunfs/root/chunk-pbs1taz0.js";function _zn(o,e){if(o.type!=="pending")return!1;let n=js(o.name);return!e.some((t)=>$c(t,o.name,n))}async function bzn(o,e,n){let{maxWaitMs:t,until:s,pollMs:l=50}=n,i=(r)=>r.clients.some((c)=>e(c,r));if(!i(o()))return;let p=Date.now()+t;while(Date.now()<p){await Z(l);let r=o();if(s?.(r)||!i(r))return}}function nXo(o){return o.some(Aln)}function Aln(o){return"role"in o.config&&o.config.role==="comms"}function cct(o){return o.mcpInfo?.role==="comms"}function AX(o){if(ea())return o.filter((e)=>!cct(e));return o}async function FNe(o){if(!ea())return;await bzn(o,(e,n)=>_zn(e,n.tools)&&!Aln(e),{maxWaitMs:Ete})}
export{_zn,bzn,nXo,Aln,cct,AX,FNe};
