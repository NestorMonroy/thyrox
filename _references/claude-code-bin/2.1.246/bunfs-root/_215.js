// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Skc as e,skc as a}from"/$bunfs/root/_668.js";import{jhd as n,ohd as s}from"/$bunfs/root/_820.js";e();s();function p(){return!a()}function u(o){return o.filter((r)=>!r.mcpErrorMetadata&&!r.statusOnly&&!r.startupFatal)}function g(o){let r=[],t=[];for(let i of o)(i.statusOnly?r:t).push(i);return{statusNotices:r,invalidEntries:t}}function E(o){for(let r of o)n(`Invalid setting skipped without dialog (automated session): ${r.file??"settings"}: ${r.path}: ${r.message}`,{level:"error"})}
export{p as dx,u as ex,g as fx,E as gx};
