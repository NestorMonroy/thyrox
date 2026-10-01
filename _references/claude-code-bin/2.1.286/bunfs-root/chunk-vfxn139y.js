// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{Ul,OJe}from"/$bunfs/root/chunk-sx8b1rzm.js";import{fn,mm}from"/$bunfs/root/chunk-v1zj6cf5.js";import{pe}from"/$bunfs/root/chunk-htraajbh.js";import{Qct}from"/$bunfs/root/chunk-8gjb4ft4.js";import{fd}from"/$bunfs/root/chunk-3kr151ph.js";import{lAe}from"/$bunfs/root/chunk-re947ka2.js";var n=[fn,mm].flatMap((o)=>[o,...OJe(o)]);function l(o){let e=[...Object.entries(o.options.toolAliases??{}),...Object.entries(pe(o).toolAliases??{})],s=e.flatMap(([t,i])=>[...n.includes(i)?[t]:[],...n.includes(t)?[i]:[]]),r=e.flatMap(([t,i])=>s.includes(i)?[t]:[]);return[...n,...s,...r]}function a(o,e){if(!o||o==="*")return!0;if(/^[a-zA-Z0-9_|, -]+$/.test(o))return o.split(/[|,]/).map((s)=>s.trim()).some((s)=>e.includes(s)||e.includes(Ul(s)));try{let s=new RegExp(o);return e.some((r)=>s.test(r))}catch{return!0}}function p(o){return fd("classic.PreToolUse",void 0,Qct())||o.some((e)=>fd("tool.call",{tool:e})||fd("tool.check",{tool:e}))}function wtt(o){try{let e=l(o);if(p(e))return!0;if(o.sessionHooksRegistry.has(o.agentId??o.session.id,"PreToolUse"))return!0;return lAe("PreToolUse").some((s)=>a(s.matcher,e)&&s.hooks.some((r)=>!(r.type==="callback"&&r.internal===!0)))}catch{return!0}}
export{wtt};
