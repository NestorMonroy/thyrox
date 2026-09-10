// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{Qe,qt,dt,Gn,Sc,Wt}from"/$bunfs/root/chunk-x722nt0q.js";import{_t}from"/$bunfs/root/chunk-n4c82q7p.js";var r=null,s=null,n=null,e={name:import.meta.require("/$bunfs/root/chunk-x6shef4m.js").ARTIFACT_TOOL_NAME,names:import.meta.require("/$bunfs/root/chunk-x6shef4m.js"),ui:import.meta.require("/$bunfs/root/chunk-cn2y3gcd.js")},M=[_t,Qe,qt,Gn,dt,Sc,Wt,...r?[r.name]:[],...s?[s.name]:[],...n?[n.name]:[],...e?[e.name,e.names.ARTIFACT_COMMENTS_TOOL_NAME,e.names.ARTIFACT_DATA_TOOL_NAME,e.names.ARTIFACT_CHECK_TOOL_NAME]:[]],T={get[_t](){return import.meta.require("/$bunfs/root/chunk-cxv08pvw.js").renderToolUseMessage},get[Qe](){return import.meta.require("/$bunfs/root/chunk-y0yk10td.js").renderToolUseMessage},get[qt](){return import.meta.require("/$bunfs/root/chunk-92hdqb8c.js").renderToolUseMessage},get[Gn](){return import.meta.require("/$bunfs/root/chunk-hxv7tsfv.js").renderToolUseMessage},get[dt](){return import.meta.require("/$bunfs/root/chunk-ye7rdg2c.js").renderToolUseMessage},get[Sc](){return import.meta.require("/$bunfs/root/chunk-wa3f7f8f.js").renderToolUseMessage},get[Wt](){return import.meta.require("/$bunfs/root/chunk-ryyncye0.js").renderToolUseMessage},...r&&{[r.name]:r.ui.renderToolUseMessage},...s&&{[s.name]:s.ui.renderToolUseMessage},...n&&{[n.name]:n.ui.renderToolUseMessage},...e&&{[e.name]:e.ui.renderToolUseMessage,[e.names.ARTIFACT_COMMENTS_TOOL_NAME]:e.ui.renderCommentsToolUseMessage,[e.names.ARTIFACT_DATA_TOOL_NAME]:e.ui.renderDataToolUseMessage,[e.names.ARTIFACT_CHECK_TOOL_NAME]:e.ui.renderCheckToolUseMessage}};function M_e(o,t,l){if(o.renderToolUseMessage)return o.renderToolUseMessage(t,l);return Vxe(o.name,t,l)}function Vxe(o,t,l){if(Object.hasOwn(T,o))return T[o]?.(t,l);return null}
export{M_e,Vxe};
