// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{R}from"/$bunfs/root/chunk-4hjp8tw4.js";import{a}from"/$bunfs/root/chunk-v5r4yd9z.js";import{os,re}from"/$bunfs/root/chunk-xjjs8j5r.js";import{d}from"/$bunfs/root/chunk-hqt9kt0y.js";import{Qke}from"/$bunfs/root/chunk-kt4703ww.js";import{nd}from"/$bunfs/root/chunk-22qvrdjq.js";import{f0o}from"/$bunfs/root/chunk-aktncqwy.js";var C=0.5,l=1600,P=25000;function u(){let e=a.MAX_MCP_OUTPUT_TOKENS;if(e!==void 0&&e>0)return e;let t=R("tengu_velvet_ibis",{})?.mcp_tool;if(typeof t==="number"&&Number.isFinite(t)&&t>0)return t;return P}function Qie(e){if(!e||typeof e==="string"||!Array.isArray(e))return e;let n=e,t=!1;for(let r of n)if(r.type==="text"&&"_meta"in r&&r._meta){t=!0;break}if(!t)return e;return n.map((r)=>{if(r.type==="text"&&"_meta"in r&&r._meta){let{_meta:o,...s}=r;return s}return r})}function f(e){return e.type==="text"}function p(e){return e.type==="image"}function V0e(e){if(!e)return 0;if(typeof e==="string")return nd(e);if(!Array.isArray(e))return 0;return e.reduce((n,t)=>{if(f(t))return n+nd(t.text);else if(p(t))return n+l;return n},0)}function HEe(){return u()*4}var T="[OUTPUT TRUNCATED - exceeded ";function M(){return`

${T}${u()} token limit]

The tool output was truncated. If this MCP server provides pagination or filtering tools, use them to retrieve specific portions of the data. If pagination is not available, inform the user that you are working with truncated output and results may be incomplete.`}async function g(e,n){let t=[],r=0;for(let o of e)if(f(o)){let s=n-r;if(s<=0)break;if(o.text.length<=s)t.push(o),r+=o.text.length;else{let i=re(o.text,s);if(i){let c={type:"text",text:i};if(o._meta)c._meta=o._meta;t.push(c)}break}}else if(p(o)){let s=l*4;if(r+s<=n)t.push(o),r+=s;else{let i=n-r;if(i>0){let c=Math.floor(i*0.75);try{let m=await f0o(o,c);if(t.push(m),m.source.type==="base64")r+=m.source.data.length;else r+=s}catch{}}}}else t.push(o);return t}async function KRt(e,n){if(!e)return!1;let t=V0e(e);if(t<=u()*C)return!1;try{return(await Qke(typeof e==="string"?[{role:"user",content:e}]:[{role:"user",content:e}],[],void 0,{credentials:n})??t)>u()}catch(r){return d(r),t>u()}}async function YRt(e){if(!e)return e;let n=HEe(),t=M();if(typeof e==="string")return os(e,n)+t;else{let r=await g(e,n);return r.push({type:"text",text:t}),r}}async function QZ(e,n){if(!await KRt(e,n))return e;return await YRt(e)}
export{Qie,V0e,HEe,KRt,YRt,QZ};
