// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{owe,pXt}from"/$bunfs/root/chunk-c9jscxk0.js";import{Mu}from"/$bunfs/root/chunk-wbbthbh9.js";import{L}from"/$bunfs/root/chunk-2s9xnv72.js";function Yce(e){return e.filter((t)=>!(t.type==="attachment"&&t.attachment.type==="cowork_memory_context"&&t.attachment.leg==="laptop")&&!(t.type==="system"&&("persist"in t)&&t.persist===!1))}function vbn(e,t){let n={keys:L(e.filter((s)=>s.trim()!=="").flatMap(u)).sort((s,o)=>o.length-s.length),hits:0};return{messages:n.keys.length===0?t:t.flatMap((s)=>{if(s.role!=="user")return[s];let o=p(s.content,n);return o===void 0?[]:[{...s,content:o}]}),keys:n.keys.length,hits:n.hits}}function u(e){return(pXt({type:"cowork_memory_context",version:null,content:e,leg:"laptop"}).rendered??[]).flatMap(({content:t})=>typeof t==="string"?[t]:t.flatMap((n)=>n.type==="text"?[n.text]:[])).flatMap((t)=>[t.trim(),owe(t).trim()]).filter((t)=>t!==""&&t!==Mu)}function p(e,t){if(typeof e==="string"){let r=i(e,t);return a(r)?void 0:r}let n=e.flatMap((r)=>{if(l(r)){let s=i(r.text,t);return a(s)?[]:[{...r,text:s}]}if(y(r)&&r.content!==void 0)return[{...r,content:p(r.content,t)??""}];return[r]});return n.length===0?void 0:n}function l(e){return e.type==="text"&&"text"in e&&typeof e.text==="string"}function y(e){return e.type==="tool_result"}function i(e,t){let n=e;for(;;){let r=t.keys.find((o)=>n.includes(o));if(r===void 0)return n;let s=n.split(r);t.hits+=s.length-1,n=s.join("")}}function a(e){return owe(e).trim()===""}
export{Yce,vbn};
