// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{zo,No}from"/$bunfs/root/chunk-mn5dgntx.js";var o=new Set([-32002,zo.InvalidParams]);function e(n){return n instanceof No?n.code:void 0}function t(n){return n instanceof No&&n.code===zo.MethodNotFound}function i(n){return n instanceof No&&(n.code===zo.MethodNotFound||n.code===zo.InvalidParams)}function c(n){return n instanceof No&&o.has(n.code)}function u(n){return n instanceof No&&n.code===zo.InvalidParams}function d(n){return n instanceof No&&n.code===zo.UrlElicitationRequired}export{e as getMcpErrorCode,t as isMcpMethodNotFoundError,u as isMcpNotADirectoryError,c as isMcpResourceNotFoundError,i as isMcpUnknownMethodError,d as isUrlElicitationRequiredMcpError};
