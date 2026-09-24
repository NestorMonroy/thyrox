// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{Ax}from"/$bunfs/root/chunk-4n4g22z6.js";import{Gw,Wy}from"/$bunfs/root/chunk-5khn4tvf.js";function o(e){let t=Gw(e);return t===Gw("")?"(unnamed agent)":t}function r(e,t,i){return`${o(e)} agent: ${Wy(t,i)}`}function s(e,t,i){return{type:"notification",notification:{key:`agent-model-restricted-${o(e)}-${Gw(t)}`,text:r(e,t,i),priority:"medium",color:"warning",timeoutMs:1e4}}}function sqt(e,t){return(i,n)=>{t?.(s(e,i,n))}}function Dce(e,t){return(i,n)=>{t?.(Ax(r(e,i,n),"warning"))}}
export{sqt,Dce};
