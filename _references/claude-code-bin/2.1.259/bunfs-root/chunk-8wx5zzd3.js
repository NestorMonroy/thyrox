// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import"/$bunfs/root/chunk-kzwypryg.js";import{ei,ta}from"/$bunfs/root/chunk-4tk5ash6.js";import"/$bunfs/root/chunk-j4z53a7c.js";var n=new Set([-32002,ei.InvalidParams]);function e(o){return o instanceof ta?o.code:void 0}function t(o){return o instanceof ta&&o.code===ei.MethodNotFound}function i(o){return o instanceof ta&&n.has(o.code)}function c(o){return o instanceof ta&&o.code===ei.InvalidParams}function u(o){return o instanceof ta&&o.code===ei.UrlElicitationRequired}export{e as getMcpErrorCode,t as isMcpMethodNotFoundError,c as isMcpNotADirectoryError,i as isMcpResourceNotFoundError,u as isUrlElicitationRequiredMcpError};
