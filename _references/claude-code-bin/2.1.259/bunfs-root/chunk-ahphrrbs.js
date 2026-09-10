// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{pt}from"/$bunfs/root/chunk-0y8vm6va.js";function lR({onClose:t,onBack:n,onKill:o}){return pt({"confirm:yes":t},{context:"Confirmation"}),function(e){if(e.key===" ")e.preventDefault(),t();else if(e.key==="left"&&n)e.preventDefault(),n();else if(e.key==="x"&&!e.ctrl&&!e.meta&&o)e.preventDefault(),o()}}
export{lR};
