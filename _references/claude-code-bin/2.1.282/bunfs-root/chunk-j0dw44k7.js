// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{zx}from"/$bunfs/root/chunk-c9jscxk0.js";import{Zw,n_}from"/$bunfs/root/chunk-wbbthbh9.js";function o(e){let t=Zw(e);return t===Zw("")?"(unnamed agent)":t}function r(e,t,i){return`${o(e)} agent: ${n_(t,i)}`}function s(e,t,i){return{type:"notification",notification:{key:`agent-model-restricted-${o(e)}-${Zw(t)}`,text:r(e,t,i),priority:"medium",color:"warning",timeoutMs:1e4}}}function JVt(e,t){return(i,n)=>{t?.(s(e,i,n))}}function bde(e,t){return(i,n)=>{t?.(zx(r(e,i,n),"warning"))}}
export{JVt,bde};
