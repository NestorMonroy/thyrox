// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{Ust}from"/$bunfs/root/chunk-aqjnefpv.js";import{jc,T8e}from"/$bunfs/root/chunk-sb0sw3zd.js";import{yn,Qf}from"/$bunfs/root/chunk-f31sk9qj.js";import{me}from"/$bunfs/root/chunk-4kmbys88.js";import{Vp}from"/$bunfs/root/chunk-ss489drq.js";import{WEe}from"/$bunfs/root/chunk-6hc3pqp4.js";var n=[yn,Qf].flatMap((o)=>[o,...T8e(o)]);function l(o){let e=[...Object.entries(o.options.toolAliases??{}),...Object.entries(me(o).toolAliases??{})],s=e.flatMap(([t,i])=>[...n.includes(i)?[t]:[],...n.includes(t)?[i]:[]]),r=e.flatMap(([t,i])=>s.includes(i)?[t]:[]);return[...n,...s,...r]}function a(o,e){if(!o||o==="*")return!0;if(/^[a-zA-Z0-9_|, -]+$/.test(o))return o.split(/[|,]/).map((s)=>s.trim()).some((s)=>e.includes(s)||e.includes(jc(s)));try{let s=new RegExp(o);return e.some((r)=>s.test(r))}catch{return!0}}function p(o){return Vp("classic.PreToolUse",void 0,Ust())||o.some((e)=>Vp("tool.call",{tool:e})||Vp("tool.check",{tool:e}))}function rQe(o){try{let e=l(o);if(p(e))return!0;if(o.sessionHooksRegistry.has(o.agentId??o.session.id,"PreToolUse"))return!0;return WEe("PreToolUse").some((s)=>a(s.matcher,e)&&s.hooks.some((r)=>!(r.type==="callback"&&r.internal===!0)))}catch{return!0}}
export{rQe};
