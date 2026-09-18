// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{l}from"/$bunfs/root/chunk-d5d0zdsy.js";import{c}from"/$bunfs/root/chunk-gytndg57.js";import{i}from"/$bunfs/root/chunk-bkjq2ptm.js";import{S,t}from"/$bunfs/root/chunk-4bbpt7sc.js";var g=2000,f=["session_ingress_token","environment_secret","access_token","secret","token"],u=new RegExp(`"(${f.join("|")})"\\s*:\\s*"([^"]*)"`,"g"),p=16;function d(e){return e.replace(u,(o,n,r)=>{if(r.length<p)return`"${n}":"[REDACTED]"`;let s=`${r.slice(0,8)}...${r.slice(-4)}`;return`"${n}":"${s}"`})}function DSn(e){let o=e.replaceAll(`
`,"\\n");if(o.length<=g)return o;return o.slice(0,g)+`... (${o.length} chars)`}function U9e(e){let o=typeof e==="string"?e:S(e),n=d(o);if(n.length<=g)return n;return n.slice(0,g)+`... (${n.length} chars)`}function U_t(e){let o=l(e);if(e&&typeof e==="object"&&"response"in e){let n=e.response;if(n?.data&&typeof n.data==="object"){let r=n.data,s=typeof r.message==="string"?r.message:typeof r.error==="object"&&r.error&&("message"in r.error)&&typeof r.error.message==="string"?r.error.message:void 0;if(s)return`${o}: ${s}`}}return o}function Ih(e,o=Date.now()){if(!e)return;let n=Number(e);if(Number.isFinite(n)&&n>=0)return n*1000;let r=Date.parse(e);if(Number.isFinite(r)){let s=r-o;return s>0?s:void 0}return}function mf(e){if(!e||typeof e!=="object")return;if("message"in e&&typeof e.message==="string")return e.message;if("error"in e&&e.error!==null&&typeof e.error==="object"&&"message"in e.error&&typeof e.error.message==="string")return e.error.message;return}function iS(e,o,n,r){if(o)t(o);i("tengu_bridge_repl_skipped",{reason:c(e),...n!==void 0&&{v2:n},...r})}
export{DSn,U9e,U_t,Ih,mf,iS};
