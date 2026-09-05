// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{ft}from"/$bunfs/root/chunk-9y11wjvq.js";function QI({onClose:t,onBack:n,onKill:o}){return ft({"confirm:yes":t},{context:"Confirmation"}),function(e){if(e.key===" ")e.preventDefault(),t();else if(e.key==="left"&&n)e.preventDefault(),n();else if(e.key==="x"&&!e.ctrl&&!e.meta&&o)e.preventDefault(),o()}}
export{QI};
