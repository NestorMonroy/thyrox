// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Bpc as d,Lqc as A,cpc as o,opc as s,pqc as u}from"/$bunfs/root/_668.js";import{ZBc as r,kCc as p}from"/$bunfs/root/_695.js";import{Gcd as i,Hcd as g}from"/$bunfs/root/_813.js";import{nud as t,pud as c}from"/$bunfs/root/_829.js";import{xxd as a}from"/$bunfs/root/_837.js";import{hostname as m}from"os";function f(){return}function E(){return}function l(){let e=f();if(e!==void 0)return e;if(!r()||!d())return;return o()?.accessToken}async function R(e){if(!(t()&&e!==void 0))return l();let n=f();if(n!==void 0)return n;if(!r()||!await u(e))return;return(await s(e))?.accessToken}function U(){return E()??i().BASE_API_URL}function x(){let e=process.env.CLAUDE_REMOTE_CONTROL_SESSION_NAME_PREFIX||m();return _(e)||"remote-control"}function _(e){return e.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")}var S=a(()=>{g();c();A();p()});
export{f as VZb,E as WZb,l as XZb,R as YZb,U as ZZb,x as _Zb,_ as $Zb,S as a0b};
