// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{Vo,Fo}from"/$bunfs/root/chunk-b9qrsx6z.js";var o=new Set([-32002,Vo.InvalidParams]);function e(n){return n instanceof Fo?n.code:void 0}function t(n){return n instanceof Fo&&n.code===Vo.MethodNotFound}function i(n){return n instanceof Fo&&(n.code===Vo.MethodNotFound||n.code===Vo.InvalidParams)}function c(n){return n instanceof Fo&&o.has(n.code)}function u(n){return n instanceof Fo&&n.code===Vo.InvalidParams}function d(n){return n instanceof Fo&&n.code===Vo.UrlElicitationRequired}export{e as getMcpErrorCode,t as isMcpMethodNotFoundError,u as isMcpNotADirectoryError,c as isMcpResourceNotFoundError,i as isMcpUnknownMethodError,d as isUrlElicitationRequiredMcpError};
