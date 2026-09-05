// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{s}from"/$bunfs/root/chunk-62em4bpm.js";import{u}from"/$bunfs/root/chunk-mrh5xd2h.js";import{ll}from"/$bunfs/root/chunk-z0pftbew.js";import{v,k,j}from"/$bunfs/root/chunk-db688wrz.js";import{TB,OVt}from"/$bunfs/root/chunk-v5a5n21w.js";j();function ef(t,e,i){let o=ll(),n=o?OVt(t,e,o.bindings):void 0,r=n===void 0,_=o?"action_not_found":"no_context",f=k(!1);if(v(()=>{if(r&&!f.current)f.current=!0,s("tengu_keybinding_fallback_used",{action:t,context:u(e),fallback:i,reason:u(_)})},[r,t,e,i,_]),n===void 0)return i;return n===null?"":TB(n)}
export{ef};
