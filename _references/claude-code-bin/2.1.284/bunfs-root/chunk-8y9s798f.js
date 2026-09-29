// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{c}from"/$bunfs/root/chunk-czwr6846.js";import{l}from"/$bunfs/root/chunk-31aa9k3a.js";import{i}from"/$bunfs/root/chunk-wt82nr44.js";import{b,t}from"/$bunfs/root/chunk-6b6gfk00.js";import{cn}from"/$bunfs/root/chunk-9a48b7ac.js";var g=2000,f=["session_ingress_token","environment_secret","access_token","secret","token"],u=new RegExp(`"(${f.join("|")})"\\s*:\\s*"[^"]*"`,"g");function p(e){return e.replace(u,'"$1":"[REDACTED]"')}function UKn(e){let r=e.replaceAll(`
`,"\\n");if(r.length<=g)return r;return r.slice(0,g)+`... (${r.length} chars)`}function fpn(e){let r=typeof e==="string"?e:b(e),n=p(r);if(n.length<=g)return n;return n.slice(0,g)+`... (${n.length} chars)`}function lJ(e){return`sha12:${cn(typeof e==="string"?e:`${b(e)}`)}`}function BKn(e){return typeof e==="string"&&/^[\w.-]{1,64}$/.test(e)?e:`<${typeof e}>`}function t$t(e){let r=l(e);if(e&&typeof e==="object"&&"response"in e){let n=e.response;if(n?.data&&typeof n.data==="object"){let o=n.data,s=typeof o.message==="string"?o.message:typeof o.error==="object"&&o.error&&("message"in o.error)&&typeof o.error.message==="string"?o.error.message:void 0;if(s)return`${r}: ${s}`}}return r}function Fm(e,r=Date.now()){if(!e)return;let n=Number(e);if(Number.isFinite(n)&&n>=0)return n*1000;let o=Date.parse(e);if(Number.isFinite(o)){let s=o-r;return s>0?s:void 0}return}function hp(e){if(!e||typeof e!=="object")return;if("message"in e&&typeof e.message==="string")return e.message;if("error"in e&&e.error!==null&&typeof e.error==="object"&&"message"in e.error&&typeof e.error.message==="string")return e.error.message;return}function Uv(e,r,n,o){if(r)t(r);i("tengu_bridge_repl_skipped",{reason:c(e),...n!==void 0&&{v2:n},...o})}
export{UKn,fpn,lJ,BKn,t$t,Fm,hp,Uv};
