// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{Z}from"/$bunfs/root/chunk-7r0w3nmp.js";import{SOe}from"/$bunfs/root/chunk-4da97x13.js";import{Ei}from"/$bunfs/root/chunk-n6ggt83z.js";import{fi,qc}from"/$bunfs/root/chunk-ady37mbs.js";function B0n(o,e){if(o.type!=="pending")return!1;let n=fi(o.name);return!e.some((t)=>qc(t,o.name,n))}async function j0n(o,e,n){let{maxWaitMs:t,until:s,pollMs:l=50}=n,i=(r)=>r.clients.some((c)=>e(c,r));if(!i(o()))return;let p=Date.now()+t;while(Date.now()<p){await Z(l);let r=o();if(s?.(r)||!i(r))return}}function ENo(o){return o.some(D7t)}function D7t(o){return"role"in o.config&&o.config.role==="comms"}function vnt(o){return o.mcpInfo?.role==="comms"}function yY(o){if(Ei())return o.filter((e)=>!vnt(e));return o}async function bOe(o){if(!Ei())return;await j0n(o,(e,n)=>B0n(e,n.tools)&&!D7t(e),{maxWaitMs:SOe})}
export{B0n,j0n,ENo,D7t,vnt,yY,bOe};
