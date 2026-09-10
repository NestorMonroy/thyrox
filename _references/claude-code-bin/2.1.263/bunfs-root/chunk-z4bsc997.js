// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{We,Ut,tt,Mn,Gl,Bt}from"/$bunfs/root/chunk-32f2qmtc.js";import{mt}from"/$bunfs/root/chunk-7c0b379k.js";var r=null,s=null,n=null,e={name:import.meta.require("/$bunfs/root/chunk-6fy49509.js").ARTIFACT_TOOL_NAME,names:import.meta.require("/$bunfs/root/chunk-6fy49509.js"),ui:import.meta.require("/$bunfs/root/chunk-3qjfmx76.js")},M=[mt,We,Ut,Mn,tt,Gl,Bt,...r?[r.name]:[],...s?[s.name]:[],...n?[n.name]:[],...e?[e.name,e.names.ARTIFACT_COMMENTS_TOOL_NAME,e.names.ARTIFACT_DATA_TOOL_NAME,e.names.ARTIFACT_CHECK_TOOL_NAME]:[]],T={get[mt](){return import.meta.require("/$bunfs/root/chunk-23p36qct.js").renderToolUseMessage},get[We](){return import.meta.require("/$bunfs/root/chunk-qjz70zr0.js").renderToolUseMessage},get[Ut](){return import.meta.require("/$bunfs/root/chunk-zgct05s3.js").renderToolUseMessage},get[Mn](){return import.meta.require("/$bunfs/root/chunk-k3rvqnwc.js").renderToolUseMessage},get[tt](){return import.meta.require("/$bunfs/root/chunk-w8fayqmv.js").renderToolUseMessage},get[Gl](){return import.meta.require("/$bunfs/root/chunk-982zhg5v.js").renderToolUseMessage},get[Bt](){return import.meta.require("/$bunfs/root/chunk-9cqjhc12.js").renderToolUseMessage},...r&&{[r.name]:r.ui.renderToolUseMessage},...s&&{[s.name]:s.ui.renderToolUseMessage},...n&&{[n.name]:n.ui.renderToolUseMessage},...e&&{[e.name]:e.ui.renderToolUseMessage,[e.names.ARTIFACT_COMMENTS_TOOL_NAME]:e.ui.renderCommentsToolUseMessage,[e.names.ARTIFACT_DATA_TOOL_NAME]:e.ui.renderDataToolUseMessage,[e.names.ARTIFACT_CHECK_TOOL_NAME]:e.ui.renderCheckToolUseMessage}};function __e(o,t,l){if(o.renderToolUseMessage)return o.renderToolUseMessage(t,l);return jIe(o.name,t,l)}function jIe(o,t,l){if(Object.hasOwn(T,o))return T[o]?.(t,l);return null}
export{__e,jIe};
