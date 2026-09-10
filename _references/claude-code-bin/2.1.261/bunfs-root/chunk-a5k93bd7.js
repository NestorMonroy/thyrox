// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{uRe}from"/$bunfs/root/chunk-annedm50.js";import{Nm}from"/$bunfs/root/chunk-dcawh0q4.js";var o=/\s/;function m(r){var t=r.length;while(t--&&o.test(r.charAt(t)));return t}var i=m;var s=/^\s+/;function p(r){return r?r.slice(0,i(r)+1).replace(s,""):r}var f=p;var n=NaN,c=/^[-+]0x[0-9a-f]+$/i,d=/^0b[01]+$/i,a=/^0o[0-7]+$/i,x=parseInt;function b(r){if(typeof r=="number")return r;if(uRe(r))return n;if(Nm(r)){var t=typeof r.valueOf=="function"?r.valueOf():r;r=Nm(t)?t+"":t}if(typeof r!="string")return r===0?r:+r;r=f(r);var e=d.test(r);return e||a.test(r)?x(r.slice(2),e?2:8):c.test(r)?n:+r}var vY=b;
export{vY};
