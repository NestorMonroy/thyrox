// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import"/$bunfs/root/chunk-xb8pnsys.js";import{zo,Ki}from"/$bunfs/root/chunk-qwg4jb6f.js";import"/$bunfs/root/chunk-rwywg12t.js";var n=new Set([-32002,zo.InvalidParams]);function e(o){return o instanceof Ki?o.code:void 0}function t(o){return o instanceof Ki&&o.code===zo.MethodNotFound}function i(o){return o instanceof Ki&&n.has(o.code)}function c(o){return o instanceof Ki&&o.code===zo.InvalidParams}function u(o){return o instanceof Ki&&o.code===zo.UrlElicitationRequired}export{e as getMcpErrorCode,t as isMcpMethodNotFoundError,c as isMcpNotADirectoryError,i as isMcpResourceNotFoundError,u as isUrlElicitationRequiredMcpError};
