// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{Tr,Sr}from"/$bunfs/root/chunk-fdtkekyw.js";var o=new Set([-32002,Tr.InvalidParams]);function e(n){return n instanceof Sr?n.code:void 0}function t(n){return n instanceof Sr&&n.code===Tr.MethodNotFound}function i(n){return n instanceof Sr&&o.has(n.code)}function c(n){return n instanceof Sr&&n.code===Tr.InvalidParams}function u(n){return n instanceof Sr&&n.code===Tr.UrlElicitationRequired}export{e as getMcpErrorCode,t as isMcpMethodNotFoundError,c as isMcpNotADirectoryError,i as isMcpResourceNotFoundError,u as isUrlElicitationRequiredMcpError};
