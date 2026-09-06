// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{i}from"/$bunfs/root/chunk-y9tkdj4c.js";import{u}from"/$bunfs/root/chunk-1m0n2kwr.js";import{l}from"/$bunfs/root/chunk-06whp1c5.js";import{S,n}from"/$bunfs/root/chunk-mh9y4c2z.js";var g=2000,c=["session_ingress_token","environment_secret","access_token","secret","token"],f=new RegExp(`"(${c.join("|")})"\\s*:\\s*"([^"]*)"`,"g"),p=16;function d(e){return e.replace(f,(o,r,t)=>{if(t.length<p)return`"${r}":"[REDACTED]"`;let s=`${t.slice(0,8)}...${t.slice(-4)}`;return`"${r}":"${s}"`})}function v9t(e){let o=e.replaceAll(`
`,"\\n");if(o.length<=g)return o;return o.slice(0,g)+`... (${o.length} chars)`}function vBe(e){let o=typeof e==="string"?e:S(e),r=d(o);if(r.length<=g)return r;return r.slice(0,g)+`... (${r.length} chars)`}function M7e(e){let o=l(e);if(e&&typeof e==="object"&&"response"in e){let r=e.response;if(r?.data&&typeof r.data==="object"){let t=r.data,s=typeof t.message==="string"?t.message:typeof t.error==="object"&&t.error&&("message"in t.error)&&typeof t.error.message==="string"?t.error.message:void 0;if(s)return`${o}: ${s}`}}return o}function Y_(e,o=Date.now()){if(!e)return;let r=Number(e);if(Number.isFinite(r)&&r>=0)return r*1000;let t=Date.parse(e);if(Number.isFinite(t)){let s=t-o;return s>0?s:void 0}return}function ug(e){if(!e||typeof e!=="object")return;if("message"in e&&typeof e.message==="string")return e.message;if("error"in e&&e.error!==null&&typeof e.error==="object"&&"message"in e.error&&typeof e.error.message==="string")return e.error.message;return}function lS(e,o,r,t){if(o)n(o);i("tengu_bridge_repl_skipped",{reason:u(e),...r!==void 0&&{v2:r},...t})}
export{v9t,vBe,M7e,Y_,ug,lS};
