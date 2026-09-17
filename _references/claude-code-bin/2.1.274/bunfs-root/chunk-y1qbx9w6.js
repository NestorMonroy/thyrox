// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{Ue,Mt,nt,vn,vc,Gt}from"/$bunfs/root/chunk-27bj2wbx.js";import{gt}from"/$bunfs/root/chunk-rkv2rwfe.js";var r=null,s=null,n=null,e={name:import.meta.require("/$bunfs/root/chunk-3aq8pdtf.js").ARTIFACT_TOOL_NAME,names:import.meta.require("/$bunfs/root/chunk-3aq8pdtf.js"),ui:import.meta.require("/$bunfs/root/chunk-69j2c7wj.js")},M=[gt,Ue,Mt,vn,nt,vc,Gt,...r?[r.name]:[],...s?[s.name]:[],...n?[n.name]:[],...e?[e.name,e.names.ARTIFACT_COMMENTS_TOOL_NAME,e.names.ARTIFACT_DATA_TOOL_NAME,e.names.ARTIFACT_CHECK_TOOL_NAME]:[]],T={get[gt](){return import.meta.require("/$bunfs/root/chunk-mc7tzbwg.js").renderToolUseMessage},get[Ue](){return import.meta.require("/$bunfs/root/chunk-jpj9tcqw.js").renderToolUseMessage},get[Mt](){return import.meta.require("/$bunfs/root/chunk-fvy1rwg6.js").renderToolUseMessage},get[vn](){return import.meta.require("/$bunfs/root/chunk-8as3qv0k.js").renderToolUseMessage},get[nt](){return import.meta.require("/$bunfs/root/chunk-12tdtqj6.js").renderToolUseMessage},get[vc](){return import.meta.require("/$bunfs/root/chunk-ykegwc7k.js").renderToolUseMessage},get[Gt](){return import.meta.require("/$bunfs/root/chunk-7d4yqtq2.js").renderToolUseMessage},...r&&{[r.name]:r.ui.renderToolUseMessage},...s&&{[s.name]:s.ui.renderToolUseMessage},...n&&{[n.name]:n.ui.renderToolUseMessage},...e&&{[e.name]:e.ui.renderToolUseMessage,[e.names.ARTIFACT_COMMENTS_TOOL_NAME]:e.ui.renderCommentsToolUseMessage,[e.names.ARTIFACT_DATA_TOOL_NAME]:e.ui.renderDataToolUseMessage,[e.names.ARTIFACT_CHECK_TOOL_NAME]:e.ui.renderCheckToolUseMessage}};function pIe(o,t,l){if(o.renderToolUseMessage)return o.renderToolUseMessage(t,l);return Rje(o.name,t,l)}function Rje(o,t,l){if(Object.hasOwn(T,o))return T[o]?.(t,l);return null}
export{pIe,Rje};
