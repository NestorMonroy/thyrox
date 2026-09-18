// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{c$e}from"/$bunfs/root/chunk-twssyc65.js";import{dt}from"/$bunfs/root/chunk-26gtwdy5.js";import{nu,mje}from"/$bunfs/root/chunk-cwfdaz1m.js";import{Sn,Uf}from"/$bunfs/root/chunk-cf542jqn.js";import{pe}from"/$bunfs/root/chunk-zvswra5f.js";import{eh,rAe,Cme}from"/$bunfs/root/chunk-tqkssbef.js";var n=[Sn,Uf].flatMap((e)=>[e,...mje(e)]);function l(e){let o=[...Object.entries(e.options.toolAliases??{}),...Object.entries(pe(e).toolAliases??{})],s=o.flatMap(([t,i])=>[...n.includes(i)?[t]:[],...n.includes(t)?[i]:[]]),r=o.flatMap(([t,i])=>s.includes(i)?[t]:[]);return[...n,...s,...r]}function a(e,o){if(!e||e==="*")return!0;if(/^[a-zA-Z0-9_|, -]+$/.test(e))return e.split(/[|,]/).map((s)=>s.trim()).some((s)=>o.includes(s)||o.includes(nu(s)));try{let s=new RegExp(e);return o.some((r)=>s.test(r))}catch{return!0}}function u(){return dt().loadedModules.filter((e)=>!(e.name===c$e&&Cme(e)))}function d(e){return eh("classic.PreToolUse",void 0,u())||e.some((o)=>eh("tool.call",{tool:o})||eh("tool.check",{tool:o}))}function yGe(e){try{let o=l(e);if(d(o))return!0;if(e.sessionHooksRegistry.has(e.agentId??e.session.id,"PreToolUse"))return!0;return rAe("PreToolUse").some((s)=>a(s.matcher,o)&&s.hooks.some((r)=>!(r.type==="callback"&&r.internal===!0)))}catch{return!0}}
export{yGe};
