// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{I}from"/$bunfs/root/chunk-32f2qmtc.js";import{a}from"/$bunfs/root/chunk-bxegdt3f.js";import{us,oe}from"/$bunfs/root/chunk-kqpqzcmv.js";import{h}from"/$bunfs/root/chunk-r1xh498w.js";import{Ac,Pte}from"/$bunfs/root/chunk-9wa0ka8p.js";import{TJn}from"/$bunfs/root/chunk-19had1cg.js";var C=0.5,l=1600,d=25000;function u(){let e=a.MAX_MCP_OUTPUT_TOKENS;if(e!==void 0&&e>0)return e;let t=I("tengu_velvet_ibis",{})?.mcp_tool;if(typeof t==="number"&&Number.isFinite(t)&&t>0)return t;return d}function k9(e){if(!e||typeof e==="string"||!Array.isArray(e))return e;let n=e,t=!1;for(let r of n)if(r.type==="text"&&"_meta"in r&&r._meta){t=!0;break}if(!t)return e;return n.map((r)=>{if(r.type==="text"&&"_meta"in r&&r._meta){let{_meta:o,...s}=r;return s}return r})}function f(e){return e.type==="text"}function p(e){return e.type==="image"}function Zle(e){if(!e)return 0;if(typeof e==="string")return Ac(e);if(!Array.isArray(e))return 0;return e.reduce((n,t)=>{if(f(t))return n+Ac(t.text);else if(p(t))return n+l;return n},0)}function See(){return u()*4}function P(){return`

[OUTPUT TRUNCATED - exceeded ${u()} token limit]

The tool output was truncated. If this MCP server provides pagination or filtering tools, use them to retrieve specific portions of the data. If pagination is not available, inform the user that you are working with truncated output and results may be incomplete.`}async function M(e,n){let t=[],r=0;for(let o of e)if(f(o)){let s=n-r;if(s<=0)break;if(o.text.length<=s)t.push(o),r+=o.text.length;else{let i=oe(o.text,s);if(i){let c={type:"text",text:i};if(o._meta)c._meta=o._meta;t.push(c)}break}}else if(p(o)){let s=l*4;if(r+s<=n)t.push(o),r+=s;else{let i=n-r;if(i>0){let c=Math.floor(i*0.75);try{let m=await TJn(o,c);if(t.push(m),m.source.type==="base64")r+=m.source.data.length;else r+=s}catch{}}}}else t.push(o);return t}async function GVe(e,n){if(!e)return!1;let t=Zle(e);if(t<=u()*C)return!1;try{return(await Pte(typeof e==="string"?[{role:"user",content:e}]:[{role:"user",content:e}],[],void 0,{credentials:n})??t)>u()}catch(r){return h(r),t>u()}}async function T(e){if(!e)return e;let n=See(),t=P();if(typeof e==="string")return us(e,n)+t;else{let r=await M(e,n);return r.push({type:"text",text:t}),r}}async function sW(e,n){if(!await GVe(e,n))return e;return await T(e)}
export{k9,Zle,See,GVe,sW};
