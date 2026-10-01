// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{aA}from"/$bunfs/root/chunk-kt4703ww.js";import{$b,T_}from"/$bunfs/root/chunk-4hjp8tw4.js";function o(e){let t=$b(e);return t===$b("")?"(unnamed agent)":t}function r(e,t,i){return`${o(e)} agent: ${T_(t,i)}`}function s(e,t,i){return{type:"notification",notification:{key:`agent-model-restricted-${o(e)}-${$b(t)}`,text:r(e,t,i),priority:"medium",color:"warning",timeoutMs:1e4}}}function G8t(e,t){return(i,n)=>{t?.(s(e,i,n))}}function Qfe(e,t){return(i,n)=>{t?.(aA(r(e,i,n),"warning"))}}
export{G8t,Qfe};
