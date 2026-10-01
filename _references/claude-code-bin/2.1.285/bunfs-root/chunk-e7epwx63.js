// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import"/$bunfs/root/chunk-zpng755t.js";import{Ls,Xa}from"/$bunfs/root/chunk-nftc0ddb.js";import"/$bunfs/root/chunk-0e5yc8ae.js";var n=new Set([-32002,Ls.InvalidParams]);function e(o){return o instanceof Xa?o.code:void 0}function t(o){return o instanceof Xa&&o.code===Ls.MethodNotFound}function c(o){return o instanceof Xa&&(o.code===Ls.MethodNotFound||o.code===Ls.InvalidParams)}function i(o){return o instanceof Xa&&n.has(o.code)}function u(o){return o instanceof Xa&&o.code===Ls.InvalidParams}function d(o){return o instanceof Xa&&o.code===Ls.UrlElicitationRequired}export{e as getMcpErrorCode,t as isMcpMethodNotFoundError,u as isMcpNotADirectoryError,i as isMcpResourceNotFoundError,c as isMcpUnknownMethodError,d as isUrlElicitationRequiredMcpError};
