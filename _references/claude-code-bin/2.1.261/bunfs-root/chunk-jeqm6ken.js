// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{We,Ut,tt,Mn,Gl,Bt}from"/$bunfs/root/chunk-hyqdn9c0.js";import{mt}from"/$bunfs/root/chunk-h731djnm.js";var r=null,s=null,n=null,e={name:import.meta.require("/$bunfs/root/chunk-hx407jrw.js").ARTIFACT_TOOL_NAME,names:import.meta.require("/$bunfs/root/chunk-hx407jrw.js"),ui:import.meta.require("/$bunfs/root/chunk-qpq58qw9.js")},M=[mt,We,Ut,Mn,tt,Gl,Bt,...r?[r.name]:[],...s?[s.name]:[],...n?[n.name]:[],...e?[e.name,e.names.ARTIFACT_COMMENTS_TOOL_NAME,e.names.ARTIFACT_DATA_TOOL_NAME,e.names.ARTIFACT_CHECK_TOOL_NAME]:[]],T={get[mt](){return import.meta.require("/$bunfs/root/chunk-r37fxans.js").renderToolUseMessage},get[We](){return import.meta.require("/$bunfs/root/chunk-gfk3bh6c.js").renderToolUseMessage},get[Ut](){return import.meta.require("/$bunfs/root/chunk-jejp3rmj.js").renderToolUseMessage},get[Mn](){return import.meta.require("/$bunfs/root/chunk-bnag1gn1.js").renderToolUseMessage},get[tt](){return import.meta.require("/$bunfs/root/chunk-3whzf9ht.js").renderToolUseMessage},get[Gl](){return import.meta.require("/$bunfs/root/chunk-n9a5vfb1.js").renderToolUseMessage},get[Bt](){return import.meta.require("/$bunfs/root/chunk-djapmbkj.js").renderToolUseMessage},...r&&{[r.name]:r.ui.renderToolUseMessage},...s&&{[s.name]:s.ui.renderToolUseMessage},...n&&{[n.name]:n.ui.renderToolUseMessage},...e&&{[e.name]:e.ui.renderToolUseMessage,[e.names.ARTIFACT_COMMENTS_TOOL_NAME]:e.ui.renderCommentsToolUseMessage,[e.names.ARTIFACT_DATA_TOOL_NAME]:e.ui.renderDataToolUseMessage,[e.names.ARTIFACT_CHECK_TOOL_NAME]:e.ui.renderCheckToolUseMessage}};function y_e(o,t,l){if(o.renderToolUseMessage)return o.renderToolUseMessage(t,l);return jIe(o.name,t,l)}function jIe(o,t,l){if(Object.hasOwn(T,o))return T[o]?.(t,l);return null}
export{y_e,jIe};
