// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{l,A}from"/$bunfs/root/chunk-06whp1c5.js";import{n}from"/$bunfs/root/chunk-mh9y4c2z.js";var s=new Set(["EIO","ENOTTY","EBADF"]);function XH(e,t){if(!("setRawMode"in e)||typeof e.setRawMode!=="function")return;try{e.setRawMode(t)}catch(o){let r=l(o),a=A(o);if(r.includes("setRawMode failed")||s.has(a??"")){n(`setRawMode(${t}) failed on revoked tty: ${r}`);return}throw o}}export{XH};
