// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{We,Nt,tt,Rn,Xl,zt}from"/$bunfs/root/chunk-btbsn9s4.js";import{mt}from"/$bunfs/root/chunk-6at0b5db.js";var r=null,s=null,n=null,e={name:import.meta.require("/$bunfs/root/chunk-jvrxb66y.js").ARTIFACT_TOOL_NAME,names:import.meta.require("/$bunfs/root/chunk-jvrxb66y.js"),ui:import.meta.require("/$bunfs/root/chunk-b2mr6kes.js")},M=[mt,We,Nt,Rn,tt,Xl,zt,...r?[r.name]:[],...s?[s.name]:[],...n?[n.name]:[],...e?[e.name,e.names.ARTIFACT_COMMENTS_TOOL_NAME,e.names.ARTIFACT_DATA_TOOL_NAME,e.names.ARTIFACT_CHECK_TOOL_NAME]:[]],T={get[mt](){return import.meta.require("/$bunfs/root/chunk-0mkp9jfg.js").renderToolUseMessage},get[We](){return import.meta.require("/$bunfs/root/chunk-1jw28ygk.js").renderToolUseMessage},get[Nt](){return import.meta.require("/$bunfs/root/chunk-p39fk0x7.js").renderToolUseMessage},get[Rn](){return import.meta.require("/$bunfs/root/chunk-ed44jtes.js").renderToolUseMessage},get[tt](){return import.meta.require("/$bunfs/root/chunk-78cbw56j.js").renderToolUseMessage},get[Xl](){return import.meta.require("/$bunfs/root/chunk-dfn75r77.js").renderToolUseMessage},get[zt](){return import.meta.require("/$bunfs/root/chunk-2dp320z1.js").renderToolUseMessage},...r&&{[r.name]:r.ui.renderToolUseMessage},...s&&{[s.name]:s.ui.renderToolUseMessage},...n&&{[n.name]:n.ui.renderToolUseMessage},...e&&{[e.name]:e.ui.renderToolUseMessage,[e.names.ARTIFACT_COMMENTS_TOOL_NAME]:e.ui.renderCommentsToolUseMessage,[e.names.ARTIFACT_DATA_TOOL_NAME]:e.ui.renderDataToolUseMessage,[e.names.ARTIFACT_CHECK_TOOL_NAME]:e.ui.renderCheckToolUseMessage}};function oSe(o,t,l){if(o.renderToolUseMessage)return o.renderToolUseMessage(t,l);return WHe(o.name,t,l)}function WHe(o,t,l){if(Object.hasOwn(T,o))return T[o]?.(t,l);return null}
export{oSe,WHe};
