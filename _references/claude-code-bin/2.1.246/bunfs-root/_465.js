// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Tbd as a}from"/$bunfs/root/_811.js";import{ncd as s}from"/$bunfs/root/_812.js";import{xxd as N}from"/$bunfs/root/_837.js";function u(){return s.CLAUDE_CODE_REMOTE||s.CLAUDE_CODE_PLUGIN_PREFER_HTTPS}function G(e){let o={};for(let[t,n]of Object.entries(i))if(e[t]===void 0)o[t]=n;return o}function I(e=process.env){return{...e,...i,...f(e.GIT_CONFIG_COUNT,[["credential.interactive","false"]])}}function f(e,o){let t=Number(e),n=Number.isInteger(t)&&t>0?t:0,r={GIT_CONFIG_COUNT:String(n+o.length)};return o.forEach(([c,T],_)=>{r[`GIT_CONFIG_KEY_${n+_}`]=c,r[`GIT_CONFIG_VALUE_${n+_}`]=T}),r}var i,P;var E=N(()=>{a();i={GIT_TERMINAL_PROMPT:"0",GIT_ASKPASS:"",GCM_INTERACTIVE:"never"};P=["-c","core.sshCommand=ssh -o BatchMode=yes -o StrictHostKeyChecking=yes"]});
export{u as z3a,i as A3a,G as B3a,I as C3a,f as D3a,P as E3a,E as F3a};
