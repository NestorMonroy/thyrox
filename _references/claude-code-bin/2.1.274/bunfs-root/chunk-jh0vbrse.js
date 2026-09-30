// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{yLe}from"/$bunfs/root/chunk-mr16m2ca.js";import{lt}from"/$bunfs/root/chunk-hhj7f7ny.js";import{qc,EUe}from"/$bunfs/root/chunk-af9dczt1.js";import{hn,gm}from"/$bunfs/root/chunk-x31r83nz.js";import{fe}from"/$bunfs/root/chunk-nyqa6452.js";import{Ry,BEe,hfe}from"/$bunfs/root/chunk-53jbzskw.js";var n=[hn,gm].flatMap((e)=>[e,...EUe(e)]);function l(e){let o=[...Object.entries(e.options.toolAliases??{}),...Object.entries(fe(e).toolAliases??{})],s=o.flatMap(([t,i])=>[...n.includes(i)?[t]:[],...n.includes(t)?[i]:[]]),r=o.flatMap(([t,i])=>s.includes(i)?[t]:[]);return[...n,...s,...r]}function a(e,o){if(!e||e==="*")return!0;if(/^[a-zA-Z0-9_|, -]+$/.test(e))return e.split(/[|,]/).map((s)=>s.trim()).some((s)=>o.includes(s)||o.includes(qc(s)));try{let s=new RegExp(e);return o.some((r)=>s.test(r))}catch{return!0}}function u(){return lt().loadedModules.filter((e)=>!(e.name===yLe&&hfe(e)))}function d(e){return Ry("classic.PreToolUse",void 0,u())||e.some((o)=>Ry("tool.call",{tool:o})||Ry("tool.check",{tool:o}))}function wze(e){try{let o=l(e);if(d(o))return!0;if(e.sessionHooksRegistry.has(e.agentId??e.session.id,"PreToolUse"))return!0;return BEe("PreToolUse").some((s)=>a(s.matcher,o)&&s.hooks.some((r)=>!(r.type==="callback"&&r.internal===!0)))}catch{return!0}}
export{wze};
