// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{Qe,Vt,dt,jn,pc,Wt}from"/$bunfs/root/chunk-8qt7d28b.js";import{_t}from"/$bunfs/root/chunk-xzt45tsb.js";var r=null,s=null,n=null,e={name:import.meta.require("/$bunfs/root/chunk-n1gbp6va.js").ARTIFACT_TOOL_NAME,names:import.meta.require("/$bunfs/root/chunk-n1gbp6va.js"),ui:import.meta.require("/$bunfs/root/chunk-yjnp7x04.js")},M=[_t,Qe,Vt,jn,dt,pc,Wt,...r?[r.name]:[],...s?[s.name]:[],...n?[n.name]:[],...e?[e.name,e.names.ARTIFACT_COMMENTS_TOOL_NAME,e.names.ARTIFACT_DATA_TOOL_NAME,e.names.ARTIFACT_CHECK_TOOL_NAME]:[]],T={get[_t](){return import.meta.require("/$bunfs/root/chunk-sg4kz8gp.js").renderToolUseMessage},get[Qe](){return import.meta.require("/$bunfs/root/chunk-jrkn7mhp.js").renderToolUseMessage},get[Vt](){return import.meta.require("/$bunfs/root/chunk-a5931tds.js").renderToolUseMessage},get[jn](){return import.meta.require("/$bunfs/root/chunk-kjz650hs.js").renderToolUseMessage},get[dt](){return import.meta.require("/$bunfs/root/chunk-e0wezn84.js").renderToolUseMessage},get[pc](){return import.meta.require("/$bunfs/root/chunk-eqhdhsj1.js").renderToolUseMessage},get[Wt](){return import.meta.require("/$bunfs/root/chunk-4p63nrwt.js").renderToolUseMessage},...r&&{[r.name]:r.ui.renderToolUseMessage},...s&&{[s.name]:s.ui.renderToolUseMessage},...n&&{[n.name]:n.ui.renderToolUseMessage},...e&&{[e.name]:e.ui.renderToolUseMessage,[e.names.ARTIFACT_COMMENTS_TOOL_NAME]:e.ui.renderCommentsToolUseMessage,[e.names.ARTIFACT_DATA_TOOL_NAME]:e.ui.renderDataToolUseMessage,[e.names.ARTIFACT_CHECK_TOOL_NAME]:e.ui.renderCheckToolUseMessage}};function Dye(o,t,l){if(o.renderToolUseMessage)return o.renderToolUseMessage(t,l);return ARe(o.name,t,l)}function ARe(o,t,l){if(Object.hasOwn(T,o))return T[o]?.(t,l);return null}
export{Dye,ARe};
