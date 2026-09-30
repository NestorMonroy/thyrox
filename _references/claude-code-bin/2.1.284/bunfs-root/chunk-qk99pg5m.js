// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{mat}from"/$bunfs/root/chunk-c6yk6epa.js";import{Fl,rXe}from"/$bunfs/root/chunk-wan25qy3.js";import{bn,Zf}from"/$bunfs/root/chunk-ttv57pbg.js";import{pe}from"/$bunfs/root/chunk-69x9hhyp.js";import{nf}from"/$bunfs/root/chunk-hvr5mvxm.js";import{Jke}from"/$bunfs/root/chunk-z0ggv6c6.js";var n=[bn,Zf].flatMap((o)=>[o,...rXe(o)]);function l(o){let e=[...Object.entries(o.options.toolAliases??{}),...Object.entries(pe(o).toolAliases??{})],s=e.flatMap(([t,i])=>[...n.includes(i)?[t]:[],...n.includes(t)?[i]:[]]),r=e.flatMap(([t,i])=>s.includes(i)?[t]:[]);return[...n,...s,...r]}function a(o,e){if(!o||o==="*")return!0;if(/^[a-zA-Z0-9_|, -]+$/.test(o))return o.split(/[|,]/).map((s)=>s.trim()).some((s)=>e.includes(s)||e.includes(Fl(s)));try{let s=new RegExp(o);return e.some((r)=>s.test(r))}catch{return!0}}function p(o){return nf("classic.PreToolUse",void 0,mat())||o.some((e)=>nf("tool.call",{tool:e})||nf("tool.check",{tool:e}))}function UZe(o){try{let e=l(o);if(p(e))return!0;if(o.sessionHooksRegistry.has(o.agentId??o.session.id,"PreToolUse"))return!0;return Jke("PreToolUse").some((s)=>a(s.matcher,e)&&s.hooks.some((r)=>!(r.type==="callback"&&r.internal===!0)))}catch{return!0}}
export{UZe};
