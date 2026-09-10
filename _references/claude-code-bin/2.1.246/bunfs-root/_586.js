// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{KXc as S,LWc as g}from"/$bunfs/root/_742.js";import{ZZc as y,o0c as K}from"/$bunfs/root/_751.js";import{B0c as p,G0c as l,O0c as j,z0c as r}from"/$bunfs/root/_753.js";import{xxd as h}from"/$bunfs/root/_837.js";import{basename as m,dirname as c}from"path";function x(n){return n.endsWith(".meta.json")?k(n):void 0}function k(n){let o=m(n);if(p(o))return;let s=y(),t=[o],e=c(n);while(e!==s&&t.length<=V+1){let a=c(e);if(a===e)return;t.unshift(m(e)),e=a}if(e!==s||t.length<3)return;let[d,f,...i]=t;if(!r(d)||!r(f)||i.length===0||!i.every(r))return;let u=l.sidecar(d,f,i);return g(u)===void 0?u:void 0}var V=6;var E=h(()=>{j();S();K()});
export{x as YPb,k as ZPb,E as _Pb};
