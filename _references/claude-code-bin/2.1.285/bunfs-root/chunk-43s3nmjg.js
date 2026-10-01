// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{Ye}from"/$bunfs/root/chunk-g6a51st9.js";import{KS,Aa}from"/$bunfs/root/chunk-hsxntwga.js";function zKt(){let e=Ye().defaultShell;if(e==="bash"&&!Aa())return"powershell";if(e==="powershell"&&!KS())return"bash";return e??(Aa()?"bash":"powershell")}
export{zKt};
