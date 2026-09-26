// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{x}from"/$bunfs/root/chunk-wbbthbh9.js";import{a}from"/$bunfs/root/chunk-h56wjcte.js";import{ao,re}from"/$bunfs/root/chunk-shebh248.js";import{u}from"/$bunfs/root/chunk-xt60grfb.js";import{nwe}from"/$bunfs/root/chunk-c9jscxk0.js";import{Iu}from"/$bunfs/root/chunk-95enpx13.js";import{gyo}from"/$bunfs/root/chunk-3b0k6hhb.js";var P=0.5,f=1600,d=25000;function c(){let e=a.MAX_MCP_OUTPUT_TOKENS;if(e!==void 0&&e>0)return e;let t=x("tengu_velvet_ibis",{})?.mcp_tool;if(typeof t==="number"&&Number.isFinite(t)&&t>0)return t;return d}function Rre(e){if(!e||typeof e==="string"||!Array.isArray(e))return e;let n=e,t=!1;for(let r of n)if(r.type==="text"&&"_meta"in r&&r._meta){t=!0;break}if(!t)return e;return n.map((r)=>{if(r.type==="text"&&"_meta"in r&&r._meta){let{_meta:o,...s}=r;return s}return r})}function p(e){return e.type==="text"}function C(e){return e.type==="image"}function yPe(e){if(!e)return 0;if(typeof e==="string")return Iu(e);if(!Array.isArray(e))return 0;return e.reduce((n,t)=>{if(p(t))return n+Iu(t.text);else if(C(t))return n+f;return n},0)}function Hbe(){return c()*4}var T="[OUTPUT TRUNCATED - exceeded ";function M(){return`

${T}${c()} token limit]

The tool output was truncated. If this MCP server provides pagination or filtering tools, use them to retrieve specific portions of the data. If pagination is not available, inform the user that you are working with truncated output and results may be incomplete.`}async function g(e,n){let t=[],r=0;for(let o of e)if(p(o)){let s=n-r;if(s<=0)break;if(o.text.length<=s)t.push(o),r+=o.text.length;else{let i=re(o.text,s);if(i){let m={type:"text",text:i};if(o._meta)m._meta=o._meta;t.push(m)}break}}else if(C(o)){let s=f*4;if(r+s<=n)t.push(o),r+=s;else{let i=n-r;if(i>0){let m=Math.floor(i*0.75);try{let l=await gyo(o,m);if(t.push(l),l.source.type==="base64")r+=l.source.data.length;else r+=s}catch{}}}}else t.push(o);return t}async function Nwt(e,n){if(!e)return!1;let t=yPe(e);if(t<=c()*P)return!1;try{return(await nwe(typeof e==="string"?[{role:"user",content:e}]:[{role:"user",content:e}],[],void 0,{credentials:n})??t)>c()}catch(r){return u(r),t>c()}}async function $wt(e){if(!e)return e;let n=Hbe(),t=M();if(typeof e==="string")return ao(e,n)+t;else{let r=await g(e,n);return r.push({type:"text",text:t}),r}}async function ZJ(e,n){if(!await Nwt(e,n))return e;return await $wt(e)}
export{Rre,yPe,Hbe,Nwt,$wt,ZJ};
