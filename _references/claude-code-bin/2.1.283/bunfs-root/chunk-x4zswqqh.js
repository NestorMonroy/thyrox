// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{Q}from"/$bunfs/root/chunk-jxwbd5gq.js";import{Li}from"/$bunfs/root/chunk-9acpw19g.js";import{jLe}from"/$bunfs/root/chunk-a46aq004.js";import{hi,Ic}from"/$bunfs/root/chunk-tp36n59y.js";function vjn(o,e){if(o.type!=="pending")return!1;let n=hi(o.name);return!e.some((t)=>Ic(t,o.name,n))}async function Ejn(o,e,n){let{maxWaitMs:t,until:s,pollMs:l=50}=n,i=(r)=>r.clients.some((c)=>e(c,r));if(!i(o()))return;let p=Date.now()+t;while(Date.now()<p){await Q(l);let r=o();if(s?.(r)||!i(r))return}}function J3o(o){return o.some(hin)}function hin(o){return"role"in o.config&&o.config.role==="comms"}function Pat(o){return o.mcpInfo?.role==="comms"}function V9(o){if(Li())return o.filter((e)=>!Pat(e));return o}async function CLe(o){if(!Li())return;await Ejn(o,(e,n)=>vjn(e,n.tools)&&!hin(e),{maxWaitMs:jLe})}
export{vjn,Ejn,J3o,hin,Pat,V9,CLe};
