// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{oe,wo,kx}from"/$bunfs/root/chunk-py8dsda5.js";import{h}from"/$bunfs/root/chunk-e1njvp95.js";import{KUt,nI}from"/$bunfs/root/chunk-vd630rs0.js";import{ti}from"/$bunfs/root/chunk-71tvqbzt.js";var hdt=5,iGn="Structured output was retracted by a model fallback and no retry produced a valid result",d=600;function aGn(t,r,e){if(r>0)return`Failed to provide surviving structured output after ${t} attempts (${r} retracted by a model fallback)`;let n=`Failed to provide valid structured output after ${t} attempts`;return e===void 0?n:`${n} \u2014 last StructuredOutput error: ${e}`}function Rsn(t){let r=typeof t==="string"?t:Array.isArray(t)?t.flatMap((i)=>i.type==="text"?[i.text]:[]).join(`
`):void 0;if(r===void 0)return;let n=r.replace(/^<tool_use_error>/,"").replace(/<\/tool_use_error>$/,"").replace(KUt,`
`).split(`
`).map(kx).join(`
`),o=nI(n,{prependMarker:!1}).sanitized,u=wo(o);if(u.length===0)return;let s=u.length>d?oe(u,d)+"\u2026":u;return nI(s,{prependMarker:!1}).sanitized}function lGn(t,r){try{let e=r===void 0?0:t.lastIndexOf(r)+1;return a(e===0?t:t.slice(e))}catch(e){h(e);return}}function a(t){let r=new Set;for(let e of t){if(e?.type!=="assistant")continue;let n=e.message.content;if(!Array.isArray(n))continue;for(let o of n)if(o.type==="tool_use"&&o.name===ti)r.add(o.id)}if(r.size===0)return;for(let e=t.length-1;e>=0;e--){let n=t[e];if(n?.type!=="user")continue;let o=n.message.content;if(!Array.isArray(o))continue;for(let u=o.length-1;u>=0;u--){let s=o[u];if(s?.type==="tool_result"&&s.is_error===!0&&r.has(s.tool_use_id))return Rsn(s.content)}}return}
export{hdt,iGn,aGn,Rsn,lGn};
