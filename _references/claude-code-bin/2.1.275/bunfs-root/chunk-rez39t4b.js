// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{I}from"/$bunfs/root/chunk-xbd48fav.js";import{a}from"/$bunfs/root/chunk-crr3rzxx.js";import{Xo,re}from"/$bunfs/root/chunk-4bbpt7sc.js";import{d}from"/$bunfs/root/chunk-gh1pqen9.js";import{Ffe}from"/$bunfs/root/chunk-q2gh92k2.js";import{xu}from"/$bunfs/root/chunk-8f0aeskw.js";import{YUr}from"/$bunfs/root/chunk-y25z9m18.js";var C=0.5,l=1600,P=25000;function u(){let e=a.MAX_MCP_OUTPUT_TOKENS;if(e!==void 0&&e>0)return e;let t=I("tengu_velvet_ibis",{})?.mcp_tool;if(typeof t==="number"&&Number.isFinite(t)&&t>0)return t;return P}function g7(e){if(!e||typeof e==="string"||!Array.isArray(e))return e;let n=e,t=!1;for(let r of n)if(r.type==="text"&&"_meta"in r&&r._meta){t=!0;break}if(!t)return e;return n.map((r)=>{if(r.type==="text"&&"_meta"in r&&r._meta){let{_meta:o,...s}=r;return s}return r})}function f(e){return e.type==="text"}function p(e){return e.type==="image"}function Nwe(e){if(!e)return 0;if(typeof e==="string")return xu(e);if(!Array.isArray(e))return 0;return e.reduce((n,t)=>{if(f(t))return n+xu(t.text);else if(p(t))return n+l;return n},0)}function wde(){return u()*4}function M(){return`

[OUTPUT TRUNCATED - exceeded ${u()} token limit]

The tool output was truncated. If this MCP server provides pagination or filtering tools, use them to retrieve specific portions of the data. If pagination is not available, inform the user that you are working with truncated output and results may be incomplete.`}async function T(e,n){let t=[],r=0;for(let o of e)if(f(o)){let s=n-r;if(s<=0)break;if(o.text.length<=s)t.push(o),r+=o.text.length;else{let i=re(o.text,s);if(i){let c={type:"text",text:i};if(o._meta)c._meta=o._meta;t.push(c)}break}}else if(p(o)){let s=l*4;if(r+s<=n)t.push(o),r+=s;else{let i=n-r;if(i>0){let c=Math.floor(i*0.75);try{let m=await YUr(o,c);if(t.push(m),m.source.type==="base64")r+=m.source.data.length;else r+=s}catch{}}}}else t.push(o);return t}async function pit(e,n){if(!e)return!1;let t=Nwe(e);if(t<=u()*C)return!1;try{return(await Ffe(typeof e==="string"?[{role:"user",content:e}]:[{role:"user",content:e}],[],void 0,{credentials:n})??t)>u()}catch(r){return d(r),t>u()}}async function fit(e){if(!e)return e;let n=wde(),t=M();if(typeof e==="string")return Xo(e,n)+t;else{let r=await T(e,n);return r.push({type:"text",text:t}),r}}async function k5(e,n){if(!await pit(e,n))return e;return await fit(e)}
export{g7,Nwe,wde,pit,fit,k5};
