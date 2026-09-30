// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{Z}from"/$bunfs/root/chunk-akpzg2yh.js";import{E6e}from"/$bunfs/root/chunk-6n2kdfzz.js";import{si}from"/$bunfs/root/chunk-yhbpdhx0.js";import{bi,fc}from"/$bunfs/root/chunk-p6031f67.js";function Upn(o,e){if(o.type!=="pending")return!1;let n=bi(o.name);return!e.some((t)=>fc(t,o.name,n))}async function Bpn(o,e,n){let{maxWaitMs:t,until:s,pollMs:l=50}=n,i=(r)=>r.clients.some((c)=>e(c,r));if(!i(o()))return;let p=Date.now()+t;while(Date.now()<p){await Z(l);let r=o();if(s?.(r)||!i(r))return}}function KQr(o){return o.some(wBt)}function wBt(o){return"role"in o.config&&o.config.role==="comms"}function v6e(o){return o.mcpInfo?.role==="comms"}function KK(o){if(si())return o.filter((e)=>!v6e(e));return o}async function fke(o){if(!si())return;await Bpn(o,(e,n)=>Upn(e,n.tools)&&!wBt(e),{maxWaitMs:E6e})}
export{Upn,Bpn,KQr,wBt,v6e,KK,fke};
