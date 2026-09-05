// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{lxd as c,rxd as T}from"/$bunfs/root/_836.js";import{xxd as l}from"/$bunfs/root/_837.js";function x(r,t){return(e)=>r((S)=>u(S,t,S[t],e(S[t])))}function b(r){return(t)=>r((e)=>{let S=t(e);return Object.is(S,e)?e:{...e,...S}})}function g(r,t,e){return{get:()=>r()[e],set:x(t,e)}}function f(r,t){return(e,S)=>({get:()=>e()[r]??t,set:(a)=>S((s)=>{let n=s[r]??t;return u(s,r,n,a(n))})})}function F(r){let t=r;return{get:()=>t,set:(e)=>{t=e(t)}}}function K(r,t){let e=r,S=new Set,a=t&&c(t),s=()=>e;return{getSnapshot:s,getState:s,setState:(n)=>{let o=e,i=n(o);if(Object.is(i,o))return;e=i,a?.({newState:i,oldState:o});for(let d of S)d()},subscribe:(n)=>{let o=c(n);return S.add(o),()=>S.delete(o)}}}function u(r,t,e,S){return Object.is(S,e)?r:{...r,[t]:S}}var p=l(()=>{T()});
export{x as g3b,b as h3b,g as i3b,f as j3b,F as k3b,K as l3b,p as m3b};
