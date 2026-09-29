// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{l,v}from"/$bunfs/root/chunk-31aa9k3a.js";import{t}from"/$bunfs/root/chunk-6b6gfk00.js";var s=new Set(["EIO","ENOTTY","EBADF"]);function yS(e,n){if(!("setRawMode"in e)||typeof e.setRawMode!=="function")return;try{e.setRawMode(n)}catch(o){let a=l(o),r=v(o);if(a.includes("setRawMode failed")||s.has(r??"")){t(`setRawMode(${n}) failed on revoked tty: ${a}`);return}throw o}}
export{yS};
