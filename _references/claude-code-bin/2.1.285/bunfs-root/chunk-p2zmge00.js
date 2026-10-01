// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{zT}from"/$bunfs/root/chunk-qazw855w.js";import{Eb,c_}from"/$bunfs/root/chunk-f74xvn8g.js";function o(e){let t=Eb(e);return t===Eb("")?"(unnamed agent)":t}function r(e,t,i){return`${o(e)} agent: ${c_(t,i)}`}function s(e,t,i){return{type:"notification",notification:{key:`agent-model-restricted-${o(e)}-${Eb(t)}`,text:r(e,t,i),priority:"medium",color:"warning",timeoutMs:1e4}}}function R6t(e,t){return(i,n)=>{t?.(s(e,i,n))}}function pfe(e,t){return(i,n)=>{t?.(zT(r(e,i,n),"warning"))}}
export{R6t,pfe};
