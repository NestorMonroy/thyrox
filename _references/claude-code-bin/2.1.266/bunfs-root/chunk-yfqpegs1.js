// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import"/$bunfs/root/chunk-cwr7j936.js";import{Xo,Qi}from"/$bunfs/root/chunk-rch40dsw.js";import"/$bunfs/root/chunk-em2h6s4a.js";var n=new Set([-32002,Xo.InvalidParams]);function e(o){return o instanceof Qi?o.code:void 0}function t(o){return o instanceof Qi&&o.code===Xo.MethodNotFound}function i(o){return o instanceof Qi&&n.has(o.code)}function c(o){return o instanceof Qi&&o.code===Xo.InvalidParams}function u(o){return o instanceof Qi&&o.code===Xo.UrlElicitationRequired}export{e as getMcpErrorCode,t as isMcpMethodNotFoundError,c as isMcpNotADirectoryError,i as isMcpResourceNotFoundError,u as isUrlElicitationRequiredMcpError};
