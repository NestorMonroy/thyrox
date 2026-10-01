// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{z0n,mee,hPt}from"/$bunfs/root/chunk-qazw855w.js";import{Yd}from"/$bunfs/root/chunk-f74xvn8g.js";import{Plt}from"/$bunfs/root/chunk-9v35ka7v.js";import{U}from"/$bunfs/root/chunk-ngh4qh6e.js";function yQ(e){return Plt([...e]).filter((t)=>!z0n(t)&&!(t.type==="system"&&("persist"in t)&&t.persist===!1))}function vkn(e,t){let r={keys:U(e.filter((s)=>s.trim()!=="").flatMap(a)).sort((s,o)=>o.length-s.length),hits:0};return{messages:r.keys.length===0?t:t.flatMap((s)=>{if(s.role!=="user")return[s];let o=u(s.content,r);return o===void 0?[]:[{...s,content:o}]}),keys:r.keys.length,hits:r.hits}}function a(e){return(hPt({type:"cowork_memory_context",version:null,content:e,leg:"laptop"}).rendered??[]).flatMap(({content:t})=>typeof t==="string"?[t]:t.flatMap((r)=>r.type==="text"?[r.text]:[])).flatMap((t)=>[t.trim(),mee(t).trim()]).filter((t)=>t!==""&&t!==Yd)}function u(e,t){if(typeof e==="string"){let n=i(e,t);return p(n)?void 0:n}let r=e.flatMap((n)=>{if(l(n)){let s=i(n.text,t);return p(s)?[]:[{...n,text:s}]}if(y(n)&&n.content!==void 0)return[{...n,content:u(n.content,t)??""}];return[n]});return r.length===0?void 0:r}function l(e){return e.type==="text"&&"text"in e&&typeof e.text==="string"}function y(e){return e.type==="tool_result"}function i(e,t){let r=e;for(;;){let n=t.keys.find((o)=>r.includes(o));if(n===void 0)return r;let s=r.split(n);t.hits+=s.length-1,r=s.join("")}}function p(e){return mee(e).trim()===""}
export{yQ,vkn};
