// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{Ke}from"/$bunfs/root/chunk-pw35yar9.js";import{Bb,aa}from"/$bunfs/root/chunk-gf0h00am.js";function J1t(){let e=Ke().defaultShell;if(e==="bash"&&!aa())return"powershell";if(e==="powershell"&&!Bb())return"bash";return e??(aa()?"bash":"powershell")}
export{J1t};
