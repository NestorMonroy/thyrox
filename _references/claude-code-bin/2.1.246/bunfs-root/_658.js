// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Pcd as i,Rcd as a}from"/$bunfs/root/_814.js";import{jhd as f,mgd as g,ohd as _,ugd as d}from"/$bunfs/root/_820.js";import{Mud as c,zvd as p}from"/$bunfs/root/_831.js";import{xxd as u}from"/$bunfs/root/_837.js";function y(e){return e.replace(E,(t,n,r)=>{if(r.length<l)return`"${n}":"[REDACTED]"`;let s=`${r.slice(0,8)}...${r.slice(-4)}`;return`"${n}":"${s}"`})}function D(e){let t=e.replaceAll(`
`,"\\n");if(t.length<=o)return t;return t.slice(0,o)+`... (${t.length} chars)`}function k(e){let t=typeof e==="string"?e:g(e),n=y(t);if(n.length<=o)return n;return n.slice(0,o)+`... (${n.length} chars)`}function A(e){let t=c(e);if(e&&typeof e==="object"&&"response"in e){let n=e.response;if(n?.data&&typeof n.data==="object"){let r=n.data,s=typeof r.message==="string"?r.message:typeof r.error==="object"&&r.error&&("message"in r.error)&&typeof r.error.message==="string"?r.error.message:void 0;if(s)return`${t}: ${s}`}}return t}function w(e,t=Date.now()){if(!e)return;let n=Number(e);if(Number.isFinite(n)&&n>=0)return n*1000;let r=Date.parse(e);if(Number.isFinite(r)){let s=r-t;return s>0?s:void 0}return}function x(e){if(!e||typeof e!=="object")return;if("message"in e&&typeof e.message==="string")return e.message;if("error"in e&&e.error!==null&&typeof e.error==="object"&&"message"in e.error&&typeof e.error.message==="string")return e.error.message;return}function h(e,t,n,r){if(t)f(t);i("tengu_bridge_repl_skipped",{reason:e,...n!==void 0&&{v2:n},...r})}var o=2000,m,E,l=16;var S=u(()=>{a();_();p();d();m=["session_ingress_token","environment_secret","access_token","secret","token"],E=new RegExp(`"(${m.join("|")})"\\s*:\\s*"([^"]*)"`,"g")});
export{y as P8b,D as Q8b,k as R8b,A as S8b,w as T8b,x as U8b,h as V8b,S as W8b};
