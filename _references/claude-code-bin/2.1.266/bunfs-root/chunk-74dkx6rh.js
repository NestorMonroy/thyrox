// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{Ho,yo}from"/$bunfs/root/chunk-6sbcg8t0.js";var o=new Set([-32002,Ho.InvalidParams]);function e(n){return n instanceof yo?n.code:void 0}function t(n){return n instanceof yo&&n.code===Ho.MethodNotFound}function i(n){return n instanceof yo&&o.has(n.code)}function c(n){return n instanceof yo&&n.code===Ho.InvalidParams}function u(n){return n instanceof yo&&n.code===Ho.UrlElicitationRequired}export{e as getMcpErrorCode,t as isMcpMethodNotFoundError,c as isMcpNotADirectoryError,i as isMcpResourceNotFoundError,u as isUrlElicitationRequiredMcpError};
