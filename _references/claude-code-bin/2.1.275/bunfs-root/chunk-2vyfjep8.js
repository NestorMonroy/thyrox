// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{je,Lt,rt,vn,Qc,Kt}from"/$bunfs/root/chunk-xbd48fav.js";import{ht}from"/$bunfs/root/chunk-exbwc9fd.js";var r=null,s=null,n=null,e={name:import.meta.require("/$bunfs/root/chunk-8r6hydjw.js").ARTIFACT_TOOL_NAME,names:import.meta.require("/$bunfs/root/chunk-8r6hydjw.js"),ui:import.meta.require("/$bunfs/root/chunk-381j00m8.js")},M=[ht,je,Lt,vn,rt,Qc,Kt,...r?[r.name]:[],...s?[s.name]:[],...n?[n.name]:[],...e?[e.name,e.names.ARTIFACT_COMMENTS_TOOL_NAME,e.names.ARTIFACT_DATA_TOOL_NAME,e.names.ARTIFACT_CHECK_TOOL_NAME]:[]],T={get[ht](){return import.meta.require("/$bunfs/root/chunk-spj8yz9n.js").renderToolUseMessage},get[je](){return import.meta.require("/$bunfs/root/chunk-hrdb412j.js").renderToolUseMessage},get[Lt](){return import.meta.require("/$bunfs/root/chunk-9s1q9jec.js").renderToolUseMessage},get[vn](){return import.meta.require("/$bunfs/root/chunk-h120am4t.js").renderToolUseMessage},get[rt](){return import.meta.require("/$bunfs/root/chunk-9352whm6.js").renderToolUseMessage},get[Qc](){return import.meta.require("/$bunfs/root/chunk-cjbj2pxz.js").renderToolUseMessage},get[Kt](){return import.meta.require("/$bunfs/root/chunk-69p4pwtc.js").renderToolUseMessage},...r&&{[r.name]:r.ui.renderToolUseMessage},...s&&{[s.name]:s.ui.renderToolUseMessage},...n&&{[n.name]:n.ui.renderToolUseMessage},...e&&{[e.name]:e.ui.renderToolUseMessage,[e.names.ARTIFACT_COMMENTS_TOOL_NAME]:e.ui.renderCommentsToolUseMessage,[e.names.ARTIFACT_DATA_TOOL_NAME]:e.ui.renderDataToolUseMessage,[e.names.ARTIFACT_CHECK_TOOL_NAME]:e.ui.renderCheckToolUseMessage}};function NPe(o,t,l){if(o.renderToolUseMessage)return o.renderToolUseMessage(t,l);return _ze(o.name,t,l)}function _ze(o,t,l){if(Object.hasOwn(T,o))return T[o]?.(t,l);return null}
export{NPe,_ze};
