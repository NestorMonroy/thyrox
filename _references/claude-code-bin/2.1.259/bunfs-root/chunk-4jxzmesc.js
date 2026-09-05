// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{s}from"/$bunfs/root/chunk-9f9fskgc.js";import{u}from"/$bunfs/root/chunk-97tbrkcc.js";import{ul}from"/$bunfs/root/chunk-s2qjm80t.js";import{v,k,j}from"/$bunfs/root/chunk-w71cs9yg.js";import{OB,xqt}from"/$bunfs/root/chunk-s2qv9t07.js";j();function cf(t,e,i){let o=ul(),n=o?xqt(t,e,o.bindings):void 0,r=n===void 0,_=o?"action_not_found":"no_context",f=k(!1);if(v(()=>{if(r&&!f.current)f.current=!0,s("tengu_keybinding_fallback_used",{action:t,context:u(e),fallback:i,reason:u(_)})},[r,t,e,i,_]),n===void 0)return i;return n===null?"":OB(n)}
export{cf};
