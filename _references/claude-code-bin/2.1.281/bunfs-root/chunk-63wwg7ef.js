// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{re,jr,xD}from"/$bunfs/root/chunk-nqsdwfmt.js";import{u}from"/$bunfs/root/chunk-0n80jtth.js";import{IAn}from"/$bunfs/root/chunk-4n4g22z6.js";import{LC}from"/$bunfs/root/chunk-049e548v.js";import{ii}from"/$bunfs/root/chunk-q68njzkf.js";var Fjt=5,aVr="Structured output was retracted by a model fallback and no retry produced a valid result",a=600;function lVr(t,r,e){if(r>0)return`Failed to provide surviving structured output after ${t} attempts (${r} retracted by a model fallback)`;let n=`Failed to provide valid structured output after ${t} attempts`;return e===void 0?n:`${n} \u2014 last StructuredOutput error: ${e}`}function w9n(t){let r=typeof t==="string"?t:Array.isArray(t)?t.flatMap((d)=>d.type==="text"?[d.text]:[]).join(`
`):void 0;if(r===void 0)return;let n=r.replace(/^<tool_use_error>/,"").replace(/<\/tool_use_error>$/,"").replace(IAn,`
`).split(`
`).map(xD).join(`
`),o=LC(n,{prependMarker:!1}).sanitized,s=jr(o);if(s.length===0)return;let i=s.length>a?re(s,a)+"\u2026":s;return LC(i,{prependMarker:!1}).sanitized}function cVr(t,r){try{let e=r===void 0?0:t.lastIndexOf(r)+1;return c(e===0?t:t.slice(e))}catch(e){u(e);return}}function c(t){let r=new Set;for(let e of t){if(e?.type!=="assistant")continue;let n=e.message.content;if(!Array.isArray(n))continue;for(let o of n)if(o.type==="tool_use"&&o.name===ii)r.add(o.id)}if(r.size===0)return;for(let e=t.length-1;e>=0;e--){let n=t[e];if(n?.type!=="user")continue;let o=n.message.content;if(!Array.isArray(o))continue;for(let s=o.length-1;s>=0;s--){let i=o[s];if(i?.type==="tool_result"&&i.is_error===!0&&r.has(i.tool_use_id))return w9n(i.content)}}return}
export{Fjt,aVr,lVr,w9n,cVr};
