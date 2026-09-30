// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{Z}from"/$bunfs/root/chunk-t2x4z9pb.js";import{w8e}from"/$bunfs/root/chunk-2d3r7btt.js";import{si}from"/$bunfs/root/chunk-p4vt1n16.js";import{Si,vc}from"/$bunfs/root/chunk-0ahj7yw0.js";function Nhn(o,e){if(o.type!=="pending")return!1;let n=Si(o.name);return!e.some((t)=>vc(t,o.name,n))}async function $hn(o,e,n){let{maxWaitMs:t,until:s,pollMs:l=50}=n,i=(r)=>r.clients.some((c)=>e(c,r));if(!i(o()))return;let p=Date.now()+t;while(Date.now()<p){await Z(l);let r=o();if(s?.(r)||!i(r))return}}function Lso(o){return o.some($zt)}function $zt(o){return"role"in o.config&&o.config.role==="comms"}function S8e(o){return o.mcpInfo?.role==="comms"}function M4(o){if(si())return o.filter((e)=>!S8e(e));return o}async function DAe(o){if(!si())return;await $hn(o,(e,n)=>Nhn(e,n.tools)&&!$zt(e),{maxWaitMs:w8e})}
export{Nhn,$hn,Lso,$zt,S8e,M4,DAe};
