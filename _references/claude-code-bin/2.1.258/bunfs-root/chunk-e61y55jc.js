// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{Je}from"/$bunfs/root/chunk-0300m3ak.js";import{zC,cs}from"/$bunfs/root/chunk-bv5c0whc.js";function xit(){let e=Je().defaultShell;if(e==="bash"&&!cs())return"powershell";if(e==="powershell"&&!zC())return"bash";return e??(cs()?"bash":"powershell")}
export{xit};
