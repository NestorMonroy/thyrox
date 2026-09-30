// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{Ve}from"/$bunfs/root/chunk-m0am9fba.js";import{MI,hi}from"/$bunfs/root/chunk-xvt6q4jb.js";function dAt(){let e=Ve().defaultShell;if(e==="bash"&&!hi())return"powershell";if(e==="powershell"&&!MI())return"bash";return e??(hi()?"bash":"powershell")}
export{dAt};
